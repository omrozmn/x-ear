import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '@x-ear/ui-web';
import { useState } from 'react';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
    indeterminate: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const CheckboxWrapper = ({ label, ...props }: any) => {
  const [checked, setChecked] = useState(false);
  
  return (
    <Checkbox 
      {...props}
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
      label={label}
    />
  );
};

export const Default: Story = {
  render: () => (
    <CheckboxWrapper label="Accept terms and conditions" />
  ),
};

export const Checked: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <Checkbox 
        checked={checked} 
        onChange={(e) => setChecked(e.target.checked)}
        label="Already checked"
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Disabled checkbox',
  },
};

export const DisabledChecked: Story = {
  render: () => (
    <Checkbox checked={true} disabled={true} label="Disabled and checked" />
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <Checkbox indeterminate={true} label="Indeterminate state" />
  ),
};

export const WithoutLabel: Story = {
  render: () => (
    <CheckboxWrapper />
  ),
};

export const Group: Story = {
  render: () => {
    const [items, setItems] = useState([
      { id: 1, label: 'Option 1', checked: false },
      { id: 2, label: 'Option 2', checked: true },
      { id: 3, label: 'Option 3', checked: false },
    ]);

    const handleItemChange = (id: number, checked: boolean) => {
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, checked } : item
      ));
    };

    return (
      <div className="space-y-2">
        <h3 className="font-medium">Select options:</h3>
        {items.map(item => (
          <Checkbox
            key={item.id}
            checked={item.checked}
            onChange={(e) => handleItemChange(item.id, e.target.checked)}
            label={item.label}
          />
        ))}
      </div>
    );
  },
};