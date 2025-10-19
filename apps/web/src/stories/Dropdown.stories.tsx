import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown, Button } from '@x-ear/ui-web';

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: { type: 'select' },
      options: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  { label: 'Profile', onClick: () => console.log('Profile clicked') },
  { label: 'Settings', onClick: () => console.log('Settings clicked') },
  { label: 'Help', onClick: () => console.log('Help clicked') },
  { label: 'Sign out', onClick: () => console.log('Sign out clicked') },
];

export const Default: Story = {
  args: {
    trigger: <Button variant="primary">Open Menu</Button>,
    items: sampleItems,
  },
};

export const BottomLeft: Story = {
  args: {
    trigger: <Button variant="primary">Bottom Left</Button>,
    items: sampleItems,
    position: 'bottom-left',
  },
};

export const BottomRight: Story = {
  args: {
    trigger: <Button variant="primary">Bottom Right</Button>,
    items: sampleItems,
    position: 'bottom-right',
  },
};

export const TopLeft: Story = {
  args: {
    trigger: <Button variant="primary">Top Left</Button>,
    items: sampleItems,
    position: 'top-left',
  },
};

export const TopRight: Story = {
  args: {
    trigger: <Button variant="primary">Top Right</Button>,
    items: sampleItems,
    position: 'top-right',
  },
};

export const WithDividers: Story = {
  args: {
    trigger: <Button variant="secondary">Menu with Dividers</Button>,
    items: [
      { label: 'Profile', onClick: () => console.log('Profile clicked') },
      { label: 'Settings', onClick: () => console.log('Settings clicked') },
      { label: 'divider' },
      { label: 'Help', onClick: () => console.log('Help clicked') },
      { label: 'divider' },
      { label: 'Sign out', onClick: () => console.log('Sign out clicked') },
    ],
  },
};