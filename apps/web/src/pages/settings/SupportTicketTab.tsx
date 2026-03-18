import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@x-ear/ui-web';
import { HelpCircle, Send, Loader2, CheckCircle, Plus, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCreateAdminTicket, useListAdminTickets } from '@/api/generated';
import type { TicketCreate, TicketCategory, TicketPriority } from '@/api/generated/schemas';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Genel',
  technical: 'Teknik',
  billing: 'Fatura / Odeme',
  feature_request: 'Ozellik Talebi',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Dusuk',
  medium: 'Orta',
  high: 'Yuksek',
  urgent: 'Acil',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Acik',
  in_progress: 'Isleniyor',
  resolved: 'Cozuldu',
  closed: 'Kapandi',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

interface TicketItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

function extractTickets(data: unknown): TicketItem[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.data)) return d.data as TicketItem[];
  if (d.data && typeof d.data === 'object' && Array.isArray((d.data as Record<string, unknown>).items)) {
    return (d.data as Record<string, unknown>).items as TicketItem[];
  }
  if (d.data && typeof d.data === 'object' && Array.isArray((d.data as Record<string, unknown>).tickets)) {
    return (d.data as Record<string, unknown>).tickets as TicketItem[];
  }
  return [];
}

export default function SupportTicketTab() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const { data: ticketsData, isLoading: ticketsLoading, refetch } = useListAdminTickets({ page: 1, limit: 20 });
  const { mutateAsync: createTicket, isPending } = useCreateAdminTicket();

  const tickets = extractTickets(ticketsData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Baslik zorunludur');
      return;
    }

    const payload: TicketCreate = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
    };

    try {
      await createTicket({ data: payload });
      toast.success('Destek talebi basariyla olusturuldu');
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setShowForm(false);
      refetch();
    } catch {
      toast.error('Destek talebi olusturulamadi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <HelpCircle className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Destek Talepleri</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Yardim talebi olusturun ve mevcut taleplerinizi takip edin</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Destek Talebi Olustur
        </Button>
      </div>

      {/* Create Ticket Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni Destek Talebi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Baslik <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sorununuzu kisa bir baslikla ozetleyin"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oncelik</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aciklama</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sorununuzu detayli bir sekilde aciklayin..."
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Iptal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Gonderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Gonder
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ticket List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Talepleriniz</CardTitle>
        </CardHeader>
        <CardContent>
          {ticketsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">Henuz destek talebiniz yok</p>
              <p className="text-sm mt-1">Yardima ihtiyaciniz varsa yukaridaki butona tiklayarak talep olusturabilirsiniz.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate">{ticket.title}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {ticket.createdAt && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                      {expandedTicket === ticket.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedTicket === ticket.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      {ticket.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        {ticket.category && (
                          <span>Kategori: <strong>{CATEGORY_LABELS[ticket.category] || ticket.category}</strong></span>
                        )}
                        {ticket.priority && (
                          <span>Oncelik: <strong>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</strong></span>
                        )}
                      </div>
                      {ticket.status === 'resolved' && (
                        <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Bu talep cozuldu</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
