import { Button } from '@x-ear/ui-web';
import React from 'react';
import { createPortal } from 'react-dom';
import { InvoiceModalContent } from './InvoiceModalContent';
import { InvoiceFormData } from '../../types/invoice-schema';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: any) => void;
  onError?: (error: string) => void;
  initialData?: any;
  partyId?: string;
  deviceId?: string;
  mode?: 'create' | 'quick' | 'template' | 'edit';
  title?: string;
  enableIncomingSelection?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  initialData,
  partyId,
  deviceId,
  mode = 'create',
  title
  , enableIncomingSelection = false
}) => {
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 50000 }}
      onClick={handleBackdropClick}
    >
      <InvoiceModalContent
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
        onError={onError}
        initialData={initialData}
        partyId={partyId}
        deviceId={deviceId}
        mode={mode}
        enableIncomingSelection={enableIncomingSelection}
        title={title}
      />
    </div>
  );

  // Render modal into document.body to escape any parent stacking contexts
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};

// Quick Invoice Modal - Simplified version for quick invoice creation
export const QuickInvoiceModal: React.FC<Omit<InvoiceModalProps, 'mode'>> = (props) => {
  return <InvoiceModal {...props} mode="quick" title="Hızlı Fatura Oluştur" />;
};

// Template Invoice Modal - For creating invoices from templates
export const TemplateInvoiceModal: React.FC<Omit<InvoiceModalProps, 'mode'>> = (props) => {
  return <InvoiceModal {...props} mode="template" title="Şablondan Fatura Oluştur" />;
};

// Device Invoice Modal - For creating invoices for device sales
interface DeviceInvoiceModalProps extends Omit<InvoiceModalProps, 'initialData'> {
  deviceInfo: {
    id: string;
    name: string;
    serial: string;
    price: number;
    brand?: string;
    model?: string;
  };
  partyInfo?: {
    id: string;
    name: string;
    tcNumber?: string;
    phone?: string;
    email?: string;
  };
}

export const DeviceInvoiceModal: React.FC<DeviceInvoiceModalProps> = ({
  deviceInfo,
  partyInfo,
  ...props
}) => {
  // Prepare initial data with device and party information
  const initialData: Partial<InvoiceFormData> = {
    invoiceType: 'device',
    scenario: 'device_sale',
    device_info: {
      device_brand: deviceInfo.brand || '',
      device_model: deviceInfo.model || '',
      device_serial: deviceInfo.serial,
      device_price: deviceInfo.price
    },
    customer_info: partyInfo ? {
      first_name: partyInfo.name.split(' ')[0] || '',
      last_name: partyInfo.name.split(' ').slice(1).join(' ') || '',
      tc_number: partyInfo.tcNumber || '',
      phone: partyInfo.phone || '',
      email: partyInfo.email || ''
    } : {},
    items: [{
      description: deviceInfo.name,
      quantity: 1,
      unitPrice: deviceInfo.price,
      taxRate: 18, // Default KDV rate
      total: deviceInfo.price * 1.18
    }]
  };

  return (
    <InvoiceModal
      {...props}
      mode="create"
      title="Cihaz Satış Faturası"
      initialData={initialData}
    />
  );
};