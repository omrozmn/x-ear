import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router';
import { Button, Input, DatePicker, Textarea, ConfirmModal } from '@x-ear/ui-web';
import { CheckCircle, ChevronDown, Pill } from 'lucide-react';
import { InvoiceFormExtended } from '../components/invoices/InvoiceFormExtended';
import ExportDetailsCard from '../components/invoices/ExportDetailsCard';
import { SGKInvoiceSection } from '../components/invoices/SGKInvoiceSection';
import { GovernmentSection } from '../components/invoices/GovernmentSection';
import { GOVERNMENT_EXEMPTION_REASONS } from '../constants/governmentInvoiceConstants';
import { Select } from '@x-ear/ui-web';
import { CustomerSectionCompact } from '../components/invoices/CustomerSectionCompact';
import WithholdingCard from '../components/invoices/WithholdingCard';
import { InvoiceProfileDetailsCard } from '../components/invoices/InvoiceProfileDetailsCard';
import { useIsMobile } from '../hooks/useBreakpoint';
import { ProductLinesSection } from '../components/invoices/ProductLinesSection';
import { MobileLayout } from '../components/mobile/MobileLayout';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { apiClient } from '@/api/orval-mutator';
import toast from 'react-hot-toast';
import { ErrorMessage } from '../components/ErrorMessage';
import { useGetTenantCompany } from '@/api/client/tenant-users.client';
import { normalizeCustomerTaxIdFields, normalizeCustomerTaxIdChange } from '../utils/customerTaxId';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { HeaderBackButton } from '../components/layout/HeaderBackButton';

interface InvoiceFormData {
  invoiceType: string;
  scenario: string;
  currency: string;
  [key: string]: unknown;
}

interface SpecialTaxBase {
  amount?: number;
  taxRate?: number;
  description?: string;
  hasSpecialTaxBase?: boolean;
}

interface ReturnInvoiceDetails {
  returnInvoiceNumber?: string;
  returnInvoiceDate?: string;
  returnReason?: string;
}

interface ExtendedData {
  customerId?: string;
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerTaxId?: string;
  customerTcNumber?: string;
  customerTaxNumber?: string;
  customerAddress?: string;
  customerCity?: string;
  customerDistrict?: string;
  sgkData?: unknown;
  governmentExemptionReason?: string;
  exportDetails?: unknown;
  specialTaxBase?: SpecialTaxBase;
  returnInvoiceDetails?: ReturnInvoiceDetails;
  medicalDeviceData?: unknown;
  withholdingData?: unknown;
  items?: unknown[];
  [key: string]: unknown;
}

interface InvoiceHandlers {
  handleExtendedFieldChange: (field: string, value: unknown) => void;
  setMedicalModalOpen?: (open: boolean) => void;
  specialOperationsVisible?: boolean;
  isWithholdingType?: boolean;
  [key: string]: unknown;
}

interface ActiveLineEditor {
  type: 'withholding' | 'special' | 'medical';
  index: number;
}

interface BlockingAlert {
  title: string;
  message: string;
}

type DocumentKind = 'invoice' | 'despatch';

interface LinkedDocumentOptions {
  createLinkedDocument?: boolean;
  linkedInvoiceType?: string;
  linkedScenario?: string;
}

const invoiceTypeNeedsZeroVatExemption = (invoiceType?: string) => !['14', '15', '49', '50'].includes(String(invoiceType || ''));

const hasZeroVatLineWithoutExemption = (payload: Record<string, unknown>) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const line = item as Record<string, unknown>;
    const taxRate = Number(line.taxRate ?? 0);
    const exemptionCode = String(line.taxExemptionCode ?? line.tax_exemption_code ?? '').trim();
    return taxRate === 0 && !exemptionCode;
  });
};

const DEFAULT_LINKED_OPTIONS: LinkedDocumentOptions = {
  createLinkedDocument: false,
  linkedInvoiceType: '0',
  linkedScenario: 'other',
};

const getDocumentKindText = (documentKind: DocumentKind) => documentKind === 'despatch' ? 'E-İrsaliye' : 'Fatura';

const sanitizeLinkedDocumentOptions = (value: unknown): LinkedDocumentOptions => {
  if (!value || typeof value !== 'object') return { ...DEFAULT_LINKED_OPTIONS };
  const raw = value as Record<string, unknown>;
  return {
    createLinkedDocument: Boolean(raw.createLinkedDocument),
    linkedInvoiceType: String(raw.linkedInvoiceType || DEFAULT_LINKED_OPTIONS.linkedInvoiceType),
    linkedScenario: String(raw.linkedScenario || DEFAULT_LINKED_OPTIONS.linkedScenario),
  };
};

const linkedOptionsFromPayload = (source: Record<string, unknown>): LinkedDocumentOptions => {
  const deliveryInfo = source.deliveryInfo;
  if (deliveryInfo && typeof deliveryInfo === 'object') {
    const delivery = deliveryInfo as Record<string, unknown>;
    if (
      delivery.createLinkedDocument !== undefined ||
      delivery.linkedInvoiceType !== undefined ||
      delivery.linkedScenario !== undefined
    ) {
      return sanitizeLinkedDocumentOptions({
        createLinkedDocument: delivery.createLinkedDocument,
        linkedInvoiceType: delivery.linkedInvoiceType,
        linkedScenario: delivery.linkedScenario,
      });
    }
  }

  return sanitizeLinkedDocumentOptions(source.linkedDocumentOptions);
};

const buildLinkedDocumentPayload = (source: Record<string, unknown>, documentKind: DocumentKind): Record<string, unknown> => {
  const linkedOptions = linkedOptionsFromPayload(source);
  const clonedItems = Array.isArray(source.items) ? source.items.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const line = { ...(item as Record<string, unknown>) };
    delete line.withholdingData;
    return line;
  }) : [];

  if (documentKind === 'invoice') {
    return {
      ...source,
      invoiceType: 'sevk',
      scenario: 'other',
      scenarioData: { scenario: 'other', currentScenarioType: '2' },
      profileDetails: {
        ...((source.profileDetails as Record<string, unknown> | undefined) || {}),
        systemType: 'EIRSALIYE',
        profileId: 'TEMELIRSALIYE',
      },
      linkedDocumentOptions: { ...DEFAULT_LINKED_OPTIONS, linkedInvoiceType: linkedOptions.linkedInvoiceType, linkedScenario: linkedOptions.linkedScenario },
      items: clonedItems,
    };
  }

  return {
    ...source,
    invoiceType: linkedOptions.linkedInvoiceType || '0',
    scenario: linkedOptions.linkedScenario || 'other',
    scenarioData: { scenario: linkedOptions.linkedScenario || 'other', currentScenarioType: '3' },
    profileDetails: undefined,
    linkedDocumentOptions: { ...DEFAULT_LINKED_OPTIONS, linkedInvoiceType: linkedOptions.linkedInvoiceType, linkedScenario: linkedOptions.linkedScenario },
    items: clonedItems,
  };
};

const normalizeDraftItems = (items: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const line = item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : {};
    if (!line.id) {
      line.id = `draft-line-${index + 1}`;
    }
    if (!line.unit) {
      line.unit = 'Adet';
    }
    return line;
  });
};

const normalizeDraftPayload = (draft: Record<string, unknown>) => ({
  ...draft,
  items: normalizeDraftItems(draft.items),
});

export function NewInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const search = useSearch({ from: '/invoices/new' });
  const searchDraftId = search.draftId;
  const documentKind: DocumentKind = location.pathname.endsWith('/new-despatch') || search.documentKind === 'despatch' ? 'despatch' : 'invoice';
  const [isSaving, setIsSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(searchDraftId);
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceType: documentKind === 'despatch' ? 'sevk' : '',
    scenario: 'other',
    currency: 'TRY'
  });
  const [blockingAlert, setBlockingAlert] = useState<BlockingAlert | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const isMobile = useIsMobile();
  const { data: companyData } = useGetTenantCompany();

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      invoiceType: documentKind === 'despatch' ? 'sevk' : (String(prev.invoiceType || '') === 'sevk' ? '' : prev.invoiceType),
      linkedDocumentOptions: sanitizeLinkedDocumentOptions(prev.linkedDocumentOptions),
      profileDetails: documentKind === 'despatch'
        ? {
            ...((prev.profileDetails as Record<string, unknown> | undefined) || {}),
            systemType: 'EIRSALIYE',
            profileId: 'TEMELIRSALIYE',
          }
        : prev.profileDetails,
    }));
  }, [documentKind]);

  // Track unsaved changes
  useEffect(() => {
    // Check if form has meaningful data
    const hasData = 
      formData.customerId ||
      formData.customerFirstName ||
      formData.customerLastName ||
      formData.invoiceType ||
      (Array.isArray(formData.items) && formData.items.length > 0);
    
    setHasUnsavedChanges(Boolean(hasData));
  }, [formData]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSaving) {
        e.preventDefault();
        e.returnValue = 'Kaydedilmemiş değişiklikleriniz var. Sayfadan çıkmak istediğinize emin misiniz?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isSaving]);

  // Load draft from API when draftId is provided in URL
  useEffect(() => {
    if (!searchDraftId) return;
    
    const loadDraft = async () => {
      setCurrentDraftId(searchDraftId);
      try {
        const res: { data?: { data?: { formData?: Record<string, unknown>; form_data?: Record<string, unknown> } } } = await apiClient.get(`/api/invoices/draft/${searchDraftId}`);
        const fd = res.data?.data?.formData ?? res.data?.data?.form_data;
        if (fd) setFormData(prev => ({ ...prev, ...fd, ...normalizeCustomerTaxIdFields(fd) }));
      } catch {
        toast.error('Taslak yüklenemedi');
      }
    };
    
    loadDraft();
  }, [searchDraftId]);

  // Fallback: Pre-fill form data from a copied invoice stored in sessionStorage
  // Read outside useEffect to survive React StrictMode double-mount (which would
  // remove the sessionStorage item on first mount and find nothing on second mount)
  const sessionDraftRef = useRef<Record<string, unknown> | false | null>(null);
  if (sessionDraftRef.current === null) {
    try {
      const raw = sessionStorage.getItem('invoice_copy_draft');
      if (raw) {
        sessionDraftRef.current = JSON.parse(raw);
        sessionStorage.removeItem('invoice_copy_draft');
      } else {
        sessionDraftRef.current = false; // Mark as checked, nothing found
      }
    } catch {
      sessionDraftRef.current = false;
    }
  }

  useEffect(() => {
    if (searchDraftId) return; // API-based draft takes precedence
    const draft = sessionDraftRef.current;
    if (draft && typeof draft === 'object') {
      const normalizedDraft = normalizeDraftPayload(draft);
      console.log('[NewInvoicePage] Loading draft from sessionStorage:', {
        items: (normalizedDraft.items as unknown[])?.length,
      });
      setFormData(prev => ({
        ...prev,
        ...normalizedDraft,
        ...normalizeCustomerTaxIdFields(normalizedDraft as Record<string, unknown> & { customerTaxId?: string; customerTaxNumber?: string; customerTcNumber?: string }),
      }));
      sessionDraftRef.current = false; // Consumed
    }
  }, [searchDraftId]);

  const handleSubmit = async (invoiceData: InvoiceFormData) => {
    setIsSaving(true);
    try {
      const mergedInvoiceData: Record<string, unknown> = {
        ...formData,
        ...invoiceData,
        ...normalizeCustomerTaxIdFields({ ...formData, ...invoiceData }),
      };
      const linkedOptions = linkedOptionsFromPayload(mergedInvoiceData);
      const defaultExemptionCode = String(
        ((companyData?.data?.companyInfo as Record<string, unknown> | undefined)?.defaultExemptionCode as string | undefined) || ''
      ).trim();

      if (
        invoiceTypeNeedsZeroVatExemption(String(mergedInvoiceData.invoiceType || '')) &&
        hasZeroVatLineWithoutExemption(mergedInvoiceData) &&
        !String(mergedInvoiceData.governmentExemptionReason || '').trim()
      ) {
        if (defaultExemptionCode && defaultExemptionCode !== '0') {
          mergedInvoiceData.governmentExemptionReason = defaultExemptionCode;
        } else {
          // Save draft before showing error
          try {
            const draftPayload = { form_data: mergedInvoiceData };
            let draftId = currentDraftId;
            if (draftId) {
              await apiClient.put(`/api/invoices/draft/${draftId}`, draftPayload);
            } else {
              const res: { data?: { data?: { invoiceId?: number; invoice_id?: number } } } = await apiClient.post('/api/invoices/draft', draftPayload);
              draftId = res.data?.data?.invoiceId ?? res.data?.data?.invoice_id;
              if (draftId) setCurrentDraftId(Number(draftId));
            }
            console.log('✅ Taslak kaydedildi (istisna sebebi eksik)');
          } catch (draftError) {
            console.error('⚠️ Taslak kaydedilemedi:', draftError);
          }
          
          setBlockingAlert({
            title: 'İstisna Sebebi Gerekli',
            message: 'KDV %0 olan satırlar için varsayılan istisna sebebi tanımlı değil. Faturanız taslak olarak kaydedildi. Firma Ayarları > Fatura Numaralandırma bölümünden varsayılan istisna sebebini ayarlayıp tekrar deneyin.',
          });
          setIsSaving(false);
          return;
        }
      }

      setBlockingAlert(null);
      // Step 1: Save or update draft
      const draftPayload = { form_data: mergedInvoiceData };
      let draftId = currentDraftId;
      if (draftId) {
        await apiClient.put(`/api/invoices/draft/${draftId}`, draftPayload);
      } else {
        const res: { data?: { data?: { invoiceId?: number; invoice_id?: number } } } = await apiClient.post('/api/invoices/draft', draftPayload);
        draftId = res.data?.data?.invoiceId ?? res.data?.data?.invoice_id;
        if (draftId) setCurrentDraftId(Number(draftId));
      }

      if (!draftId) {
        toast.error('Taslak kaydedilemedi');
        return;
      }

      // Step 2: Issue the draft (send to GİB)
      const issueRes: { data?: { data?: { message?: string } } } = await apiClient.post(`/api/invoices/draft/${draftId}/issue`);
      const messages = [issueRes.data?.data?.message || `${getDocumentKindText(documentKind)} gönderildi`];

      if (linkedOptions.createLinkedDocument) {
        const linkedPayload = buildLinkedDocumentPayload(mergedInvoiceData, documentKind);
        const linkedDraftRes: { data?: { data?: { invoiceId?: number; invoice_id?: number } } } = await apiClient.post('/api/invoices/draft', { form_data: linkedPayload });
        const linkedDraftId = linkedDraftRes.data?.data?.invoiceId ?? linkedDraftRes.data?.data?.invoice_id;
        if (!linkedDraftId) {
          throw new Error('Bağlı belge taslağı oluşturulamadı');
        }
        const linkedIssueRes: { data?: { data?: { message?: string } } } = await apiClient.post(`/api/invoices/draft/${linkedDraftId}/issue`);
        messages.push(linkedIssueRes.data?.data?.message || `${getDocumentKindText(documentKind === 'invoice' ? 'despatch' : 'invoice')} gönderildi`);
      }

      toast.success(messages.join(' | '));
      setHasUnsavedChanges(false); // Mark as saved
      navigate({ to: '/invoices' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const detail = err.response?.data?.detail || err.message || 'Fatura gönderilemedi';
      toast.error(detail);
      console.error('Error issuing invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payload = {
        form_data: {
          ...formData,
          ...normalizeCustomerTaxIdFields(formData),
        },
      };
      if (currentDraftId) {
        await apiClient.put(`/api/invoices/draft/${currentDraftId}`, payload);
        toast.success('Taslak güncellendi');
      } else {
        const res: { data?: { data?: { invoice_id?: number; invoiceId?: number } } } = await apiClient.post('/api/invoices/draft', payload);
        const newId = res.data?.data?.invoice_id ?? res.data?.data?.invoiceId;
        if (newId) {
          setCurrentDraftId(Number(newId));
          setHasUnsavedChanges(false); // Mark as saved
        }
        toast.success('Taslak kaydedildi');
      }
      navigate({ to: '/invoices' });
    } catch (error) {
      toast.error('Taslak kaydedilemedi');
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // If there are unsaved changes, show modal
    if (hasUnsavedChanges && !currentDraftId) {
      setShowSaveDraftModal(true);
    } else {
      navigate({ to: '/invoices' });
    }
  };

  const handleConfirmSaveDraft = async () => {
    setShowSaveDraftModal(false);
    await handleSaveDraft();
  };

  const handleCancelWithoutSaving = () => {
    setShowSaveDraftModal(false);
    setHasUnsavedChanges(false); // Clear flag before navigation
    navigate({ to: '/invoices' });
  };

  const handleFormDataChange = (field: string, value: unknown) => {
    // Map complex fields from child components into flat formData used by the page
    setFormData((prev) => {
      const next: InvoiceFormData = { ...prev };
      if (field === 'scenarioData') {
        next.scenarioData = value;
        next.scenario = (value as { scenario?: string })?.scenario || 'other';
      } else if (field === 'customerTaxId' || field === 'customerTaxNumber' || field === 'customerTcNumber') {
        return {
          ...next,
          ...normalizeCustomerTaxIdChange(field, String(value || '')),
        };
      } else if (field === 'invoiceType') {
        next.invoiceType = value as string;
      } else {
        next[field] = value;
      }
      return next;
    });
  };

  const [activeLineEditor, setActiveLineEditor] = useState<ActiveLineEditor | null>(null);

  const handleRequestLineEditor = (type: 'withholding' | 'special' | 'medical', index: number) => {
    setActiveLineEditor({ type, index });
  };

  const handleCloseLineEditor = () => setActiveLineEditor(null);

  // Koşullu bölümleri hesapla
  const showSGKSection = formData.invoiceType === '14';
  const showGovernmentSection = formData.scenario === 'government';
  // Export sidebar should only open for export scenario. If invoice type is '13' (İstisna)
  // but scenario is not export, we show a separate Istisna Sebebi card instead (see below).
  const showExportSection = formData.scenario === 'export';
  const showMedicalSection = formData.scenario === 'medical';
  const showReturnSection = ['15', '49', '50'].includes(formData.invoiceType);
  const showSpecialBaseSection = ['12', '19', '25', '33'].includes(formData.invoiceType);

  // Özel işlemler görünürlüğü
  const isWithholdingType = ['11', '18', '24', '32'].includes(formData.invoiceType);
  const showSpecialOperations = isWithholdingType;

  return (
    <>
      <NewInvoicePageContent
        isSaving={isSaving}
        handleSubmit={handleSubmit}
        handleSaveDraft={handleSaveDraft}
        handleCancel={handleCancel}
        formData={formData}
        documentKind={documentKind}
        onFormDataChange={handleFormDataChange}
        showSGKSection={showSGKSection}
        showGovernmentSection={showGovernmentSection}
        showExportSection={showExportSection}
        showMedicalSection={showMedicalSection}
        showReturnSection={showReturnSection}
        showSpecialOperations={showSpecialOperations}
        showSpecialBaseSection={showSpecialBaseSection}
        isWithholdingType={isWithholdingType}
        onRequestLineEditor={handleRequestLineEditor}
        activeLineEditor={activeLineEditor}
        onCloseLineEditor={handleCloseLineEditor}
        isMobile={isMobile}
        blockingAlert={blockingAlert}
      />
      
      <ConfirmModal
        isOpen={showSaveDraftModal}
        onClose={handleCancelWithoutSaving}
        onConfirm={handleConfirmSaveDraft}
        title="Taslak Kaydet"
        message="Kaydedilmemiş değişiklikleriniz var. Taslak olarak kaydetmek ister misiniz?"
        confirmText="Taslak Kaydet"
        cancelText="Kaydetmeden Çık"
        variant="default"
      />
    </>
  );
}

// Sidebar Component
function InvoiceSidebar({
  showSGKSection,
  showExportSection,
  showMedicalSection,
  showGovernmentSection,
  showIstisnaReason,
  showReturnSection,
  showSpecialBaseSection,
  extendedData,
  handlers,
  activeLineEditor,
  onCloseLineEditor
}: {
  documentKind?: DocumentKind;
  showSGKSection?: boolean;
  showExportSection?: boolean;
  showMedicalSection?: boolean;
  showGovernmentSection?: boolean;
  showIstisnaReason?: boolean;
  showReturnSection?: boolean;
  showSpecialBaseSection?: boolean;
  extendedData?: ExtendedData;
  handlers?: InvoiceHandlers;
  activeLineEditor?: ActiveLineEditor;
  onCloseLineEditor?: () => void;
}) {
  // Defensive local booleans to avoid ReferenceError if props are missing
  const _showSGKSection = !!showSGKSection;
  const _showExportSection = !!showExportSection;
  const _showMedicalSection = !!showMedicalSection;
  const _showGovernmentSection = !!showGovernmentSection;
  const _showReturnSection = !!showReturnSection;
  const _showSpecialBaseSection = !!showSpecialBaseSection;
  return (
    <div className="space-y-4">
      {/* Fatura Alıcı - En Üstte */}
      <CustomerSectionCompact
        isSGK={showSGKSection}
        customerId={extendedData?.customerId as string | undefined}
        customerName={extendedData?.customerName as string | undefined}
        customerFirstName={extendedData?.customerFirstName as string | undefined}
        customerLastName={extendedData?.customerLastName as string | undefined}
        customerTaxId={extendedData?.customerTaxId as string | undefined}
        customerTcNumber={extendedData?.customerTcNumber as string | undefined}
        customerTaxNumber={extendedData?.customerTaxNumber as string | undefined}
        customerAddress={extendedData?.customerAddress as string | undefined}
        customerCity={extendedData?.customerCity as string | undefined}
        customerDistrict={extendedData?.customerDistrict as string | undefined}
        onChange={handlers?.handleExtendedFieldChange || (() => { })}
      />

      {/* SGK Section */}
      {_showSGKSection && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/40">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">SGK Fatura Bilgileri</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">SGK faturası için gerekli bilgileri girin</p>
          </div>
          <div className="p-4">
            <SGKInvoiceSection
              sgkData={extendedData?.sgkData as never}
              onChange={(data) => handlers?.handleExtendedFieldChange?.('sgkData', data)}
            />
          </div>
        </div>
      )}

      {/* Government Section */}
      {_showGovernmentSection && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/40">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Kamu Fatura Bilgileri</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Kamu kurumu faturası bilgileri</p>
          </div>
          <div className="p-4">
            <GovernmentSection
              formData={extendedData as never}
              onChange={handlers?.handleExtendedFieldChange || (() => { })}
            />
          </div>
        </div>
      )}

      {/* Istisna Sebebi card: show when invoiceType=13 selected outside export and government scenarios */}
      {showIstisnaReason && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900">İstisna Sebebi</h3>
            <p className="text-xs text-gray-500">Seçilen istisna için neden kodunu belirtiniz</p>
          </div>
          <div>
            <Select
              label="İstisna Sebebi"
              value={extendedData?.governmentExemptionReason as string || '0'}
              onChange={(e) => handlers?.handleExtendedFieldChange('governmentExemptionReason', e.target.value)}
              options={GOVERNMENT_EXEMPTION_REASONS}
              fullWidth
            />
          </div>
        </div>
      )}

      {/* Export Section */}
      {_showExportSection && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">İhracat Bilgileri</h3>
          </div>
          <div>
            <ExportDetailsCard
              value={extendedData?.exportDetails as never}
              onChange={(data) => handlers?.handleExtendedFieldChange?.('exportDetails', data)}
            />
          </div>
        </div>
      )}

      {/* Özel Matrah (sidebar) */}
      {_showSpecialBaseSection && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Özel Matrah Bilgileri</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Özel Matrah Tutarı</label>
              <Input
                type="number"
                step="0.01"
                value={extendedData?.specialTaxBase?.amount || ''}
                onChange={(e) => handlers?.handleExtendedFieldChange('specialTaxBase', {
                  ...extendedData?.specialTaxBase,
                  hasSpecialTaxBase: true,
                  amount: parseFloat(e.target.value)
                })}
                className="w-full"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KDV Oranı (%)</label>
              <Input
                type="number"
                value={extendedData?.specialTaxBase?.taxRate || ''}
                onChange={(e) => handlers?.handleExtendedFieldChange('specialTaxBase', {
                  ...extendedData?.specialTaxBase,
                  taxRate: parseFloat(e.target.value)
                })}
                className="w-full"
                placeholder="18"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
              <Input
                type="text"
                value={extendedData?.specialTaxBase?.description || ''}
                onChange={(e) => handlers?.handleExtendedFieldChange('specialTaxBase', {
                  ...extendedData?.specialTaxBase,
                  description: e.target.value
                })}
                className="w-full"
                placeholder="Özel matrah açıklaması"
              />
            </div>
          </div>
        </div>
      )}
      {/* İade Fatura Bilgileri (moved to sidebar) */}
      {_showReturnSection && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900">İade Fatura Bilgileri</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İade Fatura No</label>
              <Input
                data-testid="return-invoice-number"
                type="text"
                value={extendedData?.returnInvoiceDetails?.returnInvoiceNumber || ''}
                onChange={(e) => handlers?.handleExtendedFieldChange('returnInvoiceDetails', {
                  ...extendedData?.returnInvoiceDetails,
                  returnInvoiceNumber: e.target.value
                })}
                className="w-full"
                placeholder="İade edilen fatura numarası"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İade Fatura Tarihi</label>
              <DatePicker
                data-testid="return-invoice-date"
                value={extendedData?.returnInvoiceDetails?.returnInvoiceDate ? new Date(extendedData.returnInvoiceDetails.returnInvoiceDate) : null}
                onChange={(date) => handlers?.handleExtendedFieldChange('returnInvoiceDetails', {
                  ...extendedData?.returnInvoiceDetails,
                  returnInvoiceDate: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İade Nedeni</label>
              <Input
                data-testid="return-invoice-reason"
                type="text"
                value={extendedData?.returnInvoiceDetails?.returnReason || ''}
                onChange={(e) => handlers?.handleExtendedFieldChange('returnInvoiceDetails', {
                  ...extendedData?.returnInvoiceDetails,
                  returnReason: e.target.value
                })}
                className="w-full"
                placeholder="İade nedeni"
              />
            </div>
          </div>
        </div>
      )}

      {/* Medical Section */}
      {_showMedicalSection && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">İlaç/Tıbbi Cihaz</h3>
            <Button
              type="button"
              onClick={() => handlers?.setMedicalModalOpen?.(true)}
              variant="default"
              size="sm"
              style={{ backgroundColor: '#9333ea', color: 'white' }}
              className="text-xs px-3 py-1">
              <Pill size={14} className="mr-1" />
              Detaylar
            </Button>
          </div>
          {extendedData?.medicalDeviceData ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={16} />
                <p className="text-xs text-green-800">Tıbbi cihaz bilgileri kaydedildi</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Tıbbi cihaz detaylarını eklemek için butona tıklayın</p>
          )}
        </div>
      )}

      {/* Özel İşlemler */}
      {handlers?.specialOperationsVisible && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Özel İşlemler</h3>
          <div className="space-y-3">
            {/* Tevkifatlı Fatura Uyarısı */}
            {handlers?.isWithholdingType && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-3">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <span className="font-semibold">Tevkifatlı Fatura</span>
                    <br />
                    Bu fatura tipi için tevkifat bilgileri zorunludur. Ürün satırlarında tevkifat kodu ve oranı belirtiniz.
                  </p>
                </div>
                <WithholdingCard
                  value={extendedData?.withholdingData as never}
                  onChange={(data) => handlers?.handleExtendedFieldChange?.('withholdingData', data)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {['earsiv', 'hks', 'sarj', 'sarjanlik', 'yolcu', 'otv', 'hastane', 'sevk'].includes(String(extendedData?.invoiceType || '')) && (
        <InvoiceProfileDetailsCard
          invoiceType={String(extendedData?.invoiceType || '')}
          value={extendedData?.profileDetails as never}
          onChange={(data) => handlers?.handleExtendedFieldChange?.('profileDetails', data)}
        />
      )}

      {/* Açıklama / Notlar — Modern Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Fatura Açıklaması</span>
          </div>
        </div>
        <div className="p-4">
          <Textarea
            value={(extendedData?.notes as string) || ''}
            onChange={(e) => handlers?.handleExtendedFieldChange?.('notes', e.target.value)}
            placeholder="Fatura ile ilgili notlarınızı buraya yazabilirsiniz... (ör. Değişim: Phonak Audeo Paradise P90, Garanti kapsamında)"
            rows={5}
            fullWidth
            className="w-full"
          />
        </div>
      </div>

      {/* Per-line editor in sidebar (opened from product lines) */}
      {activeLineEditor && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">{activeLineEditor?.type === 'withholding' ? 'Tevkifat (Kalem)' : activeLineEditor?.type === 'special' ? 'Özel Matrah (Kalem)' : 'Tıbbi Cihaz (Kalem)'} #{(activeLineEditor?.index ?? 0) + 1}</h3>
            <button data-allow-raw="true" onClick={onCloseLineEditor} className="text-sm text-gray-500">Kapat</button>
          </div>
          <div>
            {activeLineEditor?.type === 'withholding' && activeLineEditor.index !== undefined && extendedData && (
              <WithholdingCard
                value={(extendedData.items as never[])?.[activeLineEditor.index] ? (extendedData.items as Record<string, unknown>[])[activeLineEditor.index]?.withholdingData as never : undefined}
                onChange={(data) => {
                  const items = Array.isArray(extendedData.items) ? [...extendedData.items] : [];
                  items[activeLineEditor.index] = { ...(items[activeLineEditor.index] as Record<string, unknown> || {}), withholdingData: data };
                  handlers?.handleExtendedFieldChange?.('items', items);
                }}
              />
            )}
            {activeLineEditor?.type === 'special' && (
              <div className="text-sm text-gray-600">Özel matrah düzenleyici burada gösterilecek.</div>
            )}
            {activeLineEditor?.type === 'medical' && (
              <div className="text-sm text-gray-600">Tıbbi cihaz düzenleyici burada gösterilecek.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Page Content
function NewInvoicePageContent({
  isSaving,
  handleSubmit,
  handleSaveDraft,
  handleCancel,
  formData,
  documentKind,
  onFormDataChange,
  showSGKSection,
  showGovernmentSection,
  showExportSection,
  showMedicalSection,
  showReturnSection,
  showSpecialBaseSection,
  showSpecialOperations,
  isWithholdingType,
  onRequestLineEditor,
  activeLineEditor,
  onCloseLineEditor,
  isMobile,
  blockingAlert
}: {
  isSaving: boolean;
  handleSubmit: (data: InvoiceFormData) => Promise<void>;
  handleSaveDraft?: () => void;
  handleCancel: () => void;
  formData: InvoiceFormData;
  documentKind: DocumentKind;
  onFormDataChange: (field: string, value: unknown) => void;
  showSGKSection?: boolean;
  showGovernmentSection?: boolean;
  showExportSection?: boolean;
  showMedicalSection?: boolean;
  showReturnSection?: boolean;
  showSpecialBaseSection?: boolean;
  showSpecialOperations?: boolean;
  isWithholdingType?: boolean;
  onRequestLineEditor?: (type: 'withholding' | 'special' | 'medical', index: number) => void;
  activeLineEditor?: ActiveLineEditor | null;
  onCloseLineEditor?: () => void;
  isMobile?: boolean;
  blockingAlert?: BlockingAlert | null;
}) {
  const navigate = useNavigate();
  const [openCustomer, setOpenCustomer] = useState(true);
  const [openDetails, setOpenDetails] = useState(true);
  const [openItems, setOpenItems] = useState(true);
  const [openSGK, setOpenSGK] = useState(true);
  const [openGov, setOpenGov] = useState(true);

  if (isMobile) {
    return (
      <MobileLayout showBottomNav={false} className="bg-gray-50 dark:bg-gray-950">
        <MobileHeader
          title={`Yeni ${getDocumentKindText(documentKind)}`}
          onBack={handleCancel}
          className="top-[64px]"
          actions={
            <Button
              onClick={() => handleSubmit(formData)}
              disabled={isSaving}
              size="sm"
              className="bg-blue-600 text-white font-medium"
            >
              Kaydet
            </Button>
          }
        />

        <div className="p-4 space-y-3 pb-32">
          {blockingAlert && (
            <ErrorMessage
              type="warning"
              title={blockingAlert.title}
              message={blockingAlert.message}
              onRetry={() => navigate({ to: '/settings', search: { tab: 'integration' } })}
              retryText="Fatura Ayarlarına Git"
            />
          )}

          {/* 1. Collapsible: Customer Selection */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button
              data-allow-raw="true"
              type="button"
              onClick={() => setOpenCustomer(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                {(formData.customerFirstName || formData.customerLastName || formData.customerTcNumber) ? (
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                ) : (
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
                )}
                <h3 className="font-bold text-gray-900 dark:text-white">Fatura Alıcısı</h3>
              </div>
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform duration-200${openCustomer ? ' rotate-180' : ''}`}
              />
            </button>
            {openCustomer && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                <CustomerSectionCompact
                  isSGK={showSGKSection}
                  customerId={formData.customerId as string}
                  customerName={formData.customerName as string}
                  customerFirstName={formData.customerFirstName as string}
                  customerLastName={formData.customerLastName as string}
                  customerTaxId={formData.customerTaxId as string}
                  customerTcNumber={formData.customerTcNumber as string}
                  customerTaxNumber={formData.customerTaxNumber as string}
                  customerAddress={formData.customerAddress as string}
                  customerCity={formData.customerCity as string}
                  customerDistrict={formData.customerDistrict as string}
                  onChange={onFormDataChange}
                />
              </div>
            )}
          </div>

          {/* 2. Collapsible: Fatura Detayları */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button
              data-allow-raw="true"
              type="button"
              onClick={() => setOpenDetails(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                {(formData.invoiceType || formData.scenario !== 'other') ? (
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                ) : (
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
                )}
                <h3 className="font-bold text-gray-900 dark:text-white">Fatura Detayları</h3>
              </div>
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform duration-200${openDetails ? ' rotate-180' : ''}`}
              />
            </button>
            {openDetails && (
              <div className="border-t border-gray-100 dark:border-gray-700">
                <InvoiceFormExtended
                  onSubmit={handleSubmit as never}
                  onCancel={handleCancel}
                  isLoading={isSaving}
                  documentKind={documentKind}
                  onDataChange={onFormDataChange}
                  onRequestLineEditor={onRequestLineEditor}
                  initialData={formData}
                  mobileHiddenSections={['items', 'additionalInfo']}
                />
              </div>
            )}
          </div>

          {/* 3. Conditional Sections (SGK, Government, etc.) - Collapsible */}
          <div className="space-y-3">
            {showSGKSection && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                <button
                  data-allow-raw="true"
                  type="button"
                  onClick={() => setOpenSGK(v => !v)}
                  className="w-full flex items-center justify-between p-4 text-left bg-blue-50 dark:bg-blue-900/20"
                >
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">SGK Bilgileri</h3>
                  <ChevronDown size={18} className={`text-blue-400 transition-transform duration-200${openSGK ? ' rotate-180' : ''}`} />
                </button>
                {openSGK && (
                  <div className="p-4 border-t border-blue-100 dark:border-blue-900/30">
                    <SGKInvoiceSection
                      sgkData={formData.sgkData as never}
                      onChange={(data) => onFormDataChange('sgkData', data)}
                    />
                  </div>
                )}
              </div>
            )}

            {showGovernmentSection && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <button
                  data-allow-raw="true"
                  type="button"
                  onClick={() => setOpenGov(v => !v)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <h3 className="font-bold text-gray-900 dark:text-white">Kamu Bilgileri</h3>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200${openGov ? ' rotate-180' : ''}`} />
                </button>
                {openGov && (
                  <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <GovernmentSection
                      formData={formData as never}
                      onChange={onFormDataChange}
                    />
                  </div>
                )}
              </div>
            )}

            {showExportSection && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
                <ExportDetailsCard
                  value={formData.exportDetails as never}
                  onChange={(data) => onFormDataChange('exportDetails', data)}
                />
              </div>
            )}
          </div>

          {/* 4. Collapsible: Ürün ve Hizmetler */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button
              data-allow-raw="true"
              type="button"
              onClick={() => setOpenItems(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                {(formData.items as unknown[])?.length > 0 ? (
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                ) : (
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
                )}
                <h3 className="font-bold text-gray-900 dark:text-white">Ürün ve Hizmetler</h3>
                {(formData.items as unknown[])?.length > 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                    {(formData.items as unknown[]).length} kalem
                  </span>
                )}
              </div>
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform duration-200${openItems ? ' rotate-180' : ''}`}
              />
            </button>
            {openItems && (
              <div className="border-t border-gray-100 dark:border-gray-700">
                <ProductLinesSection
                  lines={(formData.items as never[]) || []}
                  onChange={(lines) => onFormDataChange('items', lines)}
                  invoiceType={formData.invoiceType}
                  scenario={formData.scenario}
                  currency={formData.currency}
                  onCurrencyChange={(c) => onFormDataChange('currency', c)}
                  generalDiscount={formData.totalDiscount as number | string | undefined}
                  onGeneralDiscountChange={(v) => onFormDataChange('totalDiscount', v)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar for Action Buttons on Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom z-[2100]">
          <div className="flex gap-4">
            <Button
              onClick={handleSaveDraft}
              variant="outline"
              className="flex-1 min-h-[48px] rounded-xl border-gray-300"
            >
              Taslak
            </Button>
            <Button
              onClick={() => handleSubmit(formData)}
              disabled={isSaving}
              className="flex-[2] min-h-[48px] rounded-xl bg-blue-600 text-white font-bold"
            >
              {isSaving ? 'Kaydediliyor...' : 'Faturayı Kes'}
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="new-invoice-page min-h-screen bg-gray-50 dark:bg-gray-900 w-full pb-8">
      <div className="px-4 pt-3 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1600px] mx-auto">
          <DesktopPageHeader
            leading={<HeaderBackButton label="Faturalara Dön" onClick={handleCancel} />}
            title={`Yeni ${getDocumentKindText(documentKind)}`}
            description="Fatura bilgilerini doldurun"
            icon={<Pill className="h-6 w-6" />}
            eyebrow={{ tr: 'Belge Oluşturma', en: 'Document Creation' }}
            actions={(
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSaving}
                  className="px-4 py-2"
                >
                  İptal
                </Button>
                <Button
                  data-testid="invoice-save-draft-button"
                  onClick={handleSaveDraft}
                  variant="outline"
                  disabled={isSaving}
                  className="px-4 py-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  Taslak Kaydet
                </Button>
                <Button
                  data-testid="invoice-submit-button"
                  type="button"
                  onClick={() => handleSubmit(formData)}
                  disabled={isSaving}
                  style={{ backgroundColor: '#2563eb', color: 'white' }}
                  className="px-6 py-2 premium-gradient tactile-press text-white shadow-sm"
                >
                  {isSaving ? 'Kaydediliyor...' : 'Fatura Oluştur'}
                </Button>
              </>
            )}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Form - 2/3 width */}
          <div className="min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <InvoiceFormExtended
                  onSubmit={handleSubmit as never}
                  onCancel={handleCancel}
                  isLoading={isSaving}
                  documentKind={documentKind}
                  onDataChange={onFormDataChange}
                onRequestLineEditor={onRequestLineEditor}
                initialData={formData}
                mobileHiddenSections={['notes']}
              />
            </div>
          </div>

          {/* Sidebar - 1/3 proportional */}
          <div className="min-w-0">
            {blockingAlert && (
              <div className="mb-4">
                <ErrorMessage
                  type="warning"
                  title={blockingAlert.title}
                  message={blockingAlert.message}
                  onRetry={() => navigate({ to: '/settings', search: { tab: 'integration' } })}
                  retryText="Firma Ayarlarına Git"
                />
              </div>
            )}
            <InvoiceSidebar
              documentKind={documentKind}
              showSGKSection={showSGKSection}
              showExportSection={showExportSection}
              showMedicalSection={showMedicalSection}
              showSpecialBaseSection={showSpecialBaseSection}
              showReturnSection={showReturnSection}
              showGovernmentSection={showGovernmentSection}
              showIstisnaReason={formData.invoiceType === '13' && formData.scenario !== 'export' && formData.scenario !== 'government'}
              extendedData={formData}
              handlers={{
                handleExtendedFieldChange: onFormDataChange,
                setExportModalOpen: () => { },
                setMedicalModalOpen: () => { },
                specialOperationsVisible: showSpecialOperations,
                isWithholdingType: isWithholdingType
              }}
              activeLineEditor={activeLineEditor || undefined}
              onCloseLineEditor={onCloseLineEditor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewInvoicePage;
