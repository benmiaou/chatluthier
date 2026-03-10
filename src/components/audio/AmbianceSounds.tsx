import { Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAmbianceSounds } from '../../hooks/useAmbianceSounds';
import { useSocketContext, type WsMessage } from '../../contexts/SocketContext';
import { showCreditToast } from '../../utils/showCreditToast';
import { CustomCombobox } from './CustomCombobox';
import { DraggableSoundBar } from './DraggableSoundBar';
import { handleError } from '../../utils/logger';

interface AmbianceSoundsProps {
  userId?: string | null;
}

export function AmbianceSounds({
  userId = null,
}: Readonly<AmbianceSoundsProps>): React.JSX.Element {
  const { send, addMessageHandler, sessionId } = useSocketContext();
  const {
    bars,
    allBars,
    context,
    setContext,
    setBarVolume,
    reset,
    getStatus,
    applyStatus,
    presets,
    savePreset,
    applyPreset,
    loadPresets,
  } = useAmbianceSounds(userId);
  const [presetName, setPresetName] = useState('');

  const contexts = [
    'All',
    ...Array.from(new Set(allBars.flatMap((b) => b.sound.contexts ?? []))),
  ].filter(Boolean);

  // Initialize soundOrder with the current order of bars
  const [soundOrder, setSoundOrder] = useState<string[]>(() => {
    return bars.map((bar) => bar.sound.filename);
  });

  // Add moveItem function for react-dnd
  const moveItem = (fromIndex: number, toIndex: number) => {
    setSoundOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      return newOrder;
    });
  };

  // Apply sound order to bars when soundOrder or bars change
  const orderedBars = useMemo(() => {
    if (soundOrder.length === 0 || bars.length === 0) {
      return bars;
    }

    // Create a map for quick lookup
    const orderMap = new Map(soundOrder.map((filename, index) => [filename, index]));

    // Sort bars based on the soundOrder
    return [...bars].sort((a, b) => {
      const aIndex = orderMap.get(a.sound.filename) ?? Infinity;
      const bIndex = orderMap.get(b.sound.filename) ?? Infinity;
      return aIndex - bIndex;
    });
  }, [bars, soundOrder]);

  // Load presets and sound order when user logs in
  const loadSoundOrder = useCallback(async () => {
    try {
      const response = await fetch(`/get-sound-order?userId=${userId}&soundType=ambianceSounds`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await response.json();
      const loadedOrder = data.order || [];

      // Filter the loaded order to only include filenames that exist in current bars
      const validOrder = loadedOrder.filter((filename: string) =>
        bars.some((bar) => bar.sound.filename === filename)
      );

      // If we have a valid loaded order, use it. Otherwise use the current bars order.
      setSoundOrder(validOrder.length > 0 ? validOrder : bars.map((bar) => bar.sound.filename));
    } catch (_error) {
      handleError(_error, 'AmbianceSounds.loadSoundOrder');
      // Fallback to current bars order if loading fails
      setSoundOrder(bars.map((bar) => bar.sound.filename));
    }
  }, [userId, bars]);

  useEffect(() => {
    if (userId) {
      loadPresets();
      loadSoundOrder();
    }
  }, [userId, loadPresets, loadSoundOrder]);

  const saveSoundOrder = async (newOrder: string[]) => {
    if (!userId) {
      setSoundOrder(newOrder);
      return;
    }

    try {
      const response = await fetch('/save-sound-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          soundType: 'ambianceSounds',
          order: newOrder,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status ${response.status}: ${errorText}`);
      }
    } catch (_error) {
      handleError(_error, 'AmbianceSounds.saveSoundOrder');
    } finally {
      // Always update local state regardless of server save success
      setSoundOrder(newOrder);
    }
  };

  const handleDragEnd = (fromIndex: number, toIndex: number) => {
    if (!userId || userId === 'null' || userId === 'undefined') {
      return;
    }

    // Ensure the soundOrder state is updated with the final position
    // This handles cases where the hover updates might not have been applied
    setSoundOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);

      // Save the final order to the server immediately after state update
      saveSoundOrder(newOrder);

      return newOrder;
    });

    // The visual order will update automatically via the orderedBars memo
  };

  const handleChange = (filename: string, volume: number) => {
    setBarVolume(filename, volume);
    if (sessionId) {
      // Send the updated status immediately with the new volume
      // to avoid the one-step delay issue
      const currentStatus = getStatus();
      currentStatus[filename] = volume;
      send({
        type: 'ambianceStatusUpdate',
        id: sessionId,
        content: { ambianceStatus: currentStatus },
      });
    }
  };

  const handleReset = () => {
    reset();
    if (sessionId) {
      send({ type: 'ambianceStatusUpdate', id: sessionId, content: { ambianceStatus: {} } });
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      return;
    }
    savePreset(presetName.trim());
    setPresetName('');
  };

  const handleApplyPreset = (name: string | null) => {
    if (name) {
      applyPreset(name);
    }
  };

  const showCreditsForActiveSounds = useCallback(
    (statusData: Record<string, number>) => {
      Object.entries(statusData).forEach(([filename, volume]) => {
        if (volume > 0) {
          const sound = bars.find((s) => s.sound.filename === filename);
          if (sound?.sound?.credit) {
            showCreditToast(sound.sound.name, sound.sound.credit);
          }
        }
      });
    },
    [bars]
  );

  const handleAmbianceStatusUpdate = useCallback(
    (ambianceStatus: Record<string, number>) => {
      applyStatus(ambianceStatus);
      showCreditsForActiveSounds(ambianceStatus);
    },
    [applyStatus, showCreditsForActiveSounds]
  );

  const handleStatusRequest = useCallback(
    (statusType: string) => {
      if (statusType === 'ambiance') {
        send({
          type: 'statusResponse',
          id: sessionId,
          content: {
            statusType: 'ambiance',
            statusData: getStatus(),
          },
        });
      }
    },
    [send, sessionId, getStatus]
  );

  const handleStatusResponse = useCallback(
    (statusType: string, statusData: Record<string, number>) => {
      if (statusType === 'ambiance' && statusData) {
        applyStatus(statusData);
        showCreditsForActiveSounds(statusData);
      }
    },
    [applyStatus, showCreditsForActiveSounds]
  );

  const handleAmbianceMessage = useCallback(
    (msg: WsMessage) => {
      if (!msg.content) {
        return;
      }

      const messageHandlers: Record<string, (content: unknown) => void> = {
        ambianceStatusUpdate: (content) => {
          const { ambianceStatus } = content as { ambianceStatus: Record<string, number> };
          handleAmbianceStatusUpdate(ambianceStatus);
        },
        statusRequest: (content) => {
          const { statusType } = content as { statusType: string };
          handleStatusRequest(statusType);
        },
        statusResponse: (content) => {
          const { statusType, statusData } = content as {
            statusType: string;
            statusData: Record<string, number>;
          };
          handleStatusResponse(statusType, statusData);
        },
      };

      const handler = messageHandlers[msg.type as keyof typeof messageHandlers];
      if (handler) {
        handler(msg.content);
      }
    },
    [handleAmbianceStatusUpdate, handleStatusRequest, handleStatusResponse]
  );

  // Listen for incoming ambiance updates from session peers
  useEffect(() => {
    return addMessageHandler(handleAmbianceMessage);
  }, [addMessageHandler, handleAmbianceMessage]);

  const presetNames = Object.keys(presets);

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm" style={{ margin: 0, padding: 0 }}>
        <Text fw={600} size="sm" tt="uppercase" c="dimmed" ta="center">
          Ambiance Sounds
        </Text>
        <Group justify="space-between">
          <Group gap="xs">
            {contexts.length > 1 && (
              <CustomCombobox
                value={context}
                onChange={(v) => setContext(v ?? 'All')}
                data={contexts}
                placeholder="Context"
              />
            )}
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconRefresh size={14} />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Group>
          {userId && (
            <Group gap="xs">
              <TextInput
                size="xs"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.currentTarget.value)}
                style={{ width: 150 }}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              />
              <Button
                size="xs"
                variant="default"
                leftSection={<IconDeviceFloppy size={14} />}
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
              >
                Save
              </Button>
              {presetNames.length > 0 && (
                <CustomCombobox
                  value=""
                  onChange={handleApplyPreset}
                  data={presetNames}
                  placeholder="Load preset…"
                />
              )}
            </Group>
          )}
        </Group>

        {bars.length === 0 && (
          <Text size="xs" c="dimmed">
            Loading ambiance sounds…
          </Text>
        )}

        <DndProvider backend={HTML5Backend}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 175px)',
              gridTemplateRows: 'repeat(auto-fill, 95px)',
              minHeight: '100px',
              position: 'relative',
              width: '100%',
              overflow: 'visible',
              alignContent: 'start',
              columnGap: '10px', // Reduced horizontal spacing between images
              rowGap: '10px', // Consistent vertical spacing between rows
              marginTop: '0',
              paddingTop: '0',
            }}
          >
            {orderedBars.map((bar, index) => (
              <DraggableSoundBar
                key={`${bar.sound.filename}-${index}`}
                bar={bar}
                index={index}
                onChange={handleChange}
                moveItem={moveItem}
                onDragEnd={handleDragEnd}
                showDragHandle={Boolean(userId)}
              />
            ))}
          </div>
        </DndProvider>
      </Stack>
    </Paper>
  );
}
