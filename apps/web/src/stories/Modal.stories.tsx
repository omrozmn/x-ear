import type { Meta, StoryObj } from '@storybook/react';
import { Modal, Button, Input, Textarea } from '@x-ear/ui-web';
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

const ModalWrapper = ({ title, children, size }: { title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) => {
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
          <Input label="Name" placeholder="Enter name" />
        </div>
        <div>
          <Input label="Email" placeholder="Enter email" />
        </div>
        <div>
          <Textarea label="Message" rows={4} placeholder="Enter message" />
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
          <Input label="Full Name" placeholder="John Doe" />
        </div>
        <div>
          <Input label="Email Address" type="email" placeholder="john@example.com" />
        </div>
        <div>
          <Input label="Phone Number" type="tel" placeholder="+1 (555) 123-4567" />
        </div>
        <div className="flex gap-2 pt-4">
          <Button variant="primary" type="submit">Submit</Button>
          <Button variant="outline" type="button">Cancel</Button>
        </div>
      </form>
    </ModalWrapper>
  ),
};