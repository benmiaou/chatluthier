import React, { useState, useEffect } from 'react';
import { MultiSelect, Group, Badge, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

interface ContextSelectorProps {
  readonly value: string[];
  readonly onChange: (value: string[]) => void;
  readonly placeholder?: string;
  readonly maxDropdownHeight?: number;
}

export function ContextSelector({
  value,
  onChange,
  placeholder = 'Search or add contexts...',
  maxDropdownHeight = 200,
}: ContextSelectorProps): React.JSX.Element {
  const [allContexts, setAllContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all unique contexts from the server
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/contexts');
        if (response.ok) {
          const data = await response.json();
          setAllContexts(data);
        }
      } catch (fetchError) {
        console.error('Error fetching contexts:', fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, []);

  const handleRemoveContext = (contextToRemove: string) => {
    onChange(value.filter((context) => context !== contextToRemove));
  };

  // Combine server contexts with user-added contexts
  const availableContexts = Array.from(
    new Set([...allContexts, ...value.filter((context) => !allContexts.includes(context))])
  );

  return (
    <div>
      <MultiSelect
        label="Contexts (optional) - Describe when this sound should be used"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        data={availableContexts}
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
