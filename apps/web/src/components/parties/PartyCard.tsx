import React, { useState } from 'react';
import { Button, Badge, Checkbox } from '@x-ear/ui-web';
import {
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Activity,
  Shield
} from 'lucide-react';
import { PartySearchItem } from '../../types/party/party-search.types';
import { useTranslation } from 'react-i18next';

interface PartyCardProps {
  party: PartySearchItem;
  selected?: boolean;
  onSelect?: (partyId: string) => void;
  onClick?: (party: PartySearchItem) => void;
  onEdit?: (party: PartySearchItem) => void;
  onDelete?: (party: PartySearchItem) => void;
  showSelection?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  // onPartyUpdate removed - not used in component
}

/**
 * PartyCard Component
 * Displays party information in a card format
 */
export function PartyCard({
  party,
  selected = false,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  showSelection = false,
  showActions = true,
  compact = false,
  className = ''
}: PartyCardProps) {
  const { t } = useTranslation(['parties_extra', 'patients', 'common']);
  const [showMenu, setShowMenu] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">{t('card.active')}</Badge>;
      case 'inactive':
        return <Badge variant="warning" size="sm">{t('card.inactive')}</Badge>;
      case 'archived':
        return <Badge variant="secondary" size="sm">{t('card.archived')}</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      case 'standard':
        return 'bg-primary/10 text-blue-800 border-blue-200 dark:text-blue-300 dark:border-blue-800';
      case 'basic':
        return 'bg-muted text-foreground border-border';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR')}`;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'N/A';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) {
      return;
    }
    onClick?.(party);
  };

  if (compact) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl border border-border p-4 hover:shadow-md transition-all cursor-pointer ${selected ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700' : ''
          } ${className}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showSelection && (
              <Checkbox
                checked={selected}
                onChange={() => onSelect?.(party.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
              {getInitials(party.firstName, party.lastName)}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {party.firstName || ''} {party.lastName || ''}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatDate(party.registrationDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getStatusBadge(party.status || '')}

            {showActions && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-border rounded-2xl shadow-lg z-10">
                    <div className="py-1">
                      <button
                        data-allow-raw="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClick?.(party);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('card.view')}
                      </button>

                      {onEdit && (
                        <button
                          data-allow-raw="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(party);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t('card.edit')}
                        </button>
                      )}

                      {onDelete && (
                        <button
                          data-allow-raw="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(party);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('card.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-border hover:shadow-lg transition-all cursor-pointer ${selected ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700' : ''
        } ${className}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {showSelection && (
              <Checkbox
                checked={selected}
                onChange={() => onSelect?.(party.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-medium">
              {getInitials(party.firstName, party.lastName)}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {party.firstName || ''} {party.lastName || ''}
              </h3>

              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(party.status || '')}

                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getSegmentColor(party.segment)
                  }`}>
                  {party.segment}
                </span>
              </div>

              {party.priority > 0 && (
                <div className="mt-2">
                  <Badge variant="warning" size="sm">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t('card.high_priority', { score: party.priority })}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {showActions && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-border rounded-2xl shadow-lg z-10">
                  <div className="py-1">
                    <button
                      data-allow-raw="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick?.(party);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-3" />
                      {t('card.view_details')}
                    </button>

                    {onEdit && (
                      <button
                        data-allow-raw="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(party);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-3" />
                        {t('card.edit')}
                      </button>
                    )}

                    {onDelete && (
                      <button
                        data-allow-raw="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(party);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        {t('card.delete')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Contact Info */}
          <div className="space-y-2">
            {party.phone && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                {party.phone}
              </div>
            )}

            {party.email && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                {party.email}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              {t('card.registration')}: {formatDate(party.registrationDate)}
            </div>

            {party.deviceCount > 0 && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                {t('card.device_count', { count: party.deviceCount })}
              </div>
            )}

            {party.hasInsurance && (
              <div className="flex items-center text-sm text-success">
                <Shield className="h-4 w-4 mr-2" />
                {t('card.insured')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-border rounded-b-lg">
        <div className="flex items-center justify-between">
          {/* Labels */}
          <div className="flex flex-wrap gap-1">
            {party.labels && party.labels.length > 0 && (
              party.labels.slice(0, 3).map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-blue-800 dark:text-blue-300"
                >
                  {label}
                </span>
              ))
            )}

            {party.labels && party.labels.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                +{party.labels.length - 3}
              </span>
            )}
          </div>

          {/* Balance */}
          <div className="text-right">
            {party.outstandingBalance > 0 ? (
              <div className="text-sm font-medium text-destructive">
                {t('card.debt')}: {formatCurrency(party.outstandingBalance)}
              </div>
            ) : (
              <div className="flex items-center text-sm text-success">
                <CheckCircle className="h-4 w-4 mr-1" />
                {t('card.balance_clear')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}