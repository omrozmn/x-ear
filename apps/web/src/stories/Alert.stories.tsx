import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '@x-ear/ui-web';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
    },
    title: {
      control: { type: 'text' },
    },
    onClose: {
      action: 'closed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'This is an informational alert message.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success',
    children: 'Your action was completed successfully.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'Please review this important information.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Error',
    children: 'An error occurred while processing your request.',
  },
};

export const WithoutTitle: Story = {
  args: {
    variant: 'info',
    children: 'This alert has no title, just the message content.',
  },
};

export const Dismissible: Story = {
  args: {
    variant: 'warning',
    title: 'Dismissible Alert',
    children: 'This alert can be closed by clicking the X button.',
    onClose: () => console.log('Alert closed'),
  },
};