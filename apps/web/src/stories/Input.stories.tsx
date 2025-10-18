import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@x-ear/ui-web';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    required: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-64">
      <label className="block text-sm font-medium mb-1">Full Name</label>
      <Input placeholder="John Doe" />
    </div>
  ),
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'john@example.com',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '123',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
    value: 'Cannot edit this',
  },
};

export const WithError: Story = {
  render: () => (
    <div className="w-64">
      <label className="block text-sm font-medium mb-1">Email Address</label>
      <Input 
        type="email" 
        placeholder="john@example.com" 
        className="border-red-500 focus:border-red-500 focus:ring-red-500"
      />
      <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
    </div>
  ),
};

export const WithSuccess: Story = {
  render: () => (
    <div className="w-64">
      <label className="block text-sm font-medium mb-1">Username</label>
      <Input 
        placeholder="johndoe" 
        className="border-green-500 focus:border-green-500 focus:ring-green-500"
      />
      <p className="text-green-500 text-sm mt-1">Username is available</p>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="w-64">
      <label className="block text-sm font-medium mb-1">
        Full Name <span className="text-red-500">*</span>
      </label>
      <Input placeholder="John Doe" required />
    </div>
  ),
};