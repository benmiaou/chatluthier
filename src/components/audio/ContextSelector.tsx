import React, { useState, useEffect } from 'react';
import { MultiSelect } from '@mantine/core';

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
  const safeCategory = category || undefined;
  const [serverContexts, setServerContexts] = useState<string[]>([]);
  const [userContexts, setUserContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        const url = safeCategory ? `/contexts?category=${safeCategory}` : '/contexts';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setServerContexts(data.serverContexts || []);
          setUserContexts(data.userContexts || []);
        } else {
          setServerContexts([]);
          setUserContexts([]);
        }
      } catch (_) {
        setServerContexts([]);
        setUserContexts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, [safeCategory]);

  // All known contexts (from server + user + already selected)
  const knownContexts = [
    ...serverContexts,
    ...(showUserContexts ? userContexts : []),
    ...value.filter((v) => !serverContexts.includes(v) && !userContexts.includes(v)),
  ];

  // If the search term isn't in the list and not already selected, offer to create it
  const trimmed = search.trim();
  const canCreate =
    trimmed.length > 0 &&
    !knownContexts.some((c) => c.toLowerCase() === trimmed.toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === trimmed.toLowerCase());

  // Normalize ALL data to {value, label} so Mantine never calls .trim() on a plain object
  const data: { value: string; label: string }[] = [
    ...knownContexts.map((c) => ({ value: c, label: c })),
    ...(canCreate ? [{ value: trimmed, label: `+ Create "${trimmed}"` }] : []),
  ];

  return (
    <MultiSelect
      label="Contexts (optional) - Describe when this sound should be used"
      placeholder={placeholder}
      value={value}
      onChange={(newValue) => {
        onChange(newValue);
        setSearch('');
      }}
      data={data}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      clearable
      maxDropdownHeight={maxDropdownHeight}
      disabled={loading}
      nothingFoundMessage={trimmed ? `Type to create "${trimmed}"` : 'No contexts found'}
      hidePickedOptions
    />
  );
}
