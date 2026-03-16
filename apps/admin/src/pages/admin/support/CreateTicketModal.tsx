import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TicketPriority } from '@/lib/api-client';
import {
  CreateTicketFormData,
  isTicketPriority,
  isTicketCategory,
} from './types';

export interface CreateTicketModalProps {
  onClose: () => void;
  onCreate: (data: CreateTicketFormData) => void;
  isLoading: boolean;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onCreate, isLoading }) => {
  const [formData, setFormData] = useState<CreateTicketFormData>({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    category: 'general' as CreateTicketFormData['category'],
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-xl bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Yeni Ticket Oluştur</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Başlık
            </label>
            <input
              id="title"
              type="text"
              required
              className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={formData.title}
              onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Açıklama
            </label>
            <textarea
              id="description"
              required
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={formData.description}
              onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Öncelik
              </label>
              <select
                id="priority"
                className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.priority}
                onChange={(e) => {
                  const nextPriority = e.target.value;
                  if (isTicketPriority(nextPriority)) {
                    setFormData((current): CreateTicketFormData => ({ ...current, priority: nextPriority }));
                  }
                }}
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Kategori
              </label>
              <select
                id="category"
                className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.category}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  if (isTicketCategory(nextCategory)) {
                    setFormData((current): CreateTicketFormData => ({ ...current, category: nextCategory }));
                  }
                }}
              >
                <option value="general">Genel</option>
                <option value="technical">Teknik</option>
                <option value="billing">Fatura</option>
                <option value="feature_request">Özellik İsteği</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white premium-gradient tactile-press focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
