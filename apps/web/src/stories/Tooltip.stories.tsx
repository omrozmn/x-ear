import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, Button } from '@x-ear/ui-web';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <Button className="px-4 py-2 bg-blue-500 text-white rounded">Hover me</Button>,
  },
};

export const Top: Story = {
  args: {
    content: 'Tooltip positioned at top',
    position: 'top',
    children: <Button className="px-4 py-2 bg-blue-500 text-white rounded">Top tooltip</Button>,
  },
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip positioned at bottom',
    position: 'bottom',
    children: <Button className="px-4 py-2 bg-blue-500 text-white rounded">Bottom tooltip</Button>,
  },
};

export const Left: Story = {
  args: {
    content: 'Tooltip positioned at left',
    position: 'left',
    children: <Button className="px-4 py-2 bg-blue-500 text-white rounded">Left tooltip</Button>,
  },
};

export const Right: Story = {
  args: {
    content: 'Tooltip positioned at right',
    position: 'right',
    children: <Button className="px-4 py-2 bg-blue-500 text-white rounded">Right tooltip</Button>,
  },
};

export const LongContent: Story = {
  args: {
    content: 'This is a very long tooltip content that should wrap properly and display nicely even with multiple lines of text.',
    children: <Button className="px-4 py-2 bg-green-500 text-white rounded">Long tooltip</Button>,
  },
};