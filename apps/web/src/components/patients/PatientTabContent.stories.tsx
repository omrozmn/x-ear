import type { Meta, StoryObj } from '@storybook/react';
import { PatientTabContent } from './PatientTabContent';
import { Patient } from '../../types/patient/patient-base.types';

const mockPatient: Patient = {
  id: '1',
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
  phone: '05551234567',
  email: 'ahmet@example.com',
  birthDate: '1985-03-15',
  gender: 'M',
  addressFull: 'İstanbul, Türkiye',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const meta: Meta<typeof PatientTabContent> = {
  title: 'Components/Patients/PatientTabContent',
  component: PatientTabContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    activeTab: {
      control: 'select',
      options: ['overview', 'devices', 'sales', 'timeline', 'documents', 'appointments', 'hearing-tests', 'sgk', 'notes', 'settings'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PatientTabContent>;

export const Overview: Story = {
  args: {
    patient: mockPatient,
    activeTab: 'overview',
    isLoading: false,
  },
};

export const Devices: Story = {
  args: {
    patient: mockPatient,
    activeTab: 'devices',
    isLoading: false,
  },
};

export const Sales: Story = {
  args: {
    patient: mockPatient,
    activeTab: 'sales',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    patient: mockPatient,
    activeTab: 'overview',
    isLoading: true,
  },
};
