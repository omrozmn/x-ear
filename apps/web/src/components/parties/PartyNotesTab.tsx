import React, { useState, useEffect } from 'react';
import { Button, Textarea, useToastHelpers } from '@x-ear/ui-web';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import {
  listPartyNotes,
  createPartyNotes,
  deletePartyNote,
  updatePartyNote,
  createPartyTimeline
} from '@/api/client/parties.client';
import type {
  PatientNoteCreate as PartyNoteCreate,
  PatientNoteUpdate as PartyNoteUpdate,
  TimelineEventCreate,
} from '@/api/generated/schemas';
import type { Party, PartyNote } from '../../types/party/index';
import { getCurrentUserId, getCurrentUserName } from '@/utils/auth-utils';

interface PartyNotesTabProps {
  party: Party;
  onPartyUpdate?: (party: Party) => void;
}

export const PartyNotesTab: React.FC<PartyNotesTabProps> = ({ party, onPartyUpdate: _onPartyUpdate }) => {
  const [notes, setNotes] = useState<PartyNote[]>(party.notes || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<PartyNote | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToastHelpers();

  // API functions are imported directly

  const loadNotes = React.useCallback(async () => {
    if (!party?.id || isLoading) return;

    try {
      setIsLoading(true);
      // Use listPartyNotes API with correct typing
      // Note: We need to import unwrapArray if we want to use it, or just assert the Response wrapper
      // Assuming listPartyNotes returns the wrapper directly or Promise thereof.
      // Based on other files, utilize unwrapResult pattern or casting to expected shape if generic is unknown
      const response = await listPartyNotes(party.id);

      // The generated client usually returns { data: ... } or the data directly depending on config.
      // Let's assume it returns a wrapper and we access .data
      // We'll trust the generated types or cast to unknown first to avoid 'as any' if needed, 
      // but safely checking Array.isArray on response.data is good.

      // If response is the data itself (array) or wrapper.
      // Let's look at import: listPartyNotes. 
      // If we use 'as any', we are bypassing. 
      // Let's safe-cast to unknown record for now to read .data if types are missing
      const responseData = (response as unknown as { data: any[] })?.data || [];

      if (Array.isArray(responseData)) {
        // Map API response to PartyNote interface
        const notesList = responseData.map((note) => ({
          id: note.id || '',
          text: note.content || '',
          date: note.createdAt || new Date().toISOString(),
          author: note.createdBy || 'system',
          type: note.type || 'general'
        }));

        setNotes(notesList);
      }
    } catch (err) {
      error('Notlar yüklenirken hata oluştu');
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [party?.id, error, isLoading]);

  // Load notes from API on mount only once
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (mounted && party?.id) {
        await loadNotes();
      }
    };

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party?.id]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      setIsLoading(true);

      // Create note via party notes API
      const noteBody: PartyNoteCreate = {
        content: newNoteContent,
        type: 'general',
        createdBy: getCurrentUserId()
      };

      await createPartyNotes(party.id || '', noteBody);

      // Also add to timeline
      const timelineBody: TimelineEventCreate = {
        type: 'note',
        title: 'Yeni Not Eklendi',
        description: newNoteContent,
        user: getCurrentUserName(),
        category: 'general'
      };

      await createPartyTimeline(party.id || '', timelineBody);

      // Reload notes to get the updated list
      await loadNotes();

      setNewNoteContent('');
      setShowAddForm(false);
      success('Not başarıyla eklendi');

    } catch (err) {
      error('Not eklenirken hata oluştu');
      console.error('Error adding note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNote = (note: PartyNote) => {
    setEditingNote(note);
    setEditNoteContent(note.text);
  };

  const handleSaveEdit = async () => {
    if (!editNoteContent.trim() || !editingNote) return;

    try {
      setIsLoading(true);

      // Use new update endpoint
      const updateBody: PartyNoteUpdate = {
        content: editNoteContent,
        // type: editingNote.type || 'general', // Update schema might not need type if not changing
        // createdBy: editingNote.author
      };

      await updatePartyNote(party.id || '', editingNote.id, updateBody);

      // Add timeline event for the edit
      const timelineBody: any = {
        type: 'note',
        title: 'Not Güncellendi',
        description: editNoteContent,
        user: getCurrentUserName(),
        category: 'general'
      };

      await createPartyTimeline(party.id || '', timelineBody);

      // Reload notes
      await loadNotes();

      setEditingNote(null);
      setEditNoteContent('');
      success('Not başarıyla güncellendi');

    } catch (err) {
      error('Not güncellenirken hata oluştu');
      console.error('Error updating note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setIsLoading(true);

      await deletePartyNote(party.id || '', noteId);

      // Add timeline event for the deletion
      const timelineBody: any = {
        type: 'note',
        title: 'Not Silindi',
        description: 'Bir not silindi',
        user: getCurrentUserName(),
        category: 'general'
      };

      await createPartyTimeline(party.id || '', timelineBody);

      // Reload notes
      await loadNotes();
      success('Not başarıyla silindi');

    } catch (err) {
      error('Not silinirken hata oluştu');
      console.error('Error deleting note:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditNoteContent('');
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewNoteContent('');
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Hasta Notları</h3>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Not Ekle
        </Button>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border dark:border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Yeni Not</h4>
            <Button
              onClick={handleCancelAdd}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Not içeriğini yazınız..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows={4}
            className="mb-3"
          />
          <div className="flex justify-end space-x-2">
            <Button onClick={handleCancelAdd} variant="outline">
              İptal
            </Button>
            <Button onClick={handleAddNote}>
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border dark:border-slate-800">
              {editingNote && editingNote.id === note.id ? (
                // Edit Mode
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Notu Düzenle</h4>
                    <Button
                      onClick={handleCancelEdit}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={editNoteContent}
                    onChange={(e) => setEditNoteContent(e.target.value)}
                    rows={4}
                    className="mb-3"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button onClick={handleCancelEdit} variant="outline">
                      İptal
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-gray-900 dark:text-gray-200 whitespace-pre-wrap">{note.text}</p>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        onClick={() => handleEditNote(note)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteNote(note.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {note.date ? new Date(note.date).toLocaleString('tr-TR') : ''}
                    <span> • Yazar: {note.author}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Henüz not bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
};