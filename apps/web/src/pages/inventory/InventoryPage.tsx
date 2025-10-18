import React, { useEffect, useState } from 'react';
import InventoryTable from './InventoryTable/InventoryTable';
import { apiClient, InventoryItem } from '../../services/apiClient';
import Modal from '../../components/ui/Modal';

const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiClient
      .getInventoryItems()
      .then((r: InventoryItem[]) => mounted && setItems(r))
      .catch((e: unknown) => console.error('inventory fetch', e))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  function handleEdit(id: string) {
    setEditId(id);
    setOpen(true);
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Inventory</h2>
      {loading ? (
        <div>Yükleniyor...</div>
      ) : (
        <InventoryTable items={items} onEdit={handleEdit} />
      )}

      <Modal open={open} title={`Ürün düzenle: ${editId ?? ''}`} onClose={() => setOpen(false)}>
        <div>Burada düzenleme formu yer alacak (örnek).</div>
      </Modal>
    </div>
  );
};

export default InventoryPage;
