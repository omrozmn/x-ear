import React, { useState, useCallback, useMemo } from 'react';
import { Button, Loading, Badge, Checkbox, Modal } from '@x-ear/ui-web';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  Edit,
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
  formatDate,
  formatPhone,
} from './PartyListHelpers';
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
  onEdit?: (party: Party) => void;
  onDelete?: (party: Party) => void;
  onTagClick?: (party: Party) => void;
  onBulkAction?: (action: string, partyIds: string[]) => void;
  showSelection?: boolean;
  showActions?: boolean;
  viewMode?: 'list' | 'grid' | 'compact';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  className?: string;
}

interface SortableHeaderProps {
  field: string;
  label: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

function SortableHeader({ field, label, sortBy, sortOrder, onSort }: SortableHeaderProps) {
  const isActive = sortBy === field;

  return (
    <button data-allow-raw="true"
      onClick={() => onSort?.(field)}
      className={`flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900 ${isActive ? 'text-blue-600' : ''
        }`}
    >
      <span>{label}</span>
      {isActive && (
        <span className="text-xs">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
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
  onEdit,
  onDelete,
  onTagClick,
  // onBulkAction, // Currently unused
  showSelection = false,
  showActions = true,
  viewMode = 'list',
  sortBy,
  sortOrder,
  onSort,
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

  const isAllSelected = useMemo(() => {
    return parties.length > 0 && parties.every(p => p.id && selectedParties.includes(p.id));
  }, [parties, selectedParties]);

  const isPartiallySelected = useMemo(() => {
    return selectedParties.length > 0 && !isAllSelected;
  }, [selectedParties, isAllSelected]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      // Deselect all
      parties.forEach(p => p.id && onPartySelect?.(p.id));
    } else {
      // Select all
      parties.forEach(p => {
        if (p.id && !selectedParties.includes(p.id)) {
          onPartySelect?.(p.id);
        }
      });
    }
  }, [parties, selectedParties, isAllSelected, onPartySelect]);

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
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
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
                      onEdit?.(party);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
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
  return (
    <>
      <div className={`bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {showSelection && (
                  <th className="px-4 py-3 text-left w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isPartiallySelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                  <SortableHeader
                    field="name"
                    label={t('list.columns.name')}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                  {t('list.columns.tc')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                  {t('list.columns.phone')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  {t('list.columns.segment')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                  {t('list.columns.acquisition')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                  {t('list.columns.branch')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                  {t('list.columns.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                  <SortableHeader
                    field="createdAt"
                    label={t('list.columns.created_at')}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  />
                </th>
                {showActions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[160px]">
                    {t('list.columns.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {parties.map((party) => (
                <tr
                  key={party.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors duration-150"
                  onClick={() => {
                    console.log('=== TABLE ROW CLICK ===', party);
                    console.log('onPartyClick:', onPartyClick);
                    console.log('onView:', onView);
                    const handler = onView || onPartyClick;
                    console.log('Handler to call:', handler);
                    if (handler) {
                      handler(party);
                    } else {
                      console.error('No click handler available!');
                    }
                  }}
                  onMouseEnter={() => setHoveredParty(party.id || null)}
                  onMouseLeave={() => setHoveredParty(null)}
                >
                  {showSelection && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={party.id ? selectedParties.includes(party.id) : false}
                        onChange={() => party.id && onPartySelect?.(party.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {party.tcNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatPhone(party.phone || undefined)}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(party);
                    }}
                    title={t('list.update_tag_tooltip')}
                  >
                    <SegmentBadge segment={party.segment || undefined} />
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(party);
                    }}
                    title={t('list.update_tag_tooltip')}
                  >
                    <AcquisitionStatusBadge acquisitionType={party.acquisitionType || undefined} />
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(party);
                    }}
                    title={t('list.update_tag_tooltip')}
                  >
                    <Badge variant="default" size="sm">{getBranchName(party)}</Badge>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(party);
                    }}
                    title={t('list.update_tag_tooltip')}
                  >
                    <StatusBadge status={party.status || undefined} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(party.createdAt || undefined)}
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(party);
                          }}
                          className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 text-gray-400 dark:text-gray-500"
                          title={t('edit', { ns: 'common' })}
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommunicationParty(party);
                          }}
                          className="h-9 w-9 p-0 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 text-gray-400 dark:text-gray-500"
                          title={t('nav.communication', { ns: 'layout' })}
                        >
                          <MessageSquare className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(party);
                          }}
                          className="h-9 w-9 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 text-gray-400 dark:text-gray-500"
                          title={t('delete', { ns: 'common' })}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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