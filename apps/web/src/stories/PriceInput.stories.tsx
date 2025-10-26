import type { Meta, StoryObj } from '@storybook/react';
import { PriceInput } from '@x-ear/ui-web';
import { useState } from 'react';

const meta: Meta<typeof PriceInput> = {
  title: 'Forms/PriceInput',
  component: PriceInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    currency: {
      control: { type: 'select' },
      options: ['TL', 'USD', 'EUR'],
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

const PriceInputWrapper = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <div className="w-80">
      <PriceInput
        {...args}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      />
    </div>
  );
};

export const Default: Story = {
  render: PriceInputWrapper,
  args: {
    label: 'Fiyat',
    placeholder: '0.00',
    currency: 'TL',
  },
};

export const WithValue: Story = {
  render: PriceInputWrapper,
  args: {
    label: 'Ürün Fiyatı',
    value: '1250.50',
    currency: 'TL',
  },
};

export const USD: Story = {
  render: PriceInputWrapper,
  args: {
    label: 'Price',
    placeholder: '0.00',
    currency: 'USD',
  },
};

export const EUR: Story = {
  render: PriceInputWrapper,
  args: {
    label: 'Prix',
    placeholder: '0.00',
    currency: 'EUR',
  },
};

export const Required: Story = {
  render: PriceInputWrapper,
  args: {
    label: 'Satış Fiyatı',
    placeholder: '0.00',
    currency: 'TL',
    required: true,
  },
};

export const WithError: Story = {
  render: PriceInputWrapper,
  args: {
    label: 'Fiyat',
    placeholder: '0.00',
    currency: 'TL',
    error: 'Fiyat 0\'dan büyük olmalıdır',
    required: true,
  },
};

export const Disabled: Story = {
  render: PriceInputWrapper,
  args: {
    label: 'Sabit Fiyat',
    value: '999.99',
    currency: 'TL',
    disabled: true,
  },
};