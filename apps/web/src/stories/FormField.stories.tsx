import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from '@x-ear/ui-web';
import { useState } from 'react';

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'number', 'tel', 'date'],
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

interface FormFieldWrapperProps {
  value?: string | number;
  label?: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel';
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  icon?: string;
  min?: number;
  max?: number;
}

const FormFieldWrapper = (args: FormFieldWrapperProps) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <div className="w-80">
      <FormField
        label={args.label || 'Field Label'}
        value={value}
        onChange={(value: string) => setValue(value)}
        type={args.type}
        placeholder={args.placeholder}
        required={args.required}
        disabled={args.disabled}
        error={args.error}
        min={args.min}
        max={args.max}
      />
    </div>
  );
};

export const Default: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'Ad Soyad',
    placeholder: 'Adınızı ve soyadınızı girin',
  },
};

export const WithValue: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'E-posta',
    type: 'email',
    value: 'ornek@email.com',
    placeholder: 'E-posta adresinizi girin',
  },
};

export const Required: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'Telefon',
    type: 'tel',
    placeholder: '+90 555 123 4567',
    required: true,
  },
};

export const WithError: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'E-posta',
    type: 'email',
    placeholder: 'E-posta adresinizi girin',
    error: 'Geçerli bir e-posta adresi girin',
    required: true,
  },
};

export const Disabled: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'Kullanıcı Adı',
    value: 'kullanici123',
    disabled: true,
  },
};

export const Number: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'Yaş',
    type: 'number',
    placeholder: '25',
    min: 0,
    max: 120,
  },
};

export const Date: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'Doğum Tarihi',
    type: 'date',
  },
};

export const WithIcon: Story = {
  render: FormFieldWrapper,
  args: {
    label: 'Arama',
    placeholder: 'Hasta ara...',
    icon: 'search',
  },
};