import React from 'react';
import { Button } from '@x-ear/ui-web';
import { FileText, Upload, Eye, Download, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SGKDocument } from '../../types/sgk';

interface FileUploadSectionProps {
  sgkDocuments: SGKDocument[];
  documentsLoading: boolean;
  onUploadClick: () => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  sgkDocuments,
  documentsLoading,
  onUploadClick
}) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">SGK Belgeleri</h3>
        <Button
          onClick={onUploadClick}
          variant="outline"
        >
          <Upload className="w-4 h-4 mr-2" />
          Belge Yükle
        </Button>
      </div>

      {documentsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : sgkDocuments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Henüz SGK belgesi yüklenmemiş</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sgkDocuments.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h5 className="font-medium text-gray-900">{doc.filename}</h5>
                    <StatusBadge status="approved" className="text-xs" />
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Yüklenme: {new Date(doc.uploadedAt).toLocaleDateString('tr-TR')}</p>
                    <p>Durum: İşlendi</p>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};