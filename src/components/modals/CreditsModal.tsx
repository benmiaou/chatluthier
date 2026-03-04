import { Modal, Stack, Text, Group, Tabs, rem } from '@mantine/core';

import { useEffect, useState } from 'react';
import type React from 'react';

import { IconMusic, IconCloud, IconSpeakerphone } from '@tabler/icons-react';

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

interface SoundEntry {
  name?: string;

  display_name?: string;

  filename?: string;

  credit?: string;

  creditUrl?: string;
}

export function CreditsModal({ opened, onClose }: Readonly<CreditsModalProps>): React.JSX.Element {
  const [credits, setCredits] = useState<CreditEntry[]>([]);

  useEffect(() => {
    if (!opened) {
      return;
    }

    const fetchAll = async () => {
      try {
        const [bg, amb, sb] = await Promise.all([
          fetch('/backgroundMusic').then((r) => r.json()),

          fetch('/ambianceSounds').then((r) => r.json()),

          fetch('/soundboard').then((r) => r.json()),
        ]);

        const toEntry = (s: SoundEntry, cat: string): CreditEntry | null => {
          if (!s.credit) {
            return null;
          }

          return {
            name: s.name ?? s.display_name ?? s.filename ?? 'Unknown',

            credit: s.credit,

            creditUrl: s.creditUrl,

            category: cat,
          };
        };

        setCredits(
          [
            ...(bg as SoundEntry[]).map((s) => toEntry(s, 'Background Music')),

            ...(amb as SoundEntry[]).map((s) => toEntry(s, 'Ambiance Sounds')),

            ...(sb as SoundEntry[]).map((s) => toEntry(s, 'Soundboard')),
          ].filter(Boolean) as CreditEntry[]
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
    <Modal
      opened={opened}
      onClose={onClose}
      title="Sound Credits"
      size="xl"
      styles={{
        root: {
          '--modal-width': '70%',

          '--modal-max-width': '800px',
        },

        content: {
          width: 'var(--modal-width)',

          maxWidth: 'var(--modal-max-width)',

          height: '90vh',

          maxHeight: '90vh',

          margin: 'auto',
        },

        body: {
          padding: '0',
        },
      }}
    >
      <Tabs
        defaultValue="background"
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <Tabs.List grow>
          <Tabs.Tab value="background" leftSection={<IconMusic size={rem(16)} />}>
            Background Music
          </Tabs.Tab>

          <Tabs.Tab value="ambiance" leftSection={<IconCloud size={rem(16)} />}>
            Ambiance Sounds
          </Tabs.Tab>

          <Tabs.Tab value="soundboard" leftSection={<IconSpeakerphone size={rem(16)} />}>
            Soundboard
          </Tabs.Tab>
        </Tabs.List>

        <div style={{ flex: 1, overflow: 'auto', marginTop: '1rem', padding: '0 1rem' }}>
          <Tabs.Panel value="background">
            {byCategory['Background Music']?.length > 0 ? (
              <Stack gap="md">
                {byCategory['Background Music'].map((item) => (
                  <Stack
                    key={item.name}
                    gap="xs"
                    style={{
                      padding: '0.5rem',

                      borderRadius: 'var(--mantine-radius-sm)',

                      backgroundColor: 'var(--main-background-color)',

                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Text
                        fw={600}
                        style={{
                          minWidth: '200px',

                          color: 'var(--main-text)',
                        }}
                      >
                        {item.name}:
                      </Text>

                      <Text
                        size="sm"
                        style={{
                          flex: 1,

                          lineHeight: 1.6,

                          color: 'var(--main-text)',
                        }}
                        dangerouslySetInnerHTML={{ __html: item.credit }}
                      />
                    </Group>

                    {item.creditUrl && (
                      <Text
                        size="xs"
                        style={{
                          paddingLeft: '210px',

                          color: 'var(--main-text-placeholder)',
                        }}
                      >
                        Source:{' '}
                        <a
                          href={item.creditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--link-color)',
                          }}
                        >
                          {new URL(item.creditUrl).hostname}
                        </a>
                      </Text>
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No background music credits to display.
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="ambiance">
            {byCategory['Ambiance Sounds']?.length > 0 ? (
              <Stack gap="md">
                {byCategory['Ambiance Sounds'].map((item) => (
                  <Stack
                    key={item.name}
                    gap="xs"
                    style={{
                      padding: '0.5rem',

                      borderRadius: 'var(--mantine-radius-sm)',

                      backgroundColor: 'var(--main-background-color)',

                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Text
                        fw={600}
                        style={{
                          minWidth: '200px',

                          color: 'var(--main-text)',
                        }}
                      >
                        {item.name}:
                      </Text>

                      <Text
                        size="sm"
                        style={{
                          flex: 1,

                          lineHeight: 1.6,

                          color: 'var(--main-text)',
                        }}
                        dangerouslySetInnerHTML={{ __html: item.credit }}
                      />
                    </Group>

                    {item.creditUrl && (
                      <Text
                        size="xs"
                        style={{
                          paddingLeft: '210px',

                          color: 'var(--main-text-placeholder)',
                        }}
                      >
                        Source:{' '}
                        <a
                          href={item.creditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--link-color)',
                          }}
                        >
                          {new URL(item.creditUrl).hostname}
                        </a>
                      </Text>
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No ambiance sounds credits to display.
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="soundboard">
            {byCategory.Soundboard?.length > 0 ? (
              <Stack gap="md">
                {byCategory.Soundboard.map((item) => (
                  <Stack
                    key={item.name}
                    gap="xs"
                    style={{
                      padding: '0.5rem',

                      borderRadius: 'var(--mantine-radius-sm)',

                      backgroundColor: 'var(--main-background-color)',

                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Text
                        fw={600}
                        style={{
                          minWidth: '200px',

                          color: 'var(--main-text)',
                        }}
                      >
                        {item.name}:
                      </Text>

                      <Text
                        size="sm"
                        style={{
                          flex: 1,

                          lineHeight: 1.6,

                          color: 'var(--main-text)',
                        }}
                        dangerouslySetInnerHTML={{ __html: item.credit }}
                      />
                    </Group>

                    {item.creditUrl && (
                      <Text
                        size="xs"
                        style={{
                          paddingLeft: '210px',

                          color: 'var(--main-text-placeholder)',
                        }}
                      >
                        Source:{' '}
                        <a
                          href={item.creditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--link-color)',
                          }}
                        >
                          {new URL(item.creditUrl).hostname}
                        </a>
                      </Text>
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No soundboard credits to display.
              </Text>
            )}
          </Tabs.Panel>
        </div>
      </Tabs>
    </Modal>
  );
}
