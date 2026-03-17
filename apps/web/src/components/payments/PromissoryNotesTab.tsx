import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  DatePicker,
  Checkbox,
  Select,
  Textarea,
  DataTable
} from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import {
  FileText,
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Calendar,
  User,
  MapPin,
  Phone,
  Building,
  Shield,
  AlertTriangle,
  Banknote,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { SaleRead } from '@/api/client/sales.client';
import { getListSalesQueryKey } from '@/api/client/sales.client';
import type { PromissoryNoteRead } from '@/api/generated/schemas';
import {
  getListSalePromissoryNotesQueryKey,
  getListPartyPaymentRecordsQueryKey,
  createPromissoryNotes,
  createPromissoryNoteCollect,
  updatePromissoryNote
} from '@/api/client/payments.client';
import { createPartyTimeline } from '@/api/client/timeline.client';
import { companyService } from '@/services/company.service';
import { useGetParty } from '@/api/client/parties.client';

interface PromissoryNotesTabProps {
  sale: SaleRead;
  promissoryNotes: PromissoryNoteRead[];
  isLoading: boolean;
}

export const PromissoryNotesTab: React.FC<PromissoryNotesTabProps> = ({
  sale,
  promissoryNotes,
  isLoading
}) => {
  const { t } = useTranslation('payments');
  const queryClient = useQueryClient();

  // Fetch party data to get full details
  const { data: partyData } = useGetParty(sale.partyId || '', {
    query: {
      enabled: !!sale.partyId
    }
  });

  // Fetch company info for authorized court
  const [companyCity, setCompanyCity] = useState('İstanbul');

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const companyInfo = await companyService.getCompanyInfo();
        if (companyInfo.companyInfo?.city) {
          setCompanyCity(companyInfo.companyInfo.city);
        }
      } catch (error) {
        console.error('Failed to fetch company info:', error);
      }
    };
    fetchCompanyInfo();
  }, []);

  // Calculate remaining amount from sale
  const remainingAmount = (sale.finalAmount || 0) - (sale.paidAmount || 0);

  // Get party info for defaults
  const party = partyData?.data;
  const partyName = party ? `${party.firstName || ''} ${party.lastName || ''}`.trim() : '';
  const partyAddressObj = party?.address;
  const partyAddress = typeof partyAddressObj === 'string' ? partyAddressObj :
    party?.addressFull ||
    (partyAddressObj as Record<string, unknown> | undefined)?.fullAddress as string ||
    (partyAddressObj as Record<string, unknown> | undefined)?.street as string || '';
  const partyPhone = party?.phone || '';
  const partyTc = party?.tcNumber || party?.identityNumber || '';

  // Calculate default first due date (1 month from today)
  const getDefaultFirstDueDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  };

  // Form state - LEGACY FIELDS with defaults from sale/party
  const [noteCount, setNoteCount] = useState(1);
  const [totalAmount, setTotalAmount] = useState(remainingAmount > 0 ? remainingAmount : 0);
  const [authorizedCourt, setAuthorizedCourt] = useState(`${companyCity} (Çağlayan)`);
  const [issueDate, setIssueDate] = useState<Date | null>(new Date());
  const [firstDueDate, setFirstDueDate] = useState<Date | null>(getDefaultFirstDueDate());

  // Update authorized court when company city changes
  useEffect(() => {
    setAuthorizedCourt(`${companyCity} (Çağlayan)`);
  }, [companyCity]);

  // Installment plan preview
  const [installments, setInstallments] = useState<Array<{ amount: number, dueDate: string }>>([]);
  const [showInstallmentPreview, setShowInstallmentPreview] = useState(false);

  // Debtor info - defaults from party
  const [debtorName, setDebtorName] = useState('');
  const [debtorTc, setDebtorTc] = useState('');
  const [debtorAddress, setDebtorAddress] = useState('');
  const [debtorTaxOffice, setDebtorTaxOffice] = useState('OSMANGAZİ');
  const [debtorPhone, setDebtorPhone] = useState('');

  // Update debtor info when party data loads
  useEffect(() => {
    if (party) {
      setDebtorName(partyName);
      setDebtorTc(partyTc);
      setDebtorAddress(partyAddress);
      setDebtorPhone(partyPhone);
    }
  }, [party, partyName, partyTc, partyAddress, partyPhone]);

  // Guarantor info
  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorTc, setGuarantorTc] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');

  // Collection modal
  const [collectModal, setCollectModal] = useState<{
    isOpen: boolean;
    note: PromissoryNoteRead | null;
    amount: number;
    date: string;
    paymentMethod: string;
    notes: string;
  }>({
    isOpen: false,
    note: null,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    notes: ''
  });

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    noteId: string | null;
    noteNumber: number | null;
  }>({
    isOpen: false,
    noteId: null,
    noteNumber: null
  });

  // Collapsible sections
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(true);

  // Helper: Log to timeline
  const logToTimeline = async (eventType: string, title: string, description: string, details: Record<string, unknown> = {}) => {
    try {
      await createPartyTimeline(sale.partyId!, {
        type: eventType,
        title,
        description,
        details,
        user: 'current_user',
        icon: 'fa-file-invoice',
        color: 'blue',
        category: 'document'
      });
      console.log('✅ Timeline event logged:', title);
    } catch (error) {
      console.error('❌ Failed to log timeline event:', error);
    }
  };

  // Auto-generate installment plan when note count or total changes
  useEffect(() => {
    if (noteCount > 0 && totalAmount > 0 && firstDueDate) {
      const amountPerNote = totalAmount / noteCount;
      const newInstallments = [];

      for (let i = 0; i < noteCount; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        newInstallments.push({
          amount: parseFloat(amountPerNote.toFixed(2)),
          dueDate: dueDate.toISOString().split('T')[0]
        });
      }

      setInstallments(newInstallments);
      setShowInstallmentPreview(true);
    } else {
      setShowInstallmentPreview(false);
    }
  }, [noteCount, totalAmount, firstDueDate]);

  const updateInstallmentAmount = (index: number, amount: number) => {
    const newInstallments = [...installments];
    newInstallments[index].amount = amount;
    setInstallments(newInstallments);

    // Don't update total automatically - just let user edit freely
  };

  const updateInstallmentDate = (index: number, date: Date | null) => {
    if (!date) return;
    const newInstallments = [...installments];
    newInstallments[index].dueDate = date.toISOString().split('T')[0];
    setInstallments(newInstallments);
  };

  const autoFillInstallments = () => {
    if (noteCount > 0 && totalAmount > 0) {
      const amountPerNote = totalAmount / noteCount;
      const newInstallments = installments.map(inst => ({
        ...inst,
        amount: parseFloat(amountPerNote.toFixed(2))
      }));
      setInstallments(newInstallments);
    }
  };

  const handleCreateNotes = async () => {
    // Validation
    if (noteCount <= 0 || noteCount > 24) {
      toast.error(t('promissory.noteCountError', 'Senet sayısı 1-24 arasında olmalıdır'));
      return;
    }

    if (totalAmount <= 0) {
      toast.error(t('promissory.totalAmountError', 'Toplam tutar 0\'dan büyük olmalıdır'));
      return;
    }

    if (!firstDueDate) {
      toast.error(t('promissory.dueDateRequired', 'İlk vade tarihi seçilmelidir'));
      return;
    }

    if (!debtorName) {
      toast.error(t('promissory.debtorNameRequired', 'Borçlu adı girilmelidir'));
      return;
    }

    if (!debtorTc || debtorTc.length !== 11) {
      toast.error(t('promissory.invalidTcNumber', 'Geçerli bir TC kimlik numarası girilmelidir'));
      return;
    }

    if (hasGuarantor && (!guarantorName || !guarantorTc)) {
      toast.error(t('promissory.guarantorInfoMissing', 'Kefil bilgileri eksik'));
      return;
    }

    try {
      const notes = installments.map((inst, index) => ({
        noteNumber: index + 1,
        amount: inst.amount,
        issueDate: issueDate ? issueDate.toISOString() : new Date().toISOString(),
        dueDate: new Date(inst.dueDate).toISOString(),
        debtorName,
        debtorTc,
        debtorAddress,
        debtorTaxOffice,
        debtorPhone,
        hasGuarantor,
        guarantorName: hasGuarantor ? guarantorName : '',
        guarantorTc: hasGuarantor ? guarantorTc : '',
        guarantorAddress: hasGuarantor ? guarantorAddress : '',
        guarantorPhone: hasGuarantor ? guarantorPhone : '',
        authorizedCourt,
        fileName: `Senet-${debtorName}-${index + 1}.pdf`
      }));

      await createPromissoryNotes({
        partyId: sale.partyId!,
        saleId: sale.id,
        totalAmount,
        notes
      });

      await queryClient.invalidateQueries({
        queryKey: getListSalePromissoryNotesQueryKey(sale.id!)
      });

      // Log to timeline
      await logToTimeline(
        'promissory_note_created',
        t('promissory.created', 'Senet Oluşturuldu'),
        `${noteCount} ${t('promissory.notesCreatedDesc', 'adet senet oluşturuldu. Toplam tutar')}: ${formatCurrency(totalAmount)}`,
        {
          noteCount,
          totalAmount,
          debtorName,
          authorizedCourt,
          saleId: sale.id
        }
      );

      toast.success(t('promissory.createdSuccess', '{{count}} adet senet başarıyla oluşturuldu', { count: noteCount }));

      // Reset form
      setNoteCount(1);
      setTotalAmount(0);
      setFirstDueDate(getDefaultFirstDueDate());
      setInstallments([]);
      setShowInstallmentPreview(false);
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        t('promissory.createError', 'Senet oluşturulurken hata oluştu');
      toast.error(errorMessage);
    }
  };

  const openCollectModal = (note: PromissoryNoteRead) => {
    setCollectModal({
      isOpen: true,
      note,
      amount: note.amount - (note.paidAmount || 0),
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      notes: ''
    });
  };

  const handleCollect = async () => {
    if (!collectModal.note) return;

    if (collectModal.amount <= 0) {
      toast.error('Tahsilat tutarı 0\'dan büyük olmalıdır');
      return;
    }

    const remainingAmount = collectModal.note.amount - (collectModal.note.paidAmount || 0);
    if (collectModal.amount > remainingAmount) {
      toast.error('Tahsilat tutarı kalan tutardan fazla olamaz');
      return;
    }

    try {
      await createPromissoryNoteCollect(collectModal.note.id, {
        amount: collectModal.amount,
        paymentDate: collectModal.date,
        paymentMethod: collectModal.paymentMethod,
        notes: collectModal.notes
      });

      // Invalidate promissory notes query
      await queryClient.invalidateQueries({
        queryKey: getListSalePromissoryNotesQueryKey(sale.id!)
      });

      // Invalidate payment records query to show collected payment in Ödeme Takibi tab
      await queryClient.invalidateQueries({
        queryKey: getListPartyPaymentRecordsQueryKey(sale.partyId)
      });
      // Invalidate sales list so paidAmount column updates immediately in SalesPage
      await queryClient.invalidateQueries({
        queryKey: getListSalesQueryKey()
      });

      // Log to timeline
      await logToTimeline(
        'promissory_note_collected',
        'Senet Tahsilatı',
        `Senet #${collectModal.note.noteNumber} için ${formatCurrency(collectModal.amount)} tahsil edildi`,
        {
          noteId: collectModal.note.id,
          noteNumber: collectModal.note.noteNumber,
          amount: collectModal.amount,
          paymentMethod: collectModal.paymentMethod,
          saleId: sale.id
        }
      );

      toast.success('Tahsilat başarıyla kaydedildi');

      // Close modal after successful collection
      setCollectModal({
        isOpen: false,
        note: null,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        notes: ''
      });
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Tahsilat kaydedilirken hata oluştu';
      toast.error(errorMessage);
    }
  };

  const handleCancelNote = async (noteId: string) => {
    const note = promissoryNotes.find(n => n.id === noteId);
    if (!note) return;

    setDeleteModal({
      isOpen: true,
      noteId,
      noteNumber: note.noteNumber
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.noteId) return;

    try {
      await updatePromissoryNote(deleteModal.noteId!, {
        status: 'cancelled'
      });

      await queryClient.invalidateQueries({
        queryKey: getListSalePromissoryNotesQueryKey(sale.id!)
      });

      // Log to timeline
      await logToTimeline(
        'promissory_note_cancelled',
        'Senet İptal Edildi',
        `Senet #${deleteModal.noteNumber} iptal edildi`,
        {
          noteId: deleteModal.noteId,
          noteNumber: deleteModal.noteNumber,
          saleId: sale.id
        }
      );

      toast.success('Senet başarıyla iptal edildi');

      setDeleteModal({
        isOpen: false,
        noteId: null,
        noteNumber: null
      });
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Senet iptal edilirken hata oluştu';
      toast.error(errorMessage);
    }
  };

  const handleDownloadPDF = (noteId: string) => {
    const note = promissoryNotes.find(n => n.id === noteId);
    if (!note) {
      toast.error('Senet bulunamadı');
      return;
    }

    // Get all notes for this sale to generate complete document with muacceliyet
    const allNotes = promissoryNotes.filter(n => n.saleId === sale.id);

    const creditorName = 'ÖZMEN TIBBİ CİHAZLAR İÇ VE DIŞ TİCARET SANAYİ LİMİTED ŞİRKETİ';

    // Generate complete HTML with muacceliyet agreement
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Senet ve Muacceliyet Sözleşmesi - ${note.debtorName || ''}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; margin: 0; padding: 0; }
          .page { page-break-after: always; padding: 20px; }
          .contract-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 20px 0; }
          .contract-date { text-align: left; margin-bottom: 20px; }
          .contract-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
          .contract-table th, .contract-table td { border: 1px solid #000; padding: 8px; text-align: center; }
          .contract-table th { background-color: #f0f0f0; font-weight: bold; }
          .contract-text { text-align: justify; line-height: 1.8; margin: 15px 0; }
          .contract-signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .signature-box { text-align: center; }
          .note { border: 2px solid #000; padding: 10px; margin-bottom: 10px; height: 125mm; position: relative; box-sizing: border-box; }
          .note:last-child { margin-bottom: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; font-weight: bold; font-size: 10pt; }
          .header-item { text-align: center; }
          .amount-box { display: inline-block; border: 1px solid #000; padding: 2px 8px; margin: 0 2px; min-width: 70px; text-align: center; font-size: 10pt; }
          .content { text-align: justify; margin: 10px 0; line-height: 1.4; font-size: 10pt; }
          .signature-section { margin-top: 15px; }
          .signature-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 9pt; }
          .signature-field { flex: 1; }
          .signature-label { font-weight: bold; margin-right: 8px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .page-break { page-break-after: always; } }
        </style>
      </head>
      <body>
    `;

    // Muacceliyet ve Yetki Sözleşmesi (First Page)
    const totalAmount = allNotes.reduce((sum, n) => sum + (n.amount || 0), 0);
    const authorizedCourt = note.authorizedCourt || 'İstanbul (Çağlayan)';
    const issueDate = note.issueDate || new Date().toISOString();

    html += `
      <div class="page">
        <div class="contract-date">${formatDate(issueDate)}</div>
        <div class="contract-title">MUACCELİYET ve YETKİ SÖZLEŞMESİ</div>
        <div class="contract-text">Taraflar aşağıdaki hususlarda anlaşmışlardır.</div>
        
        <table class="contract-table">
          <thead>
            <tr>
              <th>SENET NO</th>
              <th>TANZİM TARİHİ</th>
              <th>ALACAKLI</th>
              <th>BORÇLU</th>
              <th>VADE</th>
              <th>TUTAR</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Senet listesi tablosu
    allNotes.forEach((n) => {
      const nIssueDate = n.issueDate || new Date().toISOString();
      const nDueDate = n.dueDate || '';
      html += `
            <tr>
              <td>${n.noteNumber || 1}</td>
              <td>${formatDate(nIssueDate)}</td>
              <td>${creditorName}</td>
              <td>${n.debtorName || ''}</td>
              <td>${formatDate(nDueDate)}</td>
              <td>${(n.amount || 0).toFixed(2)} TL</td>
            </tr>
      `;
    });

    html += `
            <tr style="font-weight: bold;">
              <td colspan="2">TOPLAM</td>
              <td>${creditorName}</td>
              <td>${note.debtorName || ''}</td>
              <td></td>
              <td>${totalAmount.toFixed(2)} TL</td>
            </tr>
          </tbody>
        </table>
        
        <div class="contract-text">
          İş bu muacceliyet sözleşmesinin tarafları yukarıda yazılı bulunan senetlerden herhangi birinin 
          vadesinde ödenmemesi halinde vadesi gelmemiş diğer senetlerin de herhangi bir hükme, ihbara ve 
          ihtara gerek kalmaksızın muacceliyet kesbedeceğini kabul beyan ve taahhüt etmişlerdir.
        </div>
        
        <div class="contract-text">
          Taraflar ayrıca, vadesi geçen senet sonrasında vadesi henüz gelmeyen senetler muacceliyet 
          kesbedeceğinden tüm senetlerle ilgili olarak Alacaklı tarafın icra takibi ve ihtiyati haciz 
          başta olmak üzere her türlü yasal işlem başlatabileceğini de kabul, beyan ve taahhüt ederler. 
          Ayrıca yukarıda dökümü yapılan senetler ve muacceliyet sözleşmesi ile ilgili olarak 
          <strong>${authorizedCourt}</strong> İcra Daireleri ile Mahkemelerinin yetkili olduğu 
          taraflarca şimdiden kabul beyan ve taahhüt edilmiştir.
        </div>
        
        <div class="contract-text">
          Taraflar yukarıdaki şartlar dahilinde hazırlanan sözleşmeyi okuduklarını, hür ve gerçek 
          iradelerine uygun olduğunu tespit ettikten sonra sözleşmeyi birlikte imza altına almıştır.
        </div>
        
        <div class="contract-signatures">
          <div class="signature-box">
            <div>Alacaklı</div>
            <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 5px;">
              ${creditorName}
            </div>
          </div>
          <div class="signature-box">
            <div>Borçlu</div>
            <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 5px;">
              ${note.debtorName || ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Generate notes (2 per page)
    allNotes.forEach((n, index: number) => {
      const lira = Math.floor(n.amount || 0);
      const kurus = Math.round(((n.amount || 0) - lira) * 100);
      const amountText = numberToText(lira) + ' TÜRKLİRASI';
      const nIssueDate = n.issueDate || new Date().toISOString();
      const nDueDate = n.dueDate || '';

      // Start new page every 2 notes
      if (index % 2 === 0) {
        if (index > 0) html += '</div>'; // Close previous page
        html += '<div class="page">';
      }

      html += `
      <div class="note">
        <div class="header">
          <div class="header-item">
            <div>TEDİYE TARİHİ</div>
            <div>${formatDate(nDueDate)}</div>
          </div>
          <div class="header-item">
            <div>TÜRK LİRASI</div>
            <div class="amount-box">${lira.toLocaleString('tr-TR')}</div>
          </div>
          <div class="header-item">
            <div>KURUŞ</div>
            <div class="amount-box">${kurus.toString().padStart(2, '0')}</div>
          </div>
          <div class="header-item">
            <div>NO</div>
            <div class="amount-box">${n.noteNumber || 1}</div>
          </div>
        </div>
        
        <div class="content">
          İş bu emre muharrer senedimin mukabilinde ${formatDate(nDueDate)} tarihinde 
          <strong>${creditorName}</strong> veya 
          emrühavalesine yukarıda yazılı yalnız <strong>${amountText}</strong> 'yı kayıtsız şartsız ödeyeceğim. 
          Bedeli malen ahzolunmuştur. İş bu bono vadesinde ödenmediği taktirde, müteakip bonoların da 
          muacceliyet kesbedeceğini, ihtilaf vukuunda <strong>${authorizedCourt}</strong> mahkeme ve icralarının 
          selahiyetini şimdiden kabul eylerim.
        </div>
        
        <div class="signature-section">
          <div class="signature-row">
            <div class="signature-field">
              <span class="signature-label">İsim:</span> ${n.debtorName || ''}
            </div>
            <div class="signature-field" style="text-align: right;">
              <span class="signature-label">Düzenleme Tarihi:</span> ${formatDate(nIssueDate)}
            </div>
          </div>
          <div class="signature-row">
            <div class="signature-field">
              <span class="signature-label">Adres:</span> ${n.debtorAddress || ''}
            </div>
          </div>
          <div class="signature-row">
            <div class="signature-field">
              <span class="signature-label">T.C. Kimlik No:</span> ${n.debtorTc || ''}
            </div>
            <div class="signature-field">
              <span class="signature-label">V.D:</span> ${n.debtorTaxOffice || 'OSMANGAZİ'}
            </div>
          </div>
          ${n.debtorPhone ? `<div class="signature-row"><div class="signature-field"><span class="signature-label">Telefon:</span> ${n.debtorPhone}</div></div>` : ''}
          
          ${n.hasGuarantor ? `
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ccc;">
            <div class="signature-row">
              <div class="signature-field">
                <span class="signature-label">Kefil Adı-Soyadı:</span> ${n.guarantorName || ''}
              </div>
              <div class="signature-field" style="text-align: right;">
                <span class="signature-label">İmza:</span> _______________
              </div>
            </div>
            <div class="signature-row">
              <div class="signature-field">
                <span class="signature-label">Adres:</span> ${n.guarantorAddress || ''}
              </div>
            </div>
            <div class="signature-row">
              <div class="signature-field">
                <span class="signature-label">T.C. Kimlik No:</span> ${n.guarantorTc || ''}
              </div>
            </div>
            ${n.guarantorPhone ? `<div class="signature-row"><div class="signature-field"><span class="signature-label">Telefon:</span> ${n.guarantorPhone}</div></div>` : ''}
          </div>
          ` : ''}
          
          <div style="margin-top: 25px; text-align: right;">
            <span class="signature-label">Borçlu İmza:</span> _______________
          </div>
        </div>
      </div>
      `;
    });

    html += `
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 250);
      };

      // Log to timeline
      logToTimeline(
        'promissory_note_downloaded',
        'Senet PDF İndirildi',
        `Senet #${note.noteNumber} PDF olarak indirildi`,
        {
          noteId: note.id,
          noteNumber: note.noteNumber,
          saleId: sale.id
        }
      );

      toast.success('PDF yazdırma penceresi açıldı');
    }
  };

  const numberToText = (num: number): string => {
    const ones = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
    const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
    const hundreds = ['', 'YÜZ', 'İKİYÜZ', 'ÜÇYÜZ', 'DÖRTYÜZ', 'BEŞYÜZ', 'ALTIYÜZ', 'YEDİYÜZ', 'SEKİZYÜZ', 'DOKUZYÜZ'];

    if (num === 0) return 'SIFIR';
    if (num < 10) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return hundreds[Math.floor(num / 100)] + (num % 100 ? ' ' + numberToText(num % 100) : '');
    if (num < 1000000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return (thousands === 1 ? 'BİN' : numberToText(thousands) + ' BİN') + (remainder ? ' ' + numberToText(remainder) : '');
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('tr-TR');
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    const statusConfig = {
      active: { color: 'bg-primary/10 text-blue-800', label: 'Aktif', icon: Clock },
      paid: { color: 'bg-success/10 text-success', label: 'Ödendi', icon: CheckCircle },
      partial: { color: 'bg-warning/10 text-yellow-800', label: 'Kısmi', icon: Clock },
      overdue: { color: 'bg-destructive/10 text-red-800', label: 'Gecikmiş', icon: Clock },
      cancelled: { color: 'bg-muted text-foreground', label: 'İptal', icon: XCircle }
    };

    const config = statusConfig[(status || 'active') as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-xs px-2 py-1 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const promissoryColumns: Column<PromissoryNoteRead>[] = [
    {
      key: 'noteNumber',
      title: 'Senet No',
      render: (_: unknown, note: PromissoryNoteRead) => (
        <span className="text-sm font-medium text-foreground">{note.noteNumber}</span>
      ),
    },
    {
      key: '_amount',
      title: 'Tutar',
      render: (_: unknown, note: PromissoryNoteRead) => (
        <div className="text-sm font-semibold text-foreground">
          {formatCurrency(note.amount)}
          {note.paidAmount && note.paidAmount > 0 && (
            <div className="text-xs text-success">
              Ödenen: {formatCurrency(note.paidAmount)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: '_dueDate',
      title: 'Vade Tarihi',
      render: (_: unknown, note: PromissoryNoteRead) => (
        <span className="text-sm text-muted-foreground">{formatDate(note.dueDate)}</span>
      ),
    },
    {
      key: '_status',
      title: 'Durum',
      render: (_: unknown, note: PromissoryNoteRead) => getStatusBadge(note.status),
    },
    {
      key: '_paidDate',
      title: 'Ödeme Tarihi',
      render: (_: unknown, note: PromissoryNoteRead) => (
        <span className="text-sm text-muted-foreground">{note.paidDate ? formatDate(note.paidDate) : '-'}</span>
      ),
    },
    {
      key: '_actions',
      title: 'İşlemler',
      align: 'right',
      render: (_: unknown, note: PromissoryNoteRead) => (
        <div className="flex items-center justify-end gap-2">
          {note.status === 'active' && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                openCollectModal(note);
              }}
              className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
            >
              <Banknote className="w-4 h-4 mr-1" />
              Tahsil Et
            </Button>
          )}
          {note.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelNote(note.id);
              }}
              title="İptal Et"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Yeni Senet Oluştur Formu - LEGACY STYLE - COLLAPSIBLE */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setIsCreateFormOpen(!isCreateFormOpen)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Senet Oluştur
            </div>
            {isCreateFormOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {isCreateFormOpen && (
          <CardContent>
            <div className="bg-primary/10 border border-blue-200 rounded-2xl p-4 mb-6">
              <p className="text-sm text-blue-800 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Bu form ile resmi senet oluşturabilirsiniz. Bilgileri kontrol edip düzenleyebilirsiniz.
                Bir sayfada 2 senet oluşturulacaktır.
              </p>
            </div>

            {/* Senet Bilgileri */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="w-full">
                  <Label className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-primary" />
                    Senet Sayısı <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={noteCount}
                    onChange={(e) => setNoteCount(parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    placeholder="1-24 arası"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maksimum 24 senet oluşturabilirsiniz</p>
                </div>

                <div className="w-full">
                  <Label className="flex items-center">
                    <Banknote className="w-4 h-4 mr-2 text-success" />
                    Toplam Tutar (TL) <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalAmount === 0 ? '' : totalAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTotalAmount(val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Kalan tutar: {formatCurrency(remainingAmount)}</p>
                </div>

                <div className="w-full">
                  <Label className="flex items-center">
                    <Building className="w-4 h-4 mr-2 text-purple-600" />
                    Yetkili Mahkeme <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    value={authorizedCourt}
                    onChange={(e) => setAuthorizedCourt(e.target.value)}
                    placeholder="İstanbul (Çağlayan)"
                  />
                </div>
              </div>

              {/* Tarihler */}
              <div className="border-t border-border pt-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  Tarihler
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="w-full">
                    <Label className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-primary" />
                      Düzenlenme Tarihi <span className="text-destructive ml-1">*</span>
                    </Label>
                    <DatePicker
                      value={issueDate}
                      onChange={(date) => setIssueDate(date)}
                      placeholder="Düzenlenme tarihi seçin"
                      fullWidth
                    />
                  </div>

                  <div className="w-full">
                    <Label className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-success" />
                      İlk Vade Tarihi <span className="text-destructive ml-1">*</span>
                    </Label>
                    <DatePicker
                      value={firstDueDate}
                      onChange={(date) => setFirstDueDate(date)}
                      placeholder="İlk vade tarihi seçin"
                      fullWidth
                    />
                    <p className="text-xs text-muted-foreground mt-1">İlk vade tarihi, düzenlenme tarihinden en az 1 gün sonra olmalıdır.</p>
                  </div>
                </div>
              </div>

              {/* Taksit Planı Önizleme */}
              {showInstallmentPreview && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Taksit Planı</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={autoFillInstallments}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Otomatik Doldur
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {installments.map((inst, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 bg-muted p-3 rounded-2xl items-center">
                        <span className="col-span-2 font-medium text-foreground">Taksit {index + 1}:</span>
                        <div className="col-span-5 flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={inst.amount}
                            onChange={(e) => updateInstallmentAmount(index, parseFloat(e.target.value) || 0)}
                            className="flex-1"
                          />
                          <span className="text-muted-foreground text-sm">TL</span>
                        </div>
                        <div className="col-span-5">
                          <DatePicker
                            value={inst.dueDate ? new Date(inst.dueDate) : null}
                            onChange={(date) => updateInstallmentDate(index, date)}
                            placeholder="Vade tarihi"
                            fullWidth
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Taksitler Toplamı:</span>
                      <span className={`font-bold text-lg ${installments.reduce((sum, inst) => sum + inst.amount, 0) > totalAmount
                        ? 'text-destructive'
                        : 'text-primary'
                        }`}>
                        {formatCurrency(installments.reduce((sum, inst) => sum + inst.amount, 0))}
                      </span>
                    </div>
                    {installments.reduce((sum, inst) => sum + inst.amount, 0) > totalAmount && (
                      <div className="mt-2 p-3 bg-warning/10 border border-yellow-200 rounded-2xl flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <strong>Uyarı:</strong> Taksitlerin toplamı ({formatCurrency(installments.reduce((sum, inst) => sum + inst.amount, 0))})
                          belirlenen toplam tutarı ({formatCurrency(totalAmount)}) geçiyor.
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between items-center text-sm text-muted-foreground">
                      <span>Belirlenen Toplam Tutar:</span>
                      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Borçlu Bilgileri */}
              <div className="border-t border-border pt-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary" />
                  Borçlu Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="w-full">
                    <Label>Ad Soyad <span className="text-destructive">*</span></Label>
                    <Input
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      placeholder="Borçlu adı soyadı"
                    />
                  </div>
                  <div className="w-full">
                    <Label>T.C. Kimlik No <span className="text-destructive">*</span></Label>
                    <Input
                      value={debtorTc}
                      onChange={(e) => setDebtorTc(e.target.value)}
                      maxLength={11}
                      placeholder="11 haneli TC no"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 w-full">
                    <Label className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-destructive" />
                      Adres <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Textarea
                      value={debtorAddress}
                      onChange={(e) => setDebtorAddress(e.target.value)}
                      rows={2}
                      className="w-full"
                      placeholder="Borçlu adresi"
                    />
                  </div>
                  <div className="w-full">
                    <Label className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-purple-600" />
                      Vergi Dairesi <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      value={debtorTaxOffice}
                      onChange={(e) => setDebtorTaxOffice(e.target.value)}
                      placeholder="Vergi dairesi"
                    />
                  </div>
                  <div className="w-full">
                    <Label className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-success" />
                      Telefon <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      value={debtorPhone}
                      onChange={(e) => setDebtorPhone(e.target.value)}
                      placeholder="5XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Kefil Bilgileri (Opsiyonel) */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-orange-600" />
                    <Checkbox
                      id="hasGuarantor"
                      checked={hasGuarantor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasGuarantor(e.target.checked)}
                      label="Kefil Ekle"
                    />
                  </div>
                </div>

                {hasGuarantor && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="w-full">
                      <Label>Kefil Ad Soyad</Label>
                      <Input
                        value={guarantorName}
                        onChange={(e) => setGuarantorName(e.target.value)}
                        placeholder="Kefil adı soyadı"
                      />
                    </div>
                    <div className="w-full">
                      <Label>Kefil T.C. Kimlik No</Label>
                      <Input
                        value={guarantorTc}
                        onChange={(e) => setGuarantorTc(e.target.value)}
                        maxLength={11}
                        placeholder="11 haneli TC no"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 w-full">
                      <Label className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-destructive" />
                        Kefil Adres
                      </Label>
                      <Textarea
                        value={guarantorAddress}
                        onChange={(e) => setGuarantorAddress(e.target.value)}
                        rows={2}
                        className="w-full"
                        placeholder="Kefil adresi"
                      />
                    </div>
                    <div className="w-full">
                      <Label className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-success" />
                        Kefil Telefon
                      </Label>
                      <Input
                        value={guarantorPhone}
                        onChange={(e) => setGuarantorPhone(e.target.value)}
                        placeholder="5XXXXXXXXX"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  onClick={handleCreateNotes}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-2"
                >
                  {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                  <Download className="w-4 h-4 mr-2" />
                  Senet Oluştur ve İndir
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Senet Listesi - COLLAPSIBLE */}
      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setIsListOpen(!isListOpen)}
        >
          <CardTitle className="flex items-center gap-2">
            Senet Listesi
            {isListOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </CardTitle>
          {promissoryNotes.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                // Download first note which will include all notes
                if (promissoryNotes[0]) {
                  handleDownloadPDF(promissoryNotes[0].id);
                }
              }}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tüm Senetleri İndir
            </Button>
          )}
        </CardHeader>
        {isListOpen && (
          <CardContent>
            <DataTable<PromissoryNoteRead>
              data={promissoryNotes}
              columns={promissoryColumns}
              rowKey={(note) => note.id}
              loading={isLoading}
              emptyText="Henüz senet bulunmuyor"
            />
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Senet İptal Et
                </h3>
                <p className="text-sm text-muted-foreground">
                  Senet #{deleteModal.noteNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Bu senedi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ isOpen: false, noteId: null, noteNumber: null })}
                className="flex-1"
              >
                Vazgeç
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                İptal Et
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tahsilat Modal */}
      {collectModal.isOpen && collectModal.note && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-foreground mb-4">
              Senet Tahsilatı - #{collectModal.note.noteNumber}
            </h3>

            <div className="space-y-4">
              <div className="bg-primary/10 border border-blue-200 rounded-2xl p-3">
                <div className="text-sm text-blue-800">
                  <div>Senet Tutarı: {formatCurrency(collectModal.note.amount)}</div>
                  {collectModal.note.paidAmount && collectModal.note.paidAmount > 0 && (
                    <div>Ödenen: {formatCurrency(collectModal.note.paidAmount)}</div>
                  )}
                  <div className="font-semibold">
                    Kalan: {formatCurrency(collectModal.note.amount - (collectModal.note.paidAmount || 0))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label>Tahsilat Tutarı *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={collectModal.amount === 0 ? '' : collectModal.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCollectModal(prev => ({
                        ...prev,
                        amount: val === '' ? 0 : parseFloat(val) || 0
                      }));
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="w-full">
                  <Label>Tahsilat Tarihi *</Label>
                  <DatePicker
                    value={collectModal.date ? new Date(collectModal.date) : null}
                    onChange={(date) => setCollectModal(prev => ({
                      ...prev,
                      date: date ? date.toISOString().split('T')[0] : ''
                    }))}
                    placeholder="Tahsilat tarihi seçin"
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <Label>Ödeme Yöntemi *</Label>
                <Select
                  value={collectModal.paymentMethod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCollectModal(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  options={[
                    { value: 'cash', label: 'Nakit' },
                    { value: 'card', label: 'Kredi Kartı' },
                    { value: 'bank_transfer', label: 'Havale' },
                    { value: 'check', label: 'Çek' }
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <Label>Notlar</Label>
                <Input
                  value={collectModal.notes}
                  onChange={(e) => setCollectModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Tahsilat notları"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCollectModal(prev => ({ ...prev, isOpen: false, note: null }))}
                  className="flex-1"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleCollect}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                  Tahsil Et
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
