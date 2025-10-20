import type { Meta, StoryObj } from '@storybook/react';
import DocumentPreview from '../components/sgk/DocumentPreview';

const meta: Meta<typeof DocumentPreview> = {
  title: 'SGK/DocumentPreview',
  component: DocumentPreview,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockResult = {
  fileName: 'IMG_0227.JPG',
  status: 'processed' as const,
  result: {
    matched_patient: {
      patient: {
        id: 'pat_123',
        fullName: 'Ahmet Yılmaz',
      },
      match_details: {
        confidence: 0.95,
      },
    },
    pdf_generated: true,
    pdf_filename: 'ahmet_yılmaz_rapor_20241020_143000.pdf',
    document_type: 'sgk_rapor',
    entities: [
      { text: 'HASTA ADI SOYADI: Ahmet Yılmaz', confidence: 0.9 },
      { text: 'TC KİMLİK NO: 12345678901', confidence: 0.95 },
      { text: 'RAPOR TARİHİ: 20.10.2024', confidence: 0.88 },
    ],
  },
};

export const Default: Story = {
  args: {
    result: mockResult,
    isOpen: true,
    onClose: () => {},
    onChangeDocumentType: () => {},
  },
};

export const NoPatientMatch: Story = {
  args: {
    result: {
      ...mockResult,
      result: {
        ...mockResult.result,
        matched_patient: null,
      },
    },
    isOpen: true,
    onClose: () => {},
    onChangeDocumentType: () => {},
  },
};

export const PDFNotGenerated: Story = {
  args: {
    result: {
      ...mockResult,
      result: {
        ...mockResult.result,
        pdf_generated: false,
      },
    },
    isOpen: true,
    onClose: () => {},
    onChangeDocumentType: () => {},
  },
};