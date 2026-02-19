import { Combobox, Input, InputBase, useCombobox, Button } from '@mantine/core';

interface CustomComboboxProps {
  value: string;
  onChange: (value: string) => void;
  data: string[];
  placeholder?: string;
  width?: number | string;
}

export function CustomCombobox({ value, onChange, data, placeholder = 'Select', width = 'auto' }: CustomComboboxProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <Button
          size="xs"
          variant="default"
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
          style={{
            width,
            justifyContent: 'space-between',
            minWidth: '100px'
          }}
        >
          {value || placeholder}
        </Button>
      </Combobox.Target>

      <Combobox.Dropdown style={{
        backgroundColor: 'var(--main-background-color)',
        border: '1px solid var(--main-border)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <Combobox.Options>
          {data.map((item) => (
            <Combobox.Option
              value={item}
              key={item}
              style={{
                backgroundColor: 'var(--main-background-color)',
                color: 'var(--main-text)',
                padding: '8px 12px',
                fontSize: '14px'
              }}
            >
              {item}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
