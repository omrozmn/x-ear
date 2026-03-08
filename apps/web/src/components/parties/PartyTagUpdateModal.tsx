import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { Settings, PenSquare } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { Party, PartyStatus, PartySegment } from '../../types/party/party-base.types';
import { useListBranches } from '../../api/generated/branches/branches';
import { unwrapArray } from '../../utils/response-unwrap';
import { BranchRead } from '../../api/generated/schemas';
import { getPartySegments, getAcquisitionTypes } from '../../utils/party-segments';

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
  isLoading?: boolean;
}

export function PartyTagUpdateModal({
  isOpen,
  onClose,
  party,
  onUpdate,
  isLoading = false
}: PartyTagUpdateModalProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PartyStatus>('ACTIVE');
  const [segment, setSegment] = useState<PartySegment>('NEW');
  const [acquisitionType, setAcquisitionType] = useState('');
  const [branchId, setBranchId] = useState('');

  // Fetch branches dynamically
  const { data: branchesResponse } = useListBranches();
  const allBranches = unwrapArray<BranchRead>(branchesResponse) || [];

  // Load dynamic segments and acquisitions
  const segmentOptions = getPartySegments();
  const acquisitionOptions = getAcquisitionTypes();

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
    if (!party?.id || isLoading) return;

    try {
      // Build updates object - only send non-empty values
      const updates: { status: PartyStatus; segment: PartySegment; acquisitionType?: string; branchId?: string } = {
        status,
        segment,
      };

      // Only add acquisitionType if it's not empty
      if (acquisitionType) {
        updates.acquisitionType = acquisitionType;
      }

      // Only add branchId if it's not empty
      if (branchId) {
        updates.branchId = branchId;
      }

      await onUpdate(party.id, updates);
      // Parent will close modal after successful update
    } catch (error) {
      console.error('Failed to update party tags:', error);
      // Don't close modal on error
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
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{party.firstName} {party.lastName}</strong> için etiketleri güncelleyin
          </p>
          <Button 
            type="button" 
            variant="outline" 
            size="md"
            onClick={() => {
              navigate({ to: '/settings/parties' });
            }}
            icon={<Settings className="w-5 h-5" />}
            iconPosition="left"
          >
            Etiket Düzenle
          </Button>
        </div>

        {/* Grid Layout - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Durum
            </label>
            <select data-allow-raw="true"
              id="status"
              value={status || ''}
              onChange={(e) => setStatus(e.target.value as PartyStatus)}
              disabled={isLoading}
              className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="active" className="dark:bg-slate-800">Aktif</option>
              <option value="inactive" className="dark:bg-slate-800">Pasif</option>
            </select>
          </div>

          <div>
            <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Şube
            </label>
            <select data-allow-raw="true"
              id="branchId"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={isLoading}
              className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" className="dark:bg-slate-800">Seçiniz</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id} className="dark:bg-slate-800">
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="segment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Segment
            </label>
            <select data-allow-raw="true"
              id="segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value as PartySegment)}
              disabled={isLoading}
              className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {segmentOptions.map((option) => (
                <option key={option.value} value={option.value} className="dark:bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="acquisitionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kazanım Türü
            </label>
            <select data-allow-raw="true"
              id="acquisitionType"
              value={acquisitionType}
              onChange={(e) => setAcquisitionType(e.target.value)}
              disabled={isLoading}
              className="w-full block px-3 py-2 pr-10 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" className="dark:bg-slate-800">Seçiniz</option>
              {acquisitionOptions.map((option) => (
                <option key={option.value} value={option.value} className="dark:bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
            İptal
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            size="md" 
            disabled={isLoading} 
            icon={<PenSquare className="w-5 h-5" />} 
            iconPosition="left"
          >
            {isLoading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
