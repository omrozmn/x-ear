import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from '@x-ear/ui-web';

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
    trigger: <button className="px-4 py-2 bg-blue-500 text-white rounded">Open Menu</button>,
    items: sampleItems,
  },
};

export const BottomLeft: Story = {
  args: {
    trigger: <button className="px-4 py-2 bg-blue-500 text-white rounded">Bottom Left</button>,
    items: sampleItems,
    position: 'bottom-left',
  },
};

export const BottomRight: Story = {
  args: {
    trigger: <button className="px-4 py-2 bg-blue-500 text-white rounded">Bottom Right</button>,
    items: sampleItems,
    position: 'bottom-right',
  },
};

export const TopLeft: Story = {
  args: {
    trigger: <button className="px-4 py-2 bg-blue-500 text-white rounded">Top Left</button>,
    items: sampleItems,
    position: 'top-left',
  },
};

export const TopRight: Story = {
  args: {
    trigger: <button className="px-4 py-2 bg-blue-500 text-white rounded">Top Right</button>,
    items: sampleItems,
    position: 'top-right',
  },
};

export const WithDividers: Story = {
  args: {
    trigger: <button className="px-4 py-2 bg-green-500 text-white rounded">Menu with Dividers</button>,
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