import { Modal, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

interface CreditsModalProps {
  opened: boolean;
  onClose: () => void;
}

interface CreditEntry {
  name: string;
  credit: string;
  creditUrl?: string;
  category: string;
}

export function CreditsModal({ opened, onClose }: CreditsModalProps) {
  const [credits, setCredits] = useState<CreditEntry[]>([]);

  useEffect(() => {
    if (!opened) return;
    const fetchAll = async () => {
      try {
        const [bg, amb, sb] = await Promise.all([
          fetch('/backgroundMusic').then((r) => r.json()),
          fetch('/ambianceSounds').then((r) => r.json()),
          fetch('/soundboard').then((r) => r.json()),
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toEntry = (s: any, cat: string): CreditEntry | null => {
          if (!s.credit) return null;
          return {
            name: s.name ?? s.display_name ?? s.filename,
            credit: s.credit,
            creditUrl: s.creditUrl,
            category: cat,
          };
        };
        setCredits([
          ...(bg as any[]).map((s) => toEntry(s, 'Background Music')),
          ...(amb as any[]).map((s) => toEntry(s, 'Ambiance Sounds')),
          ...(sb as any[]).map((s) => toEntry(s, 'Soundboard')),
        ].filter(Boolean) as CreditEntry[]);
      } catch {
        /* ignore */
      }
    };
    fetchAll();
  }, [opened]);

  const byCategory = credits.reduce<Record<string, CreditEntry[]>>((acc, c) => {
    acc[c.category] = [...(acc[c.category] ?? []), c];
    return acc;
  }, {});

  return (
    <Modal opened={opened} onClose={onClose} title="Sound Credits" size="lg">
      <ScrollArea h={400}>
        <Stack gap="md">
          {Object.entries(byCategory).map(([cat, items]) => (
            <Stack key={cat} gap="xs">
              <Title order={5} tt="capitalize">
                {cat}
              </Title>
              {items.map((item) => (
                <Text key={item.name} size="sm">
                  <strong>{item.name}</strong> —{' '}
                  <span dangerouslySetInnerHTML={{ __html: item.credit }} />
                </Text>
              ))}
            </Stack>
          ))}
          {credits.length === 0 && (
            <Text c="dimmed" size="sm">
              No credits to display.
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Modal>
  );
}
