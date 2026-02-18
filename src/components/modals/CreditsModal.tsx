import { Anchor, Modal, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import type { Sound } from '../../types/sound';

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
          fetch('/backgroundSounds').then((r) => r.json()),
          fetch('/ambianceSounds').then((r) => r.json()),
          fetch('/soundboard').then((r) => r.json()),
        ]);
        const all: Sound[] = [...bg, ...amb, ...sb];
        setCredits(
          all
            .filter((s) => s.credit)
            .map((s) => ({
              name: s.name,
              credit: s.credit!,
              creditUrl: s.creditUrl,
              category: s.category,
            })),
        );
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
                  {item.creditUrl ? (
                    <Anchor href={item.creditUrl} target="_blank" rel="noopener noreferrer">
                      {item.credit}
                    </Anchor>
                  ) : (
                    item.credit
                  )}
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
