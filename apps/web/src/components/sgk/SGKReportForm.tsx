import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, DatePicker, Card, CardHeader, CardContent } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { Calendar, FileText, User, Stethoscope, Building2, Hash, Save, X } from 'lucide-react';
import { Patient } from '../../types/patient/patient-base.types';
import { SGKDocument, SGKDocumentType, CreateSGKDocumentData } from '../../types/sgk';
import { sgkService } from '../../services/sgk.service';
import { getCurrentUserId } from '@/utils/auth-utils';

interface SGKReportFormProps {
  patient?: Patient;
  onSubmit?: (document: SGKDocument) => void;
  onCancel?: () => void;
  initialData?: Partial<CreateSGKDocumentData>;
  mode?: 'create' | 'edit';
}

const SGK_REPORT_TYPES: Array<{ value: SGKDocumentType; label: string; description: string }> = [
  { value: 'rapor', label: 'İşitme Cihazı Raporu', description: 'Standart işitme cihazı raporu' },
  { value: 'recete', label: 'E-Reçete', description: 'Elektronik reçete belgesi' },
  { value: 'belge', label: 'Genel Belge', description: 'Diğer SGK belgeleri' },
  { value: 'fatura', label: 'Fatura', description: 'SGK fatura belgesi' },
  { value: 'teslim', label: 'Teslim Belgesi', description: 'Cihaz teslim belgesi' },
  { value: 'iade', label: 'İade Belgesi', description: 'Cihaz iade belgesi' }
];

const HEARING_AID_TYPES = [
  { value: 'bte', label: 'BTE (Kulak Arkası)' },
  { value: 'ite', label: 'ITE (Kulak İçi)' },
  { value: 'itc', label: 'ITC (Kanal İçi)' },
  { value: 'cic', label: 'CIC (Tamamen Kanal İçi)' },
  { value: 'ric', label: 'RIC (Alıcı Kanal İçi)' },
  { value: 'cochlear', label: 'Koklear İmplant' },
  { value: 'bone_anchored', label: 'Kemik Ankrajlı' }
];

const REPORT_PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Acil' },
  { value: 'routine', label: 'Rutin' }
];

export const SGKReportForm: React.FC<SGKReportFormProps> = ({
  patient,
  onSubmit,
  onCancel,
  initialData,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState({
    patientId: patient?.id || '',
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
    tcNumber: patient?.tcNumber || '',
    documentType: 'rapor' as SGKDocumentType,
    reportNumber: '',
    reportDate: new Date().toISOString().split('T')[0],
    validityDate: '',
    doctorName: '',
    doctorTitle: 'Dr.',
    hospitalName: '',
    hospitalCode: '',
    diagnosis: '',
    hearingLossLevel: '',
    hearingAidType: '',
    hearingAidSide: 'both' as 'left' | 'right' | 'both',
    reportDetails: '',
    priority: 'normal',
    notes: '',
    ...initialData
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success: showSuccess, error: showError } = useToastHelpers();

  // Auto-generate report number
  useEffect(() => {
    if (mode === 'create' && !formData.reportNumber) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
      setFormData(prev => ({
        ...prev,
        reportNumber: `RPT-${year}${month}${day}-${time}`
      }));
    }
  }, [mode]);

  // Auto-calculate validity date (6 months from report date)
  useEffect(() => {
    if (formData.reportDate) {
      const reportDate = new Date(formData.reportDate);
      const validityDate = new Date(reportDate);
      validityDate.setMonth(validityDate.getMonth() + 6);
      setFormData(prev => ({
        ...prev,
        validityDate: validityDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.reportDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) newErrors.patientId = 'Hasta seçimi zorunludur';
    if (!formData.patientName) newErrors.patientName = 'Hasta adı zorunludur';
    if (!formData.tcNumber) newErrors.tcNumber = 'TC Kimlik No zorunludur';
    if (!formData.reportNumber) newErrors.reportNumber = 'Rapor numarası zorunludur';
    if (!formData.reportDate) newErrors.reportDate = 'Rapor tarihi zorunludur';
    if (!formData.doctorName) newErrors.doctorName = 'Doktor adı zorunludur';
    if (!formData.hospitalName) newErrors.hospitalName = 'Hastane adı zorunludur';
    if (!formData.diagnosis) newErrors.diagnosis = 'Tanı bilgisi zorunludur';

    // TC Number validation
    if (formData.tcNumber && formData.tcNumber.length !== 11) {
      newErrors.tcNumber = 'TC Kimlik No 11 haneli olmalıdır';
    }

    // Report number format validation
    if (formData.reportNumber && !/^RPT-\d{8}-\d{4}$/.test(formData.reportNumber)) {
      newErrors.reportNumber = 'Rapor numarası formatı: RPT-YYYYMMDD-HHMM';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const documentData: CreateSGKDocumentData = {
        patientId: formData.patientId,
        filename: `${formData.reportNumber}.pdf`,
        documentType: formData.documentType,
        extractedInfo: {
          patientName: formData.patientName,
          tcNumber: formData.tcNumber,
          reportNumber: formData.reportNumber,
          reportDate: formData.reportDate,
          validityDate: formData.validityDate,
          doctorName: formData.doctorName,
          hospitalName: formData.hospitalName,
          diagnosis: formData.diagnosis,
          confidence: 1.0,
          extractionMethod: 'manual'
        },
        processingStatus: 'completed',
        uploadedAt: new Date().toISOString(),
        notes: formData.notes,
        uploadedBy: getCurrentUserId()
      };

      const document = await sgkService.createDocument(documentData);
      showSuccess('SGK raporu başarıyla oluşturuldu');
      onSubmit?.(document);
    } catch (error) {
      console.error('Error creating SGK report:', error);
      showError('SGK raporu oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">
              {mode === 'create' ? 'Yeni SGK Raporu Oluştur' : 'SGK Raporu Düzenle'}
            </h2>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Hasta Adı *
              </label>
              <Input
                value={formData.patientName}
                onChange={(e) => handleInputChange('patientName', e.target.value)}
                placeholder="Hasta adı ve soyadı"
                error={errors.patientName}
                disabled={!!patient}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Hash className="h-4 w-4" />
                TC Kimlik No *
              </label>
              <Input
                value={formData.tcNumber}
                onChange={(e) => handleInputChange('tcNumber', e.target.value)}
                placeholder="11 haneli TC kimlik numarası"
                maxLength={11}
                error={errors.tcNumber}
                disabled={!!patient}
              />
            </div>
          </div>

          {/* Report Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Belge Türü *</label>
              <Select
                value={formData.documentType}
                onChange={(e) => handleInputChange('documentType', e.target.value)}
                options={SGK_REPORT_TYPES.map(type => ({
                  value: type.value,
                  label: type.label
                }))}
                error={errors.documentType}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rapor Numarası *</label>
              <Input
                value={formData.reportNumber}
                onChange={(e) => handleInputChange('reportNumber', e.target.value)}
                placeholder="RPT-YYYYMMDD-HHMM"
                error={errors.reportNumber}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Öncelik</label>
              <Select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                options={REPORT_PRIORITIES}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Rapor Tarihi *
              </label>
              <Input
                type="date"
                value={formData.reportDate}
                onChange={(e) => handleInputChange('reportDate', e.target.value)}
                error={errors.reportDate}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Geçerlilik Tarihi
              </label>
              <Input
                type="date"
                value={formData.validityDate}
                onChange={(e) => handleInputChange('validityDate', e.target.value)}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Otomatik olarak 6 ay sonrası hesaplanır</p>
            </div>
          </div>

          {/* Doctor and Hospital Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="h-4 w-4" />
                Doktor Adı *
              </label>
              <div className="flex gap-2">
                <Select
                  value={formData.doctorTitle}
                  onChange={(e) => handleInputChange('doctorTitle', e.target.value)}
                  className="w-20"
                  options={[
                    { value: "Dr.", label: "Dr." },
                    { value: "Prof. Dr.", label: "Prof. Dr." },
                    { value: "Doç. Dr.", label: "Doç. Dr." },
                    { value: "Uzm. Dr.", label: "Uzm. Dr." }
                  ]}
                />
                <Input
                  value={formData.doctorName}
                  onChange={(e) => handleInputChange('doctorName', e.target.value)}
                  placeholder="Doktor adı ve soyadı"
                  error={errors.doctorName}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                Hastane Adı *
              </label>
              <Input
                value={formData.hospitalName}
                onChange={(e) => handleInputChange('hospitalName', e.target.value)}
                placeholder="Hastane/klinik adı"
                error={errors.hospitalName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hastane Kodu</label>
            <Input
              value={formData.hospitalCode}
              onChange={(e) => handleInputChange('hospitalCode', e.target.value)}
              placeholder="SGK hastane kodu (opsiyonel)"
            />
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanı *</label>
              <Textarea
                value={formData.diagnosis}
                onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                placeholder="Hasta tanısı ve durumu"
                rows={3}
                error={errors.diagnosis}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">İşitme Kaybı Seviyesi</label>
                <Select
                  value={formData.hearingLossLevel}
                  onChange={(e) => handleInputChange('hearingLossLevel', e.target.value)}
                  options={[
                    { value: "", label: "Seçiniz" },
                    { value: "hafif", label: "Hafif (26-40 dB)" },
                    { value: "orta", label: "Orta (41-55 dB)" },
                    { value: "orta_ileri", label: "Orta-İleri (56-70 dB)" },
                    { value: "ileri", label: "İleri (71-90 dB)" },
                    { value: "cok_ileri", label: "Çok İleri (91+ dB)" }
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cihaz Türü</label>
                <Select
                  value={formData.hearingAidType}
                  onChange={(e) => handleInputChange('hearingAidType', e.target.value)}
                  options={[
                    { value: "", label: "Seçiniz" },
                    ...HEARING_AID_TYPES
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cihaz Tarafı</label>
                <Select
                  value={formData.hearingAidSide}
                  onChange={(e) => handleInputChange('hearingAidSide', e.target.value)}
                  options={[
                    { value: "left", label: "Sol Kulak" },
                    { value: "right", label: "Sağ Kulak" },
                    { value: "both", label: "Her İki Kulak" }
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rapor Detayları</label>
              <Textarea
                value={formData.reportDetails}
                onChange={(e) => handleInputChange('reportDetails', e.target.value)}
                placeholder="Ek rapor detayları ve açıklamalar"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notlar</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="İç notlar ve açıklamalar"
                rows={2}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                İptal
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Rapor Oluştur' : 'Değişiklikleri Kaydet'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};