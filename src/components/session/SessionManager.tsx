import {
  Badge,
  Button,
  CopyButton,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Loader,
  Avatar,
  Tooltip,
} from '@mantine/core';
import { useState } from 'react';
import type React from 'react';
import { useSocketContext } from '../../contexts/SocketContext';
import { IconCopy, IconCheck, IconPlugConnectedX, IconUsers } from '@tabler/icons-react';

export function SessionManager(): React.JSX.Element {
  const { connected, sessionId, subscribe, disconnect, statusMessage, participants } =
    useSocketContext();
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

  const inviteLink = sessionId ? `${globalThis.location.origin}?sessionId=${sessionId}` : '';

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Text fw={600} size="sm" tt="uppercase" c="dimmed">
              Session
            </Text>
            {connected && !sessionId && <Loader size="xs" color="gray" />}
          </Group>
          <Group gap="xs" align="center">
            <Badge color={sessionId ? 'green' : 'gray'} size="xs">
              {sessionId ? 'Connected' : 'Disconnected'}
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
    </Paper>
  );
}
