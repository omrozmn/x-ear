import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from '@x-ear/ui-web';

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
    children: <button className="px-4 py-2 bg-blue-500 text-white rounded">Hover me</button>,
  },
};

export const Top: Story = {
  args: {
    content: 'Tooltip positioned at top',
    position: 'top',
    children: <button className="px-4 py-2 bg-blue-500 text-white rounded">Top tooltip</button>,
  },
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip positioned at bottom',
    position: 'bottom',
    children: <button className="px-4 py-2 bg-blue-500 text-white rounded">Bottom tooltip</button>,
  },
};

export const Left: Story = {
  args: {
    content: 'Tooltip positioned at left',
    position: 'left',
    children: <button className="px-4 py-2 bg-blue-500 text-white rounded">Left tooltip</button>,
  },
};

export const Right: Story = {
  args: {
    content: 'Tooltip positioned at right',
    position: 'right',
    children: <button className="px-4 py-2 bg-blue-500 text-white rounded">Right tooltip</button>,
  },
};

export const LongContent: Story = {
  args: {
    content: 'This is a very long tooltip content that should wrap properly and display nicely even with multiple lines of text.',
    children: <button className="px-4 py-2 bg-green-500 text-white rounded">Long tooltip</button>,
  },
};