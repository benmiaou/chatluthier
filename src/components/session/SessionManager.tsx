import {
  Badge,
  Button,
  CopyButton,
  Group,
  Stack,
  Text,
  TextInput,
  Loader,
  Avatar,
  Tooltip,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import type React from 'react';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { IconCopy, IconCheck, IconPlugConnectedX, IconUsers, IconCrown } from '@tabler/icons-react';

export function SessionManager(): React.JSX.Element {
  const {
    connected,
    sessionId,
    subscribe,
    disconnect,
    statusMessage,
    participants,
    send,
    addMessageHandler,
  } = useSocketContext();
  const [joinInput, setJoinInput] = useState('');
  const [isLeader, setIsLeader] = useState(false);

  const handleJoin = () => {
    const id = joinInput.trim();
    if (id) {
      subscribe(id);
      setJoinInput('');
    } else {
      setJoinInput('');
    }
  };

  const generateId = () => {
    const id = Math.random().toString(36).substring(2, 10).toUpperCase();
    subscribe(id);
  };

  const inviteLink = sessionId ? `${globalThis.location.origin}?sessionId=${sessionId}` : '';

  // Check leader status when session changes
  useEffect(() => {
    if (sessionId) {
      // Request leader status from server
      send({ type: 'getLeaderStatus', id: sessionId });
    } else {
      // Reset leader status when session ends
      setTimeout(() => setIsLeader(false), 0);
    }
  }, [sessionId, send]);

  // Handle leader status messages
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const handleMessage = (msg: WsMessage) => {
      if (msg.type === 'leaderStatus' && msg.content) {
        setIsLeader(Boolean(msg.content.isLeader));
      } else if (msg.type === 'leaderChange') {
        // Check if we're the new leader
        send({ type: 'getLeaderStatus', id: sessionId });
      }
    };

    const removeHandler = addMessageHandler(handleMessage);

    return () => {
      removeHandler();
    };
  }, [sessionId, send, addMessageHandler]);

  return (
    <>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Text fw={600} size="sm" tt="uppercase" c="dimmed">
              Session
            </Text>
            {connected && !sessionId && <Loader size="xs" color="gray" />}
          </Group>
          <Group gap="xs" align="center">
            <Badge
              color={sessionId ? (isLeader ? 'darkgreen' : 'green') : 'gray'}
              size="xs"
              leftSection={isLeader ? <IconCrown size={10} /> : null}
            >
              {sessionId ? (isLeader ? 'Connected (Leader)' : 'Connected') : 'Disconnected'}
            </Badge>
          </Group>
        </Group>

        {statusMessage && (
          <Text
            size="xs"
            c={
              /* Extract nested ternary to improve readability */
              (() => {
                if (statusMessage.toLowerCase().includes('error')) {
                  return 'red';
                }
                return sessionId ? 'teal' : 'orange';
              })()
            }
          >
            {statusMessage}
          </Text>
        )}

        {sessionId && participants.length > 0 && (
          <Group gap="xs" mt="sm">
            <IconUsers size={14} color="gray" />
            <Text size="xs" c="dimmed">
              {participants.length} participant{participants.length === 1 ? '' : 's'}:
            </Text>
            <Group gap="xs">
              {participants.map((participant) => (
                <Tooltip
                  key={participant.id}
                  label={participant.isAnonymous ? 'Anonymous' : participant.pseudo || 'Unknown'}
                  position="top"
                >
                  <Avatar size="xs" radius="xl" color={participant.isAnonymous ? 'gray' : 'blue'}>
                    {participant.isAnonymous
                      ? '?'
                      : participant.pseudo?.charAt(0).toUpperCase() || '?'}
                  </Avatar>
                </Tooltip>
              ))}
            </Group>
          </Group>
        )}

        {sessionId ? (
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Text size="xs">Session:</Text>
              <Text size="xs" fw={700} ff="monospace">
                {sessionId}
              </Text>
              <CopyButton value={inviteLink} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    color={copied ? 'teal' : 'gray'}
                    onClick={copy}
                  >
                    {copied ? 'Copied!' : 'Copy Invite'}
                  </Button>
                )}
              </CopyButton>
            </Group>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconPlugConnectedX size={14} />}
              onClick={disconnect}
            >
              Leave Session
            </Button>
          </Stack>
        ) : (
          <Group gap="xs">
            <Button size="xs" variant="default" onClick={generateId} style={{ flex: 1 }}>
              Create New Session
            </Button>
            <TextInput
              size="xs"
              placeholder="Session ID"
              value={joinInput}
              onChange={(e) => setJoinInput(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              style={{ flex: 2 }}
            />
            <Button size="xs" onClick={handleJoin}>
              Join
            </Button>
          </Group>
        )}
      </Stack>
    </>
  );
}
