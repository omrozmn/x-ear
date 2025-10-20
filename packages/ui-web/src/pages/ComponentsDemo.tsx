import React, { useState } from 'react';
import { 
  Layout, 
  Modal, 
  useModal, 
  StatsCard, 
  createPatientStats, 
  createInventoryStats,
  DataTable,
  DynamicForm 
} from '../components';
import { 
  Users, 
  Package, 
  Calendar, 
  TrendingUp, 
  Edit, 
  Trash2, 
  Eye,
  Plus,
  Settings
} from 'lucide-react';
import type { Column, TableAction, BulkAction, FormField, FormSection } from '../components';

// Sample data for DataTable
const samplePatients = [
  { id: 1, name: 'Ahmet Yılmaz', phone: '0532 123 4567', email: 'ahmet@example.com', status: 'Aktif', lastVisit: '2024-01-15' },
  { id: 2, name: 'Fatma Kaya', phone: '0533 234 5678', email: 'fatma@example.com', status: 'Beklemede', lastVisit: '2024-01-10' },
  { id: 3, name: 'Mehmet Demir', phone: '0534 345 6789', email: 'mehmet@example.com', status: 'Aktif', lastVisit: '2024-01-12' },
  { id: 4, name: 'Ayşe Şahin', phone: '0535 456 7890', email: 'ayse@example.com', status: 'Pasif', lastVisit: '2023-12-20' },
  { id: 5, name: 'Ali Özkan', phone: '0536 567 8901', email: 'ali@example.com', status: 'Aktif', lastVisit: '2024-01-14' },
];

const ComponentsDemo: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<(string | number)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { isOpen: isModalOpen, openModal, closeModal } = useModal();
  const { isOpen: isFormModalOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();

  // User data for header
  const user = {
    name: 'Dr. Örnek Kullanıcı',
    email: 'ornek@xear.com',
    avatar: 'https://ui-avatars.com/api/?name=Dr+Örnek+Kullanıcı&background=3b82f6&color=fff',
  };

  // Navigation items for sidebar - removed unused variable

  // Table columns
  const columns: Column[] = [
    {
      key: 'name',
      title: 'Hasta Adı',
      sortable: true,
      render: (value: string, record: any) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-blue-600 font-medium text-sm">
              {value.split(' ').map((n: string) => n[0]).join('')}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{value}</div>
            <div className="text-sm text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      title: 'Telefon',
      sortable: true,
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Aktif' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : value === 'Beklemede'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'lastVisit',
      title: 'Son Ziyaret',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('tr-TR'),
    },
  ];

  // Table actions
  const actions: TableAction[] = [
    {
      key: 'view',
      label: 'Görüntüle',
      icon: <Eye className="w-4 h-4" />,
      onClick: (record: any) => console.log('Viewing:', record),
      variant: 'secondary',
    },
    {
      key: 'edit',
      label: 'Düzenle',
      icon: <Edit className="w-4 h-4" />,
      onClick: (record: any) => console.log('Editing:', record),
      variant: 'primary',
    },
    {
      key: 'delete',
      label: 'Sil',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (record: any) => console.log('Deleting:', record),
      variant: 'danger',
    },
  ];

  // Bulk actions
  const bulkActions: BulkAction[] = [
    {
      key: 'activate',
      label: 'Aktifleştir',
      icon: <Plus className="w-4 h-4" />,
      onClick: (records: any[]) => console.log('Activating:', records),
      variant: 'primary',
    },
    {
      key: 'delete',
      label: 'Toplu Sil',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (records: any[]) => console.log('Bulk deleting:', records),
      variant: 'danger',
    },
  ];

  // Form fields for DynamicForm demo
  const formFields: FormField[] = [
    {
      name: 'firstName',
      label: 'Ad',
      type: 'text',
      required: true,
      placeholder: 'Adınızı girin',
    },
    {
      name: 'lastName',
      label: 'Soyad',
      type: 'text',
      required: true,
      placeholder: 'Soyadınızı girin',
    },
    {
      name: 'email',
      label: 'E-posta',
      type: 'email',
      required: true,
      placeholder: 'ornek@email.com',
      validation: {
        pattern: '^[^@]+@[^@]+\\.[^@]+$',
      },
    },
    {
      name: 'phone',
      label: 'Telefon',
      type: 'tel',
      placeholder: '0532 123 4567',
    },
    {
      name: 'birthDate',
      label: 'Doğum Tarihi',
      type: 'date',
    },
    {
      name: 'gender',
      label: 'Cinsiyet',
      type: 'select',
      options: [
        { label: 'Erkek', value: 'male' },
        { label: 'Kadın', value: 'female' },
        { label: 'Belirtmek istemiyorum', value: 'other' },
      ],
    },
    {
      name: 'notes',
      label: 'Notlar',
      type: 'textarea',
      rows: 3,
      placeholder: 'Ek notlar...',
    },
    {
      name: 'newsletter',
      label: 'E-posta bültenine abone ol',
      type: 'checkbox',
    },
  ];

  const formSections: FormSection[] = [
    {
      title: 'Kişisel Bilgiler',
      description: 'Temel kişisel bilgilerinizi girin',
      fields: formFields.slice(0, 5),
    },
    {
      title: 'İletişim Tercihleri',
      description: 'İletişim ve tercih ayarlarınız',
      fields: formFields.slice(5),
      collapsible: true,
    },
  ];

  const handleFormSubmit = (data: Record<string, any>) => {
    console.log('Form submitted:', data);
    closeFormModal();
  };

  const patientStats = createPatientStats();
  const inventoryStats = createInventoryStats();

  // Update stats with sample data
  patientStats[0].value = samplePatients.length.toString();
  patientStats[1].value = samplePatients.filter(p => p.status === 'Aktif').length.toString();
  patientStats[2].value = samplePatients.filter(p => p.status === 'Beklemede').length.toString();
  patientStats[3].value = '2';

  return (
    <Layout
      user={user}
      currentPath="/demo"
    >
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            UI Bileşenleri Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            X-Ear uygulaması için oluşturulan modern React bileşenlerinin demo sayfası
          </p>
        </div>

        {/* Stats Cards Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            İstatistik Kartları
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {patientStats.map((stat: any, index: number) => (
              <StatsCard
                key={index}
                {...stat}
                trend={index === 0 ? { value: '+12%', direction: 'up', period: 'Bu ay' } : undefined}
                clickable
                onClick={() => console.log(`Clicked stat: ${stat.title}`)}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {inventoryStats.map((stat: any, index: number) => (
              <StatsCard
                key={index}
                {...stat}
                trend={index === 2 ? { value: '₺15,420', direction: 'up', period: 'Bu ay' } : undefined}
              />
            ))}
          </div>
        </section>

        {/* Modal Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Modal Bileşenleri
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={openModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Basit Modal Aç
            </button>
            <button
              onClick={openFormModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Form Modal Aç
            </button>
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            onSave={() => {
              console.log('Modal saved');
              closeModal();
            }}
            title="Örnek Modal"
            size="md"
          >
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-400">
                Bu bir örnek modal içeriğidir. Modal bileşeni farklı boyutlarda, 
                özelleştirilebilir footer'lar ile kullanılabilir.
              </p>
            </div>
          </Modal>

          <Modal
            isOpen={isFormModalOpen}
            onClose={closeFormModal}
            title="Hasta Bilgileri"
            size="lg"
            showFooter={false}
          >
            <div className="p-4">
              <DynamicForm
                sections={formSections}
                onSubmit={handleFormSubmit}
                onCancel={closeFormModal}
                submitText="Hasta Kaydet"
                cancelText="İptal"
              />
            </div>
          </Modal>
        </section>

        {/* DataTable Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Veri Tablosu
          </h2>
          <DataTable
            data={samplePatients}
            columns={columns}
            actions={actions}
            bulkActions={bulkActions}
            searchable
            sortable
            rowSelection={{
              selectedRowKeys: selectedPatients,
              onChange: (keys: any[], rows: any[]) => {
                setSelectedPatients(keys);
                console.log('Selected patients:', rows);
              },
            }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: samplePatients.length,
              showSizeChanger: true,
              onChange: (page: number, size?: number) => {
                setCurrentPage(page);
                setPageSize(size || pageSize);
              },
            }}
            onSearch={(value: string) => console.log('Search:', value)}
            onSort={(key: string, direction: 'asc' | 'desc' | null) => console.log('Sort:', key, direction)}
            hoverable
            striped
          />
        </section>

        {/* Form Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Dinamik Form
          </h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <DynamicForm
              fields={formFields}
              onSubmit={(data) => console.log('Form data:', data)}
              onReset={() => console.log('Form reset')}
              submitText="Kaydet"
              resetText="Temizle"
              validateOnChange
            />
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ComponentsDemo;