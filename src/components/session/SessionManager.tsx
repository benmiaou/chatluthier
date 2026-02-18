import { Badge, Button, CopyButton, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useSocketContext } from '../../contexts/SocketContext';
import { IconCopy, IconCheck, IconPlugConnectedX } from '@tabler/icons-react';

export function SessionManager() {
  const { connected, sessionId, subscribe, disconnect, statusMessage } = useSocketContext();
  const [joinInput, setJoinInput] = useState('');

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

  const inviteLink = sessionId
    ? `${window.location.origin}?sessionId=${sessionId}`
    : '';

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm" tt="uppercase" c="dimmed">
            Session
          </Text>
          <Badge color={connected ? 'green' : 'gray'} size="xs">
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </Group>

        {statusMessage && (
          <Text size="xs" c={statusMessage.toLowerCase().includes('error') ? 'red' : 'teal'}>
            {statusMessage}
          </Text>
        )}

        {!sessionId ? (
          <Stack gap="xs">
            <Button size="xs" variant="default" onClick={generateId}>
              Create New Session
            </Button>
            <Group gap="xs">
              <TextInput
                size="xs"
                placeholder="Session ID"
                value={joinInput}
                onChange={(e) => setJoinInput(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                style={{ flex: 1 }}
              />
              <Button size="xs" onClick={handleJoin}>
                Join
              </Button>
            </Group>
          </Stack>
        ) : (
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
        )}
      </Stack>
    </Paper>
  );
}
