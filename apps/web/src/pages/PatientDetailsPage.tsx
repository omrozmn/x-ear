import { Button } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Patient } from '../types/patient';
import { usePatient } from '../hooks/usePatients';
import { PatientHeader } from '../components/patients/PatientHeader';
import { PatientTabs, PatientTab } from '../components/patients/PatientTabs';
import { PatientTabContent } from '../components/patients/PatientTabContent';

export function PatientDetailsPage() {
  const { patientId } = useParams({ strict: false }) as { patientId?: string };
  const navigate = useNavigate();
  const { patient, loading, error } = usePatient(patientId || null);
  const [activeTab, setActiveTab] = useState<PatientTab>('general');

  useEffect(() => {
    // URL'den tab parametresini oku
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') as PatientTab;
    if (tabParam && ['general', 'devices', 'sales', 'sgk', 'documents', 'timeline', 'notes', 'appointments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabChange = (tab: PatientTab) => {
    setActiveTab(tab);
    // URL'yi güncelle
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleBackToList = () => {
    navigate({ to: '/patients' });
  };

  const handlePatientUpdate = async () => {
    // Hasta güncellendiğinde yapılacak işlemler
    console.log('Patient updated');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                <div className="h-8 w-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Content Skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex space-x-8 border-b border-gray-200 mb-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 w-20 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 w-full bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hasta Bulunamadı</h2>
          <p className="text-gray-600 mb-4">
            {typeof error === 'string' ? error : 'Belirtilen hasta bulunamadı veya erişim izniniz yok.'}
          </p>
          <Button
            onClick={handleBackToList}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            variant='default'>
            Hasta Listesine Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Button
              onClick={handleBackToList}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
              variant='default'>
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Hasta Listesi
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hasta Detayları</h1>
              <p className="mt-1 text-sm text-gray-500">
                {patient.firstName && patient.lastName 
                  ? `${patient.firstName} ${patient.lastName}` 
                  : patient.name || 'İsimsiz Hasta'}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Patient Header Card */}
        <PatientHeader 
          patient={patient} 
          onEdit={() => {
            // TODO: Implement edit functionality
            console.log('Edit patient:', patient.id);
          }}
          onCall={() => {
            // TODO: Implement call functionality
            if (patient.phone) {
              window.open(`tel:${patient.phone}`);
            }
          }}
          onDelete={() => {
            // TODO: Implement delete functionality with confirmation
            if (window.confirm('Bu hastayı silmek istediğinizden emin misiniz?')) {
              console.log('Delete patient:', patient.id);
            }
          }}
          onPrint={() => {
            // TODO: Implement print functionality
            window.print();
          }}
          onExport={() => {
            // TODO: Implement export functionality
            console.log('Export patient data:', patient.id);
          }}
          onSendSMS={() => {
            // TODO: Implement SMS functionality
            console.log('Send SMS to patient:', patient.id);
          }}
          onCopyInfo={() => {
            // TODO: Implement copy info functionality
            const info = `${patient.firstName} ${patient.lastName}\nTelefon: ${patient.phone}\nE-posta: ${patient.email}`;
            navigator.clipboard.writeText(info);
          }}
          onGenerateReport={() => {
            // TODO: Implement report generation
            console.log('Generate report for patient:', patient.id);
          }}
        />

        {/* Tabs and Content */}
        <div className="bg-white rounded-lg shadow mt-6">
          <PatientTabs 
            activeTab={activeTab}
            onTabChange={handleTabChange}
            patient={patient}
          />
          
          <div className="p-6">
            <PatientTabContent 
              activeTab={activeTab}
              patient={patient}
            />
          </div>
        </div>
      </div>
    </div>
  );
}