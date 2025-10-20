import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@x-ear/ui-web';
import React from 'react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'outlined', 'elevated', 'filled'],
    },
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    padding: 'md',
    children: 'This is a basic card with default styling.',
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    padding: 'md',
    children: 'This is an outlined card variant.',
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    padding: 'lg',
    children: 'This is an elevated card with shadow.',
  },
};

export const Filled: Story = {
  args: {
    variant: 'filled',
    padding: 'md',
    children: 'This is a filled card with background color.',
  },
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card variant="default" padding="none">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This card demonstrates the use of header, content, and footer sections.</p>
      </CardContent>
      <CardFooter>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Action</button>
      </CardFooter>
    </Card>
  ),
};

export const NoPadding: Story = {
  args: {
    variant: 'default',
    padding: 'none',
    children: 'This card has no internal padding.',
  },
};