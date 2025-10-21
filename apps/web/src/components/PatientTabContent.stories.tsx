import type { Meta, StoryObj } from '@storybook/react';
import { PatientTabContent } from './PatientTabContent';
import { Patient } from '../types/patient';

const meta: Meta<typeof PatientTabContent> = {
  title: 'Patient/PatientTabContent',
  component: PatientTabContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    activeTab: {
      control: { type: 'select' },
      options: ['overview', 'devices', 'sales', 'timeline', 'documents', 'appointments', 'tests', 'settings'],
    },
    isLoading: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock patient data
const mockPatient: Patient = {
  id: '1',
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
  phone: '+90 555 123 4567',
  email: 'ahmet.yilmaz@example.com',
  tcNumber: '12345678901',
  birthDate: '1985-05-15',
  addressFull: 'İstanbul, Kadıköy, Bağdat Caddesi No: 123',
  status: 'ACTIVE',
  segment: 'PURCHASED',
  label: 'satis-tamamlandi',
  acquisitionType: 'referans',
  tags: ['premium', 'loyal'],
  priorityScore: 85,
  sgkInfo: { hasInsurance: false },
  notes: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  devices: [
    {
      id: 'device-1',
      brand: 'Oticon',
      model: 'Opn S',
      serialNumber: 'OT123456',
      side: 'left',
      type: 'hearing_aid',
      status: 'active',
      purchaseDate: '2024-01-15',
      warrantyExpiry: '2027-01-15',
      batteryType: '13',
      price: 25000,
      settings: { volume: 50, program: 1 },
    },
    {
      id: 'device-2',
      brand: 'Oticon',
      model: 'Opn S',
      serialNumber: 'OT123457',
      side: 'right',
      type: 'hearing_aid',
      status: 'active',
      purchaseDate: '2024-01-15',
      warrantyExpiry: '2027-01-15',
      batteryType: '13',
      price: 25000,
    },
  ],
};

export const Overview: Story = {
  args: {
    activeTab: 'overview',
    patient: mockPatient,
    isLoading: false,
    tabCounts: {
      devices: 2,
      sales: 3,
      timeline: 5,
      documents: 4,
    },
  },
};

export const Devices: Story = {
  args: {
    activeTab: 'devices',
    patient: mockPatient,
    isLoading: false,
    tabCounts: {
      devices: 2,
      sales: 3,
      timeline: 5,
      documents: 4,
    },
  },
};

export const DevicesEmpty: Story = {
  args: {
    activeTab: 'devices',
    patient: {
      ...mockPatient,
      devices: [],
    },
    isLoading: false,
    tabCounts: {
      devices: 0,
      sales: 3,
      timeline: 5,
      documents: 4,
    },
  },
};

export const Loading: Story = {
  args: {
    activeTab: 'overview',
    patient: undefined,
    isLoading: true,
    tabCounts: {
      devices: 0,
      sales: 0,
      timeline: 0,
      documents: 0,
    },
  },
};

export const Sales: Story = {
  args: {
    activeTab: 'sales',
    patient: mockPatient,
    isLoading: false,
    tabCounts: {
      devices: 2,
      sales: 3,
      timeline: 5,
      documents: 4,
    },
  },
};

export const Timeline: Story = {
  args: {
    activeTab: 'timeline',
    patient: mockPatient,
    isLoading: false,
    tabCounts: {
      devices: 2,
      sales: 3,
      timeline: 5,
      documents: 4,
    },
  },
};

export const Documents: Story = {
  args: {
    activeTab: 'documents',
    patient: mockPatient,
    isLoading: false,
    tabCounts: {
      devices: 2,
      sales: 3,
      timeline: 5,
      documents: 4,
    },
  },
};

export const ComingSoon: Story = {
  args: {
    activeTab: 'appointments',
    patient: mockPatient,
    isLoading: false,
    tabCounts: {
      devices: 2,
      sales: 3,
      timeline: 5,
      documents: 4,
    },
  },
};