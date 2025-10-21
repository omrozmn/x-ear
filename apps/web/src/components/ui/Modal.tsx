import { Button } from '@x-ear/ui-web';
import React from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
};

export const Modal: React.FC<Props> = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white rounded shadow-lg z-10 max-w-6xl w-full max-h-[90vh] overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button onClick={onClose} aria-label="close" variant='ghost'><X size={16} /></Button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
