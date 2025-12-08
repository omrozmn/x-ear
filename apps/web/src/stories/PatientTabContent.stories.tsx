import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { PatientTabContent } from '../components/PatientTabContent';
import { Patient } from '../types/patient/patient-base.types';

const meta: Meta<typeof PatientTabContent> = {
  title: 'Patient/PatientTabContent',
  component: PatientTabContent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Hasta detaylarının tüm sekmelerini içeren ana bileşen.'
      }
    }
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gray-50">
        <Story />
      </div>
    )
  ]
};

export default meta;
type Story = StoryObj<typeof PatientTabContent>;

const mockPatient = {
  id: '1',
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
  phone: '+90 555 123 4567',
  tcNumber: '12345678901',
  birthDate: '1985-05-15',
  email: 'ahmet.yilmaz@example.com',
  address: 'İstanbul, Türkiye',
  status: 'ACTIVE',
  segment: 'EXISTING',
  label: 'kontrol-hastasi',
  acquisitionType: 'referans',
  tags: ['premium', 'vip'],
  devices: [],
  sgkInfo: {
    hasInsurance: true,
    insuranceType: 'sgk',
    coveragePercentage: 75
  },
  notes: [],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
} as Patient;

export const OverviewTab: Story = {
  args: {
    activeTab: 'overview',
    patient: mockPatient
  },
  parameters: {
    docs: {
      description: {
        story: 'Genel bilgiler sekmesi - hasta temel bilgileri.'
      }
    }
  }
};

export const DevicesTab: Story = {
  args: {
    activeTab: 'devices',
    patient: mockPatient,
    tabCounts: {
      devices: 2,
      sales: 1,
      timeline: 5,
      documents: 3
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Cihazlar sekmesi - hasta cihazlarının yönetimi.'
      }
    }
  }
};

export const SalesTab: Story = {
  args: {
    activeTab: 'sales',
    patient: mockPatient,
    tabCounts: {
      devices: 2,
      sales: 1,
      timeline: 5,
      documents: 3
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Satışlar sekmesi - hasta satış geçmişinin görüntülenmesi.'
      }
    }
  }
};

export const TimelineTab: Story = {
  args: {
    activeTab: 'timeline',
    patient: mockPatient,
    tabCounts: {
      devices: 2,
      sales: 1,
      timeline: 5,
      documents: 3
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Zaman çizelgesi sekmesi - hasta olaylarının kronolojik görünümü.'
      }
    }
  }
};

export const DocumentsTab: Story = {
  args: {
    activeTab: 'documents',
    patient: mockPatient,
    tabCounts: {
      devices: 2,
      sales: 1,
      timeline: 5,
      documents: 3
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Belgeler sekmesi - hasta belgelerinin yönetimi.'
      }
    }
  }
};

export const AppointmentsTab: Story = {
  args: {
    activeTab: 'appointments',
    patient: mockPatient
  },
  parameters: {
    docs: {
      description: {
        story: 'Randevular sekmesi - hasta randevularının yönetimi.'
      }
    }
  }
};

export const HearingTestsTab: Story = {
  args: {
    activeTab: 'tests',
    patient: mockPatient
  },
  parameters: {
    docs: {
      description: {
        story: 'İşitme testleri sekmesi - hasta işitme test sonuçları.'
      }
    }
  }
};

export const NotesTab: Story = {
  args: {
    activeTab: 'notes',
    patient: mockPatient
  },
  parameters: {
    docs: {
      description: {
        story: 'Notlar sekmesi - hasta notlarının yönetimi.'
      }
    }
  }
};

export const Loading: Story = {
  args: {
    activeTab: 'overview',
    isLoading: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Yükleme durumu - veri yüklenirken gösterilen iskelet ekran.'
      }
    }
  }
};