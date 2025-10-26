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
    brand: 'Phonak',
    model: 'Audéo Paradise P90',
    price: 15000,
    stock: 5,
  },
  {
    id: '2',
    brand: 'Oticon',
    model: 'More 1',
    price: 18000,
    stock: 3,
  },
  {
    id: '3',
    brand: 'Widex',
    model: 'Moment 440',
    price: 16500,
    stock: 0,
  },
  {
    id: '4',
    brand: 'Signia',
    model: 'Pure Charge&Go 7X',
    price: 14000,
    stock: 8,
  },
];

const DeviceSelectorWrapper = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  
  return (
    <div className="w-80">
      <DeviceSelector
        {...args}
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