import React, { useState, useEffect } from 'react';
import { MultiSelect, Group, Badge, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

interface ContextSelectorProps {
  readonly value: string[];
  readonly onChange: (value: string[]) => void;
  readonly placeholder?: string;
  readonly maxDropdownHeight?: number;
  readonly showUserContexts?: boolean;
  readonly category?: 'ambiance' | 'background' | 'soundboard';
}

export function ContextSelector({
  value,
  onChange,
  placeholder = 'Search or add contexts...',
  maxDropdownHeight = 200,
  showUserContexts = true,
  category,
}: ContextSelectorProps): React.JSX.Element {
  // Ensure category is defined to prevent reference errors
  const safeCategory = category || undefined;
  const [serverContexts, setServerContexts] = useState<string[]>([]);
  const [userContexts, setUserContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch server and user contexts from the server
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        let url = '/contexts';
        if (safeCategory) {
          url = `/contexts?category=${safeCategory}`;
        }
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setServerContexts(data.serverContexts || []);
          setUserContexts(data.userContexts || []);
        } else {
          // Fallback to default contexts if API fails
          setServerContexts([]);
          setUserContexts([]);
        }
      } catch (_) {
        // Fallback to default contexts if API fails
        setServerContexts([]);
        setUserContexts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, [safeCategory]);

  const handleRemoveContext = (contextToRemove: string) => {
    onChange(value.filter((context) => context !== contextToRemove));
  };

  // Separate user-added contexts (not in server or user contexts)
  const userAddedContexts = value.filter(
    (context) => !serverContexts.includes(context) && !userContexts.includes(context)
  );

  // Combine all available contexts
  const availableContexts = [
    ...serverContexts,
    ...(showUserContexts ? userContexts : []),
    ...userAddedContexts,
  ];

  // Add some default contexts if no contexts are available
  const defaultContexts = ['loading...'];

  const finalContexts = availableContexts.length > 0 ? availableContexts : defaultContexts;

  return (
    <div>
      <MultiSelect
        label="Contexts (optional) - Describe when this sound should be used"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        data={finalContexts}
        searchable
        creatable
        clearable
        maxDropdownHeight={maxDropdownHeight}
        disabled={loading}
        onCreate={(query) => {
          const item = { value: query, label: query };
          onChange([...value, query]);
          return item;
        }}
        // Ensure dropdown shows all options
        nothingFound="Press Enter to create"
        hidePickedOptions={false}
      />

      {value.length > 0 && (
        <div
          style={{
            maxHeight: 80,
            overflowY: 'auto',
            padding: '0.5rem',
            border: '1px solid var(--mantine-color-dark-4)',
            borderRadius: 'var(--mantine-radius-sm)',
            marginTop: '0.5rem',
          }}
        >
          <Group gap="xs" wrap="wrap">
            {value.map((context, index) => (
              <Badge
                key={`${context}-${index}`}
                variant="light"
                size="sm"
                rightSection={
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveContext(context);
                    }}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
              >
                {context}
              </Badge>
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}
