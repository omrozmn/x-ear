import React, { useState, useMemo } from 'react';
import { usePatientNotes } from '../hooks/patient/usePatientNotes';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { ErrorBoundary } from './common/ErrorBoundary';
import { PatientNoteForm } from './forms/PatientNoteForm';
import { FileText, AlertCircle, Plus, Search, Filter } from 'lucide-react';
import { Button } from './ui/Button';
import { patientApiService } from '../services/patient/patient-api.service';

interface PatientNotesTabProps {
  patientId: string;
}

export const PatientNotesTab: React.FC<PatientNotesTabProps> = ({
  patientId
}) => {
  const { notes, isLoading: notesLoading, error: notesError } = usePatientNotes(patientId);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [noteTypeFilter, setNoteTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Filtered notes and statistics
  const { filteredNotes, filteredStats } = useMemo(() => {
    let filtered = notes;

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Note type filter
    if (noteTypeFilter) {
      filtered = filtered.filter(note => note.noteType === noteTypeFilter);
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(note => note.category === categoryFilter);
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.createdAt);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;

        if (startDate && noteDate < startDate) return false;
        if (endDate && noteDate > endDate) return false;
        return true;
      });
    }

    // Calculate statistics
    const noteTypeCounts = filtered.reduce((acc, note) => {
      acc[note.noteType] = (acc[note.noteType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryCounts = filtered.reduce((acc, note) => {
      acc[note.category] = (acc[note.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentNotes = filtered.filter(note => {
      const noteDate = new Date(note.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return noteDate > thirtyDaysAgo;
    }).length;

    return {
      filteredNotes: filtered,
      filteredStats: {
        totalNotes: filtered.length,
        noteTypeCounts,
        categoryCounts,
        recentNotes
      }
    };
  }, [notes, searchTerm, noteTypeFilter, categoryFilter, dateRange]);

  // Get unique note types and categories for filter dropdowns
  const noteTypes = useMemo(() => {
    const types = new Set(notes.map(note => note.noteType));
    return Array.from(types).sort();
  }, [notes]);

  const categories = useMemo(() => {
    const cats = new Set(notes.map(note => note.category));
    return Array.from(cats).sort();
  }, [notes]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (notesLoading) {
    return (
      <div className="p-6" role="status" aria-label="Notlar yükleniyor">
        <LoadingSkeleton lines={4} className="mb-4" />
        <div className="grid gap-4">
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (notesError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Notlar yüklenirken hata oluştu</h3>
              <p className="mt-1 text-sm text-red-700">
                {typeof notesError === 'string' ? notesError : notesError.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleNoteClick = (note: any) => {
    // TODO: Implement note detail modal or navigation
    console.log('Note clicked:', note);
  };

  const handleAddNote = () => {
    setShowNoteForm(true);
  };

  const handleNoteFormClose = () => {
    setShowNoteForm(false);
  };

  const handleNoteSave = async (noteData: any) => {
    setIsSubmitting(true);
    try {
      await patientApiService.createNote(patientId, noteData);
      setShowNoteForm(false);
      
      // Refresh notes data by refetching
      // Since we don't have a refresh prop, we'll need to refetch the data
      // This would typically be handled by the parent component or a data fetching hook
      console.log('Note saved successfully');
    } catch (error) {
      console.error('Note save failed:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="w-5 h-5 mr-2" aria-hidden="true" />
          Hasta Notları ({filteredNotes.length})
        </h3>
        <Button onClick={handleAddNote} aria-label="Not ekle">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-400 mr-2" aria-hidden="true" />
          <h4 className="text-sm font-medium text-gray-900">Arama ve Filtreleme</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Arama
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Başlık, içerik veya etiket ara..."
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="noteType" className="block text-sm font-medium text-gray-700">
              Not Türü
            </label>
            <select
              id="noteType"
              value={noteTypeFilter}
              onChange={(e) => setNoteTypeFilter(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Tümü</option>
              {noteTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Kategori
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Tümü</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
              Tarih Aralığı
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="date"
                id="startDate"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <input
                type="date"
                id="endDate"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {filteredNotes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Toplam Not</p>
                <p className="text-lg font-semibold text-blue-900">{filteredStats.totalNotes}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-green-600">Son 30 Gün</p>
                <p className="text-lg font-semibold text-green-900">{filteredStats.recentNotes}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-purple-600">En Çok Not Türü</p>
                <p className="text-lg font-semibold text-purple-900">
                  {Object.keys(filteredStats.noteTypeCounts).length > 0
                    ? Object.entries(filteredStats.noteTypeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                    : 'Yok'
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-orange-600">En Çok Kategori</p>
                <p className="text-lg font-semibold text-orange-900">
                  {Object.keys(filteredStats.categoryCounts).length > 0
                    ? Object.entries(filteredStats.categoryCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                    : 'Yok'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className="text-center py-12" role="status">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {notes.length === 0 ? 'Henüz not yok' : 'Filtreye uygun not bulunamadı'}
          </h3>
          <p className="text-gray-500">
            {notes.length === 0
              ? 'Bu hasta için henüz not girilmemiş.'
              : 'Arama kriterlerinizi değiştirerek daha fazla sonuç görebilirsiniz.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Hasta notları listesi">
          {filteredNotes.map((note) => (
            <div key={note.id} role="listitem" className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-500" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{note.title}</h4>
                    <p className="text-sm text-gray-500">
                      {note.noteType} • {note.category} • {formatDate(note.createdAt)}
                    </p>
                  </div>
                </div>
                {note.isPrivate && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Özel
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">{note.content}</p>
              {note.tags && note.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {note.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showNoteForm && (
        <PatientNoteForm
          patientId={patientId}
          isOpen={showNoteForm}
          onClose={handleNoteFormClose}
          onSave={handleNoteSave}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};