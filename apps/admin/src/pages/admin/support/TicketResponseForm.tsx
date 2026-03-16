import React from 'react';

export interface TicketResponseFormProps {
  response: string;
  setResponse: (value: string) => void;
  isSending: boolean;
  onSend: () => void;
}

const TicketResponseForm: React.FC<TicketResponseFormProps> = ({
  response,
  setResponse,
  isSending,
  onSend,
}) => {
  return (
    <div>
      <h5 className="text-sm font-medium text-gray-900 mb-2">Yanıt Ekle</h5>
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={4}
        className="block w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        placeholder="Müşteriye yanıt yazın..."
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={onSend}
          disabled={!response.trim() || isSending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? 'Gönderiliyor...' : 'Yanıt Gönder'}
        </button>
      </div>
    </div>
  );
};

export default TicketResponseForm;
