import { Button, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';

// Backend stores: { category, file, contexts, timestamp }
interface SoundRequest {
  category: string;
  file: string;
  contexts?: string[];
  timestamp: string; // used as the unique ID for close-request
}

interface ReviewRequestsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function ReviewRequestsModal({ opened, onClose }: ReviewRequestsModalProps) {
  const [requests, setRequests] = useState<SoundRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await fetch('/get-requests').then((r) => r.json());
      setRequests(data ?? []);
    } catch {
      notifications.show({ message: 'Failed to load requests', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) fetchRequests();
  }, [opened]);

  const closeRequest = async (timestamp: string) => {
    try {
      await fetch('/close-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: timestamp }),
      });
      notifications.show({ message: 'Request closed', color: 'teal' });
      setRequests((prev) => prev.filter((r) => r.timestamp !== timestamp));
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
            <Group key={req.timestamp} justify="space-between" p="xs" style={{ borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
              <Stack gap={2}>
                <Text fw={600}>{req.file}</Text>
                <Text size="sm" c="dimmed">{req.category}</Text>
                <Text size="xs" c="dimmed">{new Date(req.timestamp).toLocaleString()}</Text>
              </Stack>
              <Button size="xs" color="green" onClick={() => closeRequest(req.timestamp)}>
                Close
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
