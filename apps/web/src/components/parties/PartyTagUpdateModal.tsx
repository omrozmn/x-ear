import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { PenSettings } from 'lucide-react';
import type { Party, PartyStatus, PartySegment } from '../../types/party/party-base.types';
import { useListBranches } from '../../api/generated/branches/branches';
import { unwrapArray } from '../../utils/response-unwrap';
import { BranchRead } from '../../api/generated/schemas';

interface PartyTagUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onUpdate: (partyId: string, updates: {
    status?: PartyStatus;
    segment?: PartySegment;
    acquisitionType?: string;
    branchId?: string;
  }) => Promise<void>;
}

export function PartyTagUpdateModal({
  isOpen,
  onClose,
  party,
  onUpdate
}: PartyTagUpdateModalProps) {
  const [status, setStatus] = useState<PartyStatus>('ACTIVE');
  const [segment, setSegment] = useState<PartySegment>('NEW');
  const [acquisitionType, setAcquisitionType] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch branches dynamically
  const { data: branchesResponse } = useListBranches();
  const allBranches = unwrapArray<BranchRead>(branchesResponse) || [];

  // Filter branches by party's tenant_id (for super admin viewing different tenants)
  const partyTenantId = 'tenantId' in (party || {}) ? (party as { tenantId?: string }).tenantId : undefined;

  console.log('[PartyTagUpdateModal] Party tenantId:', partyTenantId);
  console.log('[PartyTagUpdateModal] All branches:', allBranches.map(b => ({ id: b.id, name: b.name, tenantId: b.tenantId })));

  // Only filter if partyTenantId exists, otherwise show all (for normal users their branches are already filtered by backend)
  const branches = partyTenantId
    ? allBranches.filter(b => b.tenantId === partyTenantId)
    : allBranches;

  console.log('[PartyTagUpdateModal] Filtered branches:', branches.map(b => ({ id: b.id, name: b.name })));

  useEffect(() => {
    if (party) {
      // Normalize status to lowercase for select value matching
      const partyStatus = (party.status || 'active').toString().toLowerCase();
      setStatus(partyStatus as PartyStatus);

      // Normalize segment to lowercase
      const partySegment = (party.segment || 'new').toString().toLowerCase();
      setSegment(partySegment as PartySegment);

      setAcquisitionType(party.acquisitionType || '');

      // Set branchId from party data - ensure it's a string
      const currentBranchId = 'branchId' in party ? String((party as { branchId?: string }).branchId || '') : '';
      setBranchId(currentBranchId);
    }
  }, [party]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!party?.id) return;

    setIsSubmitting(true);
    try {
      // Only send branchId if it's not empty
      const updates: { status: PartyStatus; segment: PartySegment; acquisitionType: string; branchId?: string } = {
        status,
        segment,
        acquisitionType,
      };

      if (branchId) {
        updates.branchId = branchId;
      }

      await onUpdate(party.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to update party tags:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!party) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Etiket Güncelle"
      size="md"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{party.firstName} {party.lastName}</strong> için etiketleri güncelleyin
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onClose();
              window.location.href = '/settings/general';
            }}
            icon={<Settings className="w-4 h-4" />}
            iconPosition="left"
            className="text-xs"
          >
            Etiketleri Düzenle
          </Button>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Durum
          </label>
          <select
            id="status"
            value={status || ''}
            onChange={(e) => setStatus(e.target.value as PartyStatus)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="active" className="dark:bg-slate-800">Aktif</option>
            <option value="inactive" className="dark:bg-slate-800">Pasif</option>
          </select>
        </div>

        <div>
          <label htmlFor="segment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Segment
          </label>
          <select
            id="segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value as PartySegment)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="new" className="dark:bg-slate-800">Yeni</option>
            <option value="lead" className="dark:bg-slate-800">Potansiyel</option>
            <option value="trial" className="dark:bg-slate-800">Deneme</option>
            <option value="customer" className="dark:bg-slate-800">Müşteri</option>
            <option value="control" className="dark:bg-slate-800">Kontrol</option>
            <option value="renewal" className="dark:bg-slate-800">Yenileme</option>
            <option value="existing" className="dark:bg-slate-800">Mevcut</option>
            <option value="vip" className="dark:bg-slate-800">VIP</option>
          </select>
        </div>

        <div>
          <label htmlFor="acquisitionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kazanım Türü
          </label>
          <select
            id="acquisitionType"
            value={acquisitionType}
            onChange={(e) => setAcquisitionType(e.target.value)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="" className="dark:bg-slate-800">Seçiniz</option>
            <option value="referral" className="dark:bg-slate-800">Referans</option>
            <option value="online" className="dark:bg-slate-800">Online</option>
            <option value="walk-in" className="dark:bg-slate-800">Ziyaret</option>
            <option value="social-media" className="dark:bg-slate-800">Sosyal Medya</option>
            <option value="advertisement" className="dark:bg-slate-800">Reklam</option>
            <option value="tabela" className="dark:bg-slate-800">Tabela</option>
            <option value="other" className="dark:bg-slate-800">Diğer</option>
          </select>
        </div>

        <div>
          <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Şube
          </label>
          <select
            id="branchId"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="" className="dark:bg-slate-800">Seçiniz</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id} className="dark:bg-slate-800">
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} icon={<PenSquare className="w-4 h-4" />} iconPosition="left">
            Güncelle
          </Button>
        </div>
      </form>
    </Modal>
  );
}
