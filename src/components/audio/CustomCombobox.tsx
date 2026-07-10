import React, { useState } from 'react';
import { Combobox, useCombobox, Button, TextInput } from '@mantine/core';

interface CustomComboboxProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly data: string[];
  readonly placeholder?: string;
  readonly size?: string;
}

export function CustomCombobox({
  value,
  onChange,
  data,
  placeholder = 'Select',
  size = 'xs',
}: CustomComboboxProps): React.JSX.Element {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [searchValue, setSearchValue] = useState('');

  const filteredOptions = data.filter((item) =>
    item.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <>
      <Combobox
        store={combobox}
        onOptionSubmit={(val) => {
          onChange(val);
          combobox.closeDropdown();
          setSearchValue('');
        }}
      >
        <Combobox.Target>
          <Button
            size={size}
            color="maroon.6"
            pe={0}
            rightSection={<Combobox.Chevron c="white" />}
            onClick={() => combobox.toggleDropdown()}
          >
            {value || placeholder}
          </Button>
        </Combobox.Target>

        <Combobox.Dropdown
          style={{
            backgroundColor: 'var(--main-background-color)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            overflow: 'hidden',
            maxHeight: '300px',
            overflowY: 'auto',
            minWidth: '160px',
            width: 'max-content',
          }}
        >
          {data.length > 5 && (
            <div
              style={{
                padding: '8px',
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--main-background-color)',
                zIndex: 1,
                width: '100%',
              }}
            >
              <TextInput
                placeholder="Search contexts..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.currentTarget.value)}
                size="xs"
                style={{ marginBottom: '8px', width: '100%' }}
              />
            </div>
          )}
          <Combobox.Options>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((item) => (
                <Combobox.Option
                  value={item}
                  key={item}
                  style={{
                    backgroundColor: 'var(--main-background-color)',
                    color: 'var(--main-text)',
                    padding: '8px 12px',
                    fontSize: '14px',
                  }}
                >
                  {item}
                </Combobox.Option>
              ))
            ) : (
              <Combobox.Empty>Nothing found...</Combobox.Empty>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </>
  );
}
