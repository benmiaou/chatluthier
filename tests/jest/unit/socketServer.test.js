/**
 * Integration tests for srv/sockets/socketServer.js
 *
 * Spins up a real WebSocket server on a random OS-assigned port.
 * Each test connects real ws clients and asserts message passing behaviour.
 * No mocks — this exercises the full socketServer code path.
 */

const http = require('node:http');
const WebSocket = require('ws');
const { initializeWebSocketServer } = require('../../../srv/sockets/socketServer');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Start a WS server on a random port; returns { server, wsServer, port } */
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      // Use a second random port for the WS server
      const wsPort = port + 100;
      const wsServer = initializeWebSocketServer(server, port, wsPort);
      resolve({ server, wsServer, port: wsPort });
    });
  });
}

/** Open a WS client and wait for it to be OPEN */
function openClient(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const messages = [];
    ws.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
    ws.on('open', () => resolve({ ws, messages }));
    ws.on('error', reject);
  });
}

/** Send a message and wait for the next inbound message on a given client */
function sendAndWait(senderWs, payload, receiverMessages, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const before = receiverMessages.length;
    senderWs.send(JSON.stringify(payload));
    const deadline = Date.now() + timeout;
    const poll = setInterval(() => {
      if (receiverMessages.length > before) {
        clearInterval(poll);
        resolve(receiverMessages[receiverMessages.length - 1]);
      } else if (Date.now() > deadline) {
        clearInterval(poll);
        reject(new Error('Timed out waiting for message'));
      }
    }, 10);
  });
}

/** Wait until a condition is true (polling), reject after timeout */
function waitFor(condition, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const poll = setInterval(() => {
      if (condition()) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() > deadline) {
        clearInterval(poll);
        reject(new Error('Condition timed out'));
      }
    }, 10);
  });
}

/** Subscribe a client to a session and wait for the 'subscribed' ack */
async function subscribe(ws, messages, sessionId, pseudo = 'TestUser', participantId = null) {
  const payload = { type: 'subscribe', id: sessionId, pseudo };
  if (participantId) payload.participantId = participantId;
  const ack = await sendAndWait(ws, payload, messages);
  return ack;
}

/** Set a client as the leader for a session */
async function setLeader(ws, messages, sessionId, participantId) {
  const ack = await sendAndWait(ws, { type: 'setLeader', id: sessionId, participantId }, messages);
  return ack;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('socketServer', () => {
  jest.setTimeout(10000);
  let server, wsServer, port;
  /** Track all opened clients so afterEach can force-close stragglers */
  const openClients = [];

  function trackedOpenClient(p) {
    return openClient(p).then((client) => {
      openClients.push(client.ws);
      return client;
    });
  }

  beforeAll(async () => {
    // Silence the server's verbose console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    ({ server, wsServer, port } = await startServer());
  });

  beforeEach(() => {
    // Clear module-level server state (subscribers, rate-limit buckets, etc.) between tests
    // so accumulated null-key rate-limit timestamps from previous subscribes don't bleed through
    const { _resetStateForTests } = require('../../../srv/sockets/socketServer');
    _resetStateForTests();
  });

  afterEach(() => {
    // Force-close any clients left open by the test (prevents server from hanging)
    for (const ws of openClients.splice(0)) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      }
    }
  });

  afterAll((done) => {
    // Restore mocks first so teardown logs don't trigger "Cannot log after tests" errors
    jest.restoreAllMocks();
    wsServer.close(() => server.close(done));
  });

  // ─── Subscribe ─────────────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('receives a subscribed ack with a participantId and participants list', async () => {
      const { ws, messages } = await trackedOpenClient(port);
      const ack = await subscribe(ws, messages, 'session-sub-1', 'Alice');

      expect(ack.type).toBe('subscribed');
      expect(ack.id).toBe('session-sub-1');
      expect(typeof ack.participantId).toBe('string');
      expect(Array.isArray(ack.participants)).toBe(true);
      expect(ack.participants[0].pseudo).toBe('Alice');

      ws.close();
    });

    it('notifies existing participants when a new client joins', async () => {
      const a = await trackedOpenClient(port);
      await subscribe(a.ws, a.messages, 'session-sub-2', 'Alice');

      const b = await trackedOpenClient(port);
      const joinNotice = await sendAndWait(
        b.ws,
        { type: 'subscribe', id: 'session-sub-2', pseudo: 'Bob' },
        a.messages
      );

      expect(joinNotice.type).toBe('participantJoined');
      expect(joinNotice.participant.pseudo).toBe('Bob');

      a.ws.close();
      b.ws.close();
    });
  });

  // ─── Broadcast ─────────────────────────────────────────────────────────────

  describe('broadcast (backgroundMusicChange)', () => {
    it('delivers the message to other session members', async () => {
      const a = await trackedOpenClient(port);
      const b = await trackedOpenClient(port);
      const aSub = await subscribe(a.ws, a.messages, 'session-bmc-1', 'Alice');
      await subscribe(b.ws, b.messages, 'session-bmc-1', 'Bob');

      // Set Alice as leader so she can broadcast background music
      await setLeader(a.ws, a.messages, 'session-bmc-1', aSub.participantId);

      const received = await sendAndWait(
        a.ws,
        {
          type: 'backgroundMusicChange',
          id: 'session-bmc-1',
          content: { filename: 'forest.mp3', credit: 'test credit' },
        },
        b.messages
      );

      expect(received.type).toBe('backgroundMusicChange');
      expect(received.content.filename).toBe('forest.mp3');
      expect(received.content.credit).toBe('test credit');

      a.ws.close();
      b.ws.close();
    });

    it('does NOT echo the message back to the sender', async () => {
      const a = await trackedOpenClient(port);
      const b = await trackedOpenClient(port);
      const before = a.messages.length;

      const aSub = await subscribe(a.ws, a.messages, 'session-bmc-2', 'Alice');
      await subscribe(b.ws, b.messages, 'session-bmc-2', 'Bob');

      // Set Alice as leader
      await setLeader(a.ws, a.messages, 'session-bmc-2', aSub.participantId);

      // Drain the participantJoined notice on a
      await waitFor(() => a.messages.length > before);
      const countAfterJoin = a.messages.length;

      a.ws.send(
        JSON.stringify({
          type: 'backgroundMusicChange',
          id: 'session-bmc-2',
          content: { filename: 'battle.mp3' },
        })
      );

      // Wait a bit and ensure sender got nothing extra
      await new Promise((r) => setTimeout(r, 1000));
      expect(a.messages.length).toBe(countAfterJoin);

      a.ws.close();
      b.ws.close();
    });
  });

  // ─── Session isolation ─────────────────────────────────────────────────────

  describe('session isolation', () => {
    it('does not deliver messages across different sessions', async () => {
      const a = await trackedOpenClient(port);
      const b = await trackedOpenClient(port);
      await subscribe(a.ws, a.messages, 'session-iso-A', 'Alice');
      await subscribe(b.ws, b.messages, 'session-iso-B', 'Bob');

      const beforeB = b.messages.length;

      a.ws.send(
        JSON.stringify({
          type: 'backgroundMusicChange',
          id: 'session-iso-A',
          content: { filename: 'tavern.mp3' },
        })
      );

      await new Promise((r) => setTimeout(r, 150));
      expect(b.messages.length).toBe(beforeB);

      a.ws.close();
      b.ws.close();
    });
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────

  describe('disconnect', () => {
    it('notifies remaining participants when a client closes the connection', async () => {
      const a = await trackedOpenClient(port);
      const b = await trackedOpenClient(port);

      const ackA = await subscribe(a.ws, a.messages, 'session-disc-1', 'Alice');
      // Subscribe B and wait for A to receive the participantJoined notification
      const joinNotice = await sendAndWait(
        b.ws,
        { type: 'subscribe', id: 'session-disc-1', pseudo: 'Bob' },
        a.messages
      );
      expect(joinNotice.type).toBe('participantJoined');

      const participantIdA = ackA.participantId;
      const beforeA = a.messages.length;

      b.ws.close();

      await waitFor(() => a.messages.length > beforeA);
      const notice = a.messages[a.messages.length - 1];

      expect(notice.type).toBe('participantLeft');
      // The leaving participant should not be Alice
      expect(notice.participantId).not.toBe(participantIdA);
    });
  });

  // ─── Unsubscribe ───────────────────────────────────────────────────────────

  describe('unsubscribe', () => {
    it('sends participantLeft to remaining members on explicit unsubscribe', async () => {
      const a = await trackedOpenClient(port);
      const b = await trackedOpenClient(port);

      await subscribe(a.ws, a.messages, 'session-unsub-1', 'Alice');
      // Subscribe B and wait for A to confirm it received participantJoined
      const joinNotice = await sendAndWait(
        b.ws,
        { type: 'subscribe', id: 'session-unsub-1', pseudo: 'Bob' },
        a.messages
      );
      expect(joinNotice.type).toBe('participantJoined');

      // Get B's participantId from its own subscribed ack
      const ackB = b.messages.find((m) => m.type === 'subscribed');
      const participantIdB = ackB.participantId;
      const beforeA = a.messages.length;

      b.ws.send(
        JSON.stringify({
          type: 'unsubscribe',
          id: 'session-unsub-1',
          participantId: participantIdB,
        })
      );

      await waitFor(() => a.messages.length > beforeA);
      const notice = a.messages[a.messages.length - 1];

      expect(notice.type).toBe('participantLeft');
    });
  });

  // ─── Rate limiting ─────────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('returns an error when a client exceeds 10 messages per second', async () => {
      const { ws, messages } = await trackedOpenClient(port);
      const sub = await subscribe(ws, messages, 'session-rate-1', 'Spammer');

      // Set as leader to allow broadcasting
      await setLeader(ws, messages, 'session-rate-1', sub.participantId);

      // Send 12 rapid-fire messages
      for (let i = 0; i < 12; i++) {
        ws.send(
          JSON.stringify({
            type: 'backgroundMusicChange',
            id: 'session-rate-1',
            content: { filename: `sound${i}.mp3` },
          })
        );
      }

      await waitFor(() => messages.some((m) => m.type === 'error'), 3000);
      const err = messages.find((m) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.message).toMatch(/rate limit/i);

      ws.close();
    });
  });

  // ─── Other message types ───────────────────────────────────────────────────

  describe('other broadcast message types', () => {
    it.each([
      'ambianceStatusUpdate',
      'backgroundMusicVolumeChange',
      'backgroundMusicStop',
      'playSoundboardSound',
      'message',
    ])('broadcasts %s to peers', async (msgType) => {
      const a = await trackedOpenClient(port);
      const b = await trackedOpenClient(port);
      const aSub = await subscribe(a.ws, a.messages, `session-type-${msgType}`, 'Alice');
      await subscribe(b.ws, b.messages, `session-type-${msgType}`, 'Bob');

      // For background music types, need to be leader
      if (['backgroundMusicVolumeChange', 'backgroundMusicStop'].includes(msgType)) {
        await setLeader(a.ws, a.messages, `session-type-${msgType}`, aSub.participantId);
      }

      const received = await sendAndWait(
        a.ws,
        { type: msgType, id: `session-type-${msgType}`, content: { data: 'test' } },
        b.messages
      );

      expect(received.type).toBe(msgType);
      expect(received.content.data).toBe('test');

      a.ws.close();
      b.ws.close();
    });
  });
});
