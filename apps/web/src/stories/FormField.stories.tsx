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
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'date'],
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

const FormFieldWrapper = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <div className="w-80">
      <FormField
        {...args}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
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
    label: 'Şifre',
    type: 'password',
    placeholder: 'Şifrenizi girin',
    error: 'Şifre en az 8 karakter olmalıdır',
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