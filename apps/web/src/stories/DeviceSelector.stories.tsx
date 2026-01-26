import type { Meta, StoryObj } from '@storybook/react';
import { DeviceSelector } from '@x-ear/ui-web';
import { useState } from 'react';

const meta: Meta<typeof DeviceSelector> = {
  title: 'Forms/DeviceSelector',
  component: DeviceSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
    required: {
      control: { type: 'boolean' },
    },
    showStock: {
      control: { type: 'boolean' },
    },
    showPrice: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockDevices = [
  {
    id: '1',
    name: 'Phonak Audéo Paradise P90',
    brand: 'Phonak',
    model: 'Audéo Paradise P90',
    price: 15000,
    stock: 5,
  },
  {
    id: '2',
    name: 'Oticon More 1',
    brand: 'Oticon',
    model: 'More 1',
    price: 18000,
    stock: 3,
  },
  {
    id: '3',
    name: 'Widex Moment 440',
    brand: 'Widex',
    model: 'Moment 440',
    price: 16500,
    stock: 0,
  },
  {
    id: '4',
    name: 'Signia Pure Charge&Go 7X',
    brand: 'Signia',
    model: 'Pure Charge&Go 7X',
    price: 14000,
    stock: 8,
  },
];

interface DeviceSelectorWrapperProps {
  value?: string;
  label?: string;
  devices?: Array<{
    id: string;
    name: string;
    brand: string;
    model: string;
    price: number;
    stock: number;
  }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showStock?: boolean;
  showPrice?: boolean;
}

const DeviceSelectorWrapper = (args: DeviceSelectorWrapperProps) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <div className="w-80">
      <DeviceSelector
        {...args}
        devices={args.devices || []}
        value={value}
        onChange={(value: string) => setValue(value)}
      />
    </div>
  );
};

export const Default: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz Seçin',
    devices: mockDevices,
    placeholder: 'Bir cihaz seçin...',
  },
};

export const WithValue: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Seçili Cihaz',
    devices: mockDevices,
    value: '1',
  },
};

export const WithStockInfo: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz (Stok Bilgisi)',
    devices: mockDevices,
    placeholder: 'Bir cihaz seçin...',
    showStock: true,
  },
};

export const WithPriceInfo: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz (Fiyat Bilgisi)',
    devices: mockDevices,
    placeholder: 'Bir cihaz seçin...',
    showPrice: true,
  },
};

export const WithAllInfo: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz (Tam Bilgi)',
    devices: mockDevices,
    placeholder: 'Bir cihaz seçin...',
    showStock: true,
    showPrice: true,
  },
};

export const Required: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz Seçimi (Zorunlu)',
    devices: mockDevices,
    placeholder: 'Bir cihaz seçin...',
    required: true,
    showStock: true,
    showPrice: true,
  },
};

export const WithError: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz Seçimi',
    devices: mockDevices,
    placeholder: 'Bir cihaz seçin...',
    error: 'Lütfen bir cihaz seçin',
    required: true,
  },
};

export const Disabled: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz (Devre Dışı)',
    devices: mockDevices,
    value: '2',
    disabled: true,
    showStock: true,
    showPrice: true,
  },
};

export const EmptyDevices: Story = {
  render: DeviceSelectorWrapper,
  args: {
    label: 'Cihaz Listesi',
    devices: [],
    placeholder: 'Cihaz bulunamadı...',
  },
};