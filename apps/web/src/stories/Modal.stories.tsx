import type { Meta, StoryObj } from '@storybook/react';
import { Modal, Button } from '@x-ear/ui-web';
import { useState } from 'react';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const ModalWrapper = ({ title, children, size }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        size={size}
      >
        {children}
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: () => (
    <ModalWrapper title="Default Modal">
      <p>This is the default modal content. You can put any content here.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary">Save</Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </ModalWrapper>
  ),
};

export const Small: Story = {
  render: () => (
    <ModalWrapper title="Small Modal" size="sm">
      <p>This is a small modal with limited content.</p>
    </ModalWrapper>
  ),
};

export const Large: Story = {
  render: () => (
    <ModalWrapper title="Large Modal" size="lg">
      <p>This is a large modal with more space for content.</p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="Enter name" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="Enter email" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea className="w-full px-3 py-2 border rounded" rows={4} placeholder="Enter message" />
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const WithForm: Story = {
  render: () => (
    <ModalWrapper title="Contact Form">
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="John Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input type="email" className="w-full px-3 py-2 border rounded" placeholder="john@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input type="tel" className="w-full px-3 py-2 border rounded" placeholder="+1 (555) 123-4567" />
        </div>
        <div className="flex gap-2 pt-4">
          <Button variant="primary" type="submit">Submit</Button>
          <Button variant="outline" type="button">Cancel</Button>
        </div>
      </form>
    </ModalWrapper>
  ),
};