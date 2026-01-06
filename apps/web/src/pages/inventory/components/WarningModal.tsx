import React from 'react';
import { Modal, Button, Alert } from '@x-ear/ui-web';

interface FailureItem {
  id: string;
  message: string;
  status?: number;
  data?: any;
}

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  failures?: FailureItem[];
}

const WarningModal: React.FC<WarningModalProps> = ({ isOpen, onClose, title = 'Uyarı', message, failures = [] }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <Alert variant="warning">
          <div>
            {message && <p className="font-medium">{message}</p>}
            {!message && failures.length > 0 && (
              <p className="font-medium">{failures.length} işlem başarısız oldu.</p>
            )}
          </div>
        </Alert>

        {failures.length > 0 && (
          <div className="max-h-56 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-3 rounded">
            {failures.map((f, idx) => (
              <div key={f.id + idx} className="mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium dark:text-gray-100">ID: {f.id}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{f.message}</div>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-500">
                    {f.status && <div>Status: {f.status}</div>}
                  </div>
                </div>
                {f.data && (
                  <pre className="text-xs text-gray-700 dark:text-gray-300 mt-1 bg-white dark:bg-gray-700 p-2 rounded overflow-x-auto">{JSON.stringify(f.data, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </Modal>
  );
};

export default WarningModal;
