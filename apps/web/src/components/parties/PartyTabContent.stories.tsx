import type { Meta, StoryObj } from '@storybook/react';
import { PartyTabContent } from './PartyTabContent';
import { Party } from '../../types/party/party-base.types';

const mockParty: Party = {
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

const meta: Meta<typeof PartyTabContent> = {
  title: 'Components/Parties/PartyTabContent',
  component: PartyTabContent,
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
type Story = StoryObj<typeof PartyTabContent>;

export const Overview: Story = {
  args: {
    party: mockParty,
    activeTab: 'overview',
    isLoading: false,
  },
};

export const Devices: Story = {
  args: {
    party: mockParty,
    activeTab: 'devices',
    isLoading: false,
  },
};

export const Sales: Story = {
  args: {
    party: mockParty,
    activeTab: 'sales',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    party: mockParty,
    activeTab: 'overview',
    isLoading: true,
  },
};
