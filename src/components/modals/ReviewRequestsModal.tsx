import { Button, Group, Loader, Modal, Stack, Text, Anchor } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import React from 'react';

// Backend stores: { id, category, file, contexts, created_at, status, etc. }
interface SoundRequest {
  id: number;
  category: string;
  file: string;
  contexts: string; // JSON string from database
  created_at: string;
  status: string;
  sound_url?: string;
  requested_by?: string;
}

interface ReviewRequestsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function ReviewRequestsModal({
  opened,
  onClose,
}: ReviewRequestsModalProps): React.JSX.Element {
  const [requests, setRequests] = useState<SoundRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/get-requests');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      notifications.show({ message: `Failed to load requests: ${error.message}`, color: 'red' });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) {
      fetchRequests();
    }
  }, [opened]);

  const closeRequest = async (requestId: number) => {
    try {
      await fetch('/close-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId }),
      });
      notifications.show({ message: 'Request closed', color: 'teal' });
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      notifications.show({ message: 'Failed to close request', color: 'red' });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Sound Requests (Admin)" size="lg">
      {loading ? (
        <Loader />
      ) : requests.length === 0 ? (
        <Text c="dimmed">No pending requests.</Text>
      ) : (
        <Stack gap="sm">
          {requests.map((req) => (
            <Group
              key={req.id}
              justify="space-between"
              p="xs"
              style={{ borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}
            >
              <Stack gap={2}>
                <Text fw={600}>{req.file}</Text>
                <Text size="sm" c="dimmed">
                  {req.category}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(req.created_at).toLocaleString()}
                </Text>
                {req.sound_url && (
                  <Text size="xs" c="blue" style={{ wordBreak: 'break-all' }}>
                    <Anchor
                      href={req.sound_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                    >
                      Source URL
                    </Anchor>
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  Status: {req.status}
                </Text>
              </Stack>
              <Button
                size="xs"
                color="green"
                onClick={() => closeRequest(req.id)}
                disabled={req.status === 'closed'}
              >
                Close
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
