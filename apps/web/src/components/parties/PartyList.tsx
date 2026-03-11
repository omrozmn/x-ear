import React, { useState, useCallback, useMemo } from 'react';
import { Button, Loading, Badge, Checkbox, Modal, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  Trash2,
  MessageSquare
} from 'lucide-react';
// import { useDeleteParty } from '../../hooks/useParties'; // Hook not used in this component
import type { Party } from '../../types/party/index';
import { PartyCommunicationIntegration } from './PartyCommunicationIntegration';
import {
  StatusBadge,
  SegmentBadge,
  AcquisitionStatusBadge,
} from './PartyListHelpers';
import { formatDate, formatPhone } from './PartyListUtils';
import { useListBranches } from '../../api/generated/branches/branches';
import { unwrapArray } from '../../utils/response-unwrap';
import { BranchRead } from '../../api/generated/schemas';
import { useTranslation } from 'react-i18next';

interface PartyListProps {
  parties: Party[];
  loading?: boolean;
  selectedParties?: string[];
  onPartySelect?: (partyId: string) => void;
  onPartyClick?: (party: Party) => void;
  onView?: (party: Party) => void;
  onDelete?: (party: Party) => void;
  onTagClick?: (party: Party) => void;
  onBulkAction?: (action: string, partyIds: string[]) => void;
  showSelection?: boolean;
  showActions?: boolean;
  viewMode?: 'list' | 'grid' | 'compact';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  className?: string;
}

/**
 * PartyList Component
 * Displays a list of parties with various view modes and actions
 */
export function PartyList({
  parties,
  loading = false,
  selectedParties = [],
  onPartySelect,
  onPartyClick,
  onView,
  onDelete,
  onTagClick,
  // onBulkAction, // Currently unused
  showSelection = false,
  showActions = true,
  viewMode = 'list',
  onSort,
  pagination,
  className = ''
}: PartyListProps) {
  const { t } = useTranslation(['patients', 'common']);
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);
  const [communicationParty, setCommunicationParty] = useState<Party | null>(null);

  // Fetch branches for display
  const { data: branchesData } = useListBranches();
  const branches = useMemo(() => unwrapArray<BranchRead>(branchesData) || [], [branchesData]);

  // Helper to find branch name
  const getBranchName = useCallback((party: Party) => {
    const branchId = party.branchId;
    const branchName = party.branchName;

    if (branchName) return branchName;
    if (branchId) {
      const branch = branches.find(b => b.id === branchId);
      return branch?.name || '-';
    }
    return '-';
  }, [branches]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
        <span className="ml-2 text-gray-600">{t('list.loading')}</span>
      </div>
    );
  }

  if (parties.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('list.empty_title')}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('list.empty_desc')}
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {parties.map((party) => (
          <div
            key={party.id}
            className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              console.log('=== PARTY CARD CLICK ===', party);
              (onView || onPartyClick)?.(party);
            }}
            onMouseEnter={() => setHoveredParty(party.id || null)}
            onMouseLeave={() => setHoveredParty(null)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {showSelection && (
                    <Checkbox
                      checked={party.id ? selectedParties.includes(party.id) : false}
                      onChange={() => party.id && onPartySelect?.(party.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <h3 className="text-sm font-medium text-gray-900">
                    {party.firstName} {party.lastName}
                  </h3>
                </div>

                <div className="mt-2 space-y-1">
                  {party.tcNumber && (
                    <div className="flex items-center text-xs text-gray-500">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {party.tcNumber}
                    </div>
                  )}
                  {party.phone && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Phone className="h-3 w-3 mr-1" />
                      {formatPhone(party.phone)}
                    </div>
                  )}
                  {party.email && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Mail className="h-3 w-3 mr-1" />
                      {party.email}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge status={party.status || undefined} />
                  {party.createdAt && (
                    <span className="text-xs text-gray-400">
                      <span className="mx-2 text-gray-300">|</span>
                      {formatDate(party.createdAt || undefined)}
                    </span>
                  )}
                </div>
              </div>

              {showActions && hoveredParty === party.id && (
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(party);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List view (default)
  const partyColumns: Column<Party>[] = [
    ...(showSelection ? [{
      key: '_selection',
      title: '',
      render: (_: unknown, party: Party) => (
        <Checkbox
          checked={party.id ? selectedParties.includes(party.id) : false}
          onChange={() => party.id && onPartySelect?.(party.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
    }] : []),
    {
      key: 'name',
      title: t('list.columns.name'),
      sortable: true,
      render: (_, party) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {(() => {
              const g = String(party.gender || '').toLowerCase();
              const isFemale = ['f', 'female', 'kadın', 'k', 'woman', 'w'].includes(g) || g.includes('kad');
              return (
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isFemale ? 'bg-pink-100 dark:bg-pink-900/30' : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30'}`}>
                  <User className={`h-5 w-5 ${isFemale ? 'text-pink-600 dark:text-pink-400' : 'text-blue-600 dark:text-blue-400'}`} />
                </div>
              );
            })()}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {party.firstName} {party.lastName}
            </div>
            {party.email && (
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{party.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'tcNumber',
      title: t('list.columns.tc'),
      render: (_, party) => (
        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{party.tcNumber || '-'}</span>
      ),
    },
    {
      key: 'phone',
      title: t('list.columns.phone'),
      render: (_, party) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">{formatPhone(party.phone || undefined)}</span>
      ),
    },
    {
      key: 'segment',
      title: t('list.columns.segment'),
      sortable: true,
      render: (_, party) => (
        <div
          className="cursor-pointer"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTagClick?.(party); }}
          title={t('list.update_tag_tooltip')}
        >
          <SegmentBadge segment={party.segment || undefined} />
        </div>
      ),
    },
    {
      key: 'acquisitionType',
      title: t('list.columns.acquisition'),
      sortable: true,
      render: (_, party) => (
        <div
          className="cursor-pointer"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTagClick?.(party); }}
          title={t('list.update_tag_tooltip')}
        >
          <AcquisitionStatusBadge acquisitionType={party.acquisitionType || undefined} />
        </div>
      ),
    },
    {
      key: 'branchId',
      title: t('list.columns.branch'),
      sortable: true,
      render: (_, party) => (
        <div
          className="cursor-pointer"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTagClick?.(party); }}
          title={t('list.update_tag_tooltip')}
        >
          <Badge variant="default" size="sm">{getBranchName(party)}</Badge>
        </div>
      ),
    },
    {
      key: 'status',
      title: t('list.columns.status'),
      sortable: true,
      render: (_, party) => (
        <div
          className="cursor-pointer"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onTagClick?.(party); }}
          title={t('list.update_tag_tooltip')}
        >
          <StatusBadge status={party.status || undefined} />
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: t('list.columns.created_at'),
      sortable: true,
      render: (_, party) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(party.createdAt || undefined)}</span>
      ),
    },
    ...(showActions ? [{
      key: '_actions',
      title: t('list.columns.actions'),
      align: 'right' as const,
      render: (_: unknown, party: Party) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setCommunicationParty(party); }}
            className="h-11 w-11 !p-0 inline-flex items-center justify-center rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 text-gray-400 dark:text-gray-500 transition-colors"
            title={t('nav.communication', { ns: 'layout' })}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete?.(party); }}
            className="h-11 w-11 !p-0 inline-flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 text-gray-400 dark:text-gray-500 transition-colors"
            title={t('delete', { ns: 'common' })}
          >
            <Trash2 className="h-6 w-6" />
          </Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <>
      <DataTable<Party>
        data={parties}
        columns={partyColumns}
        rowKey="id"
        onRowClick={(party) => {
          console.log('=== TABLE ROW CLICK ===', party);
          const handler = onView || onPartyClick;
          if (handler) handler(party);
        }}
        rowSelection={showSelection && onPartySelect ? {
          selectedRowKeys: selectedParties,
          onChange: (keys) => {
            const newSet = new Set(keys.map(String));
            const currentSet = new Set(selectedParties);
            newSet.forEach(k => { if (!currentSet.has(k)) onPartySelect!(k); });
            currentSet.forEach(k => { if (!newSet.has(k)) onPartySelect!(k); });
          },
        } : undefined}
        onSort={(key) => onSort?.(key)}
        pagination={pagination}
      />
      {/* Communication Modal */}
      {communicationParty && (
        <Modal
          isOpen={true}
          onClose={() => setCommunicationParty(null)}
          title={t('modal.contact_title', { name: `${communicationParty.firstName} ${communicationParty.lastName}` })}
          size="xl"
        >
          <PartyCommunicationIntegration
            party={communicationParty}
            onClose={() => setCommunicationParty(null)}
          />
        </Modal>
      )}
    </>
  );
}
