import React, { Suspense, useState } from 'react';
import { PatientList } from '@/components/patients/PatientList';
import { PatientSearch, PatientSearchFilters } from '@/components/patients/PatientSearch';
import { PatientFilters } from '@/components/patients/PatientFilters';
import { PatientBulkActions } from '@/components/patients/PatientBulkActions';
import { PatientStats } from '@/components/patients/stats/PatientStats';
import { PatientCSVUpload } from '@/components/patients/csv/PatientCSVUpload';
import { PatientSavedViews } from '@/components/patients/views/PatientSavedViews';
import { PatientBulkOperations } from '@/components/patients/PatientBulkOperations';
import { PatientAdvancedSearch } from '@/components/patients/PatientAdvancedSearch';
import { PatientMatching } from '@/components/patients/PatientMatching';
import { Tabs } from '@x-ear/ui-web';

export function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<PatientSearchFilters>({});
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  // Mock stats data until we have real stats
  const mockStats = {
    total: patients?.length || 0,
    active: patients?.filter(p => p.status === 'active')?.length || 0,
    inactive: patients?.filter(p => p.status === 'inactive')?.length || 0,
    newThisMonth: 0
  };

  const handleCSVUpload = async (file: File) => {
    // TODO: Implement CSV upload logic
    console.log('CSV upload:', file);
  };

  const handleSaveView = (name: string, filters: Record<string, any>) => {
    // TODO: Implement save view logic
    console.log('Save view:', name, filters);
  };

  const handleSelectView = (viewId: string) => {
    // TODO: Implement select view logic
    console.log('Select view:', viewId);
  };

  const handleUpdateView = (viewId: string, name: string, filters: Record<string, any>) => {
    // TODO: Implement update view logic
    console.log('Update view:', viewId, name, filters);
  };

  const handleDeleteView = (viewId: string) => {
    // TODO: Implement delete view logic
    console.log('Delete view:', viewId);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  // Bulk action handlers
  const handleSelectAll = () => {
    setSelectedPatients(patients.map(p => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPatients([]);
  };

  const handleBulkAddTag = async (tag: string) => {
    console.log('Bulk add tag:', tag, selectedPatients);
  };

  const handleBulkRemoveTag = async (tag: string) => {
    console.log('Bulk remove tag:', tag, selectedPatients);
  };

  const handleBulkSendSMS = async (message: string, phoneNumbers: string[]) => {
    console.log('Bulk send SMS:', message, phoneNumbers);
  };

  const handleBulkSendEmail = async (subject: string, message: string, emails: string[]) => {
    console.log('Bulk send email:', subject, message, emails);
  };

  const handleBulkExport = async (format: 'csv' | 'excel' | 'pdf') => {
    console.log('Bulk export:', format, selectedPatients);
  };

  const handleBulkStatusChange = async (status: 'active' | 'inactive' | 'archived') => {
    console.log('Bulk status change:', status, selectedPatients);
  };

  const handleBulkDelete = async () => {
    console.log('Bulk delete:', selectedPatients);
  };

  const handleBulkScheduleAppointment = async (appointmentData: any) => {
    console.log('Bulk schedule appointment:', appointmentData, selectedPatients);
  };

  const handleBulkAssignToSegment = async (segment: string) => {
    console.log('Bulk assign to segment:', segment, selectedPatients);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b">
        <h1 className="text-2xl font-semibold">Hastalar</h1>
        <PatientCSVUpload onUpload={handleCSVUpload} />
      </div>

      {/* Stats */}
      <PatientStats stats={mockStats} />

      {/* Phase 3 Features - Tabs */}
      <Tabs defaultValue="list" className="flex-1 flex flex-col">
        <Tabs.List className="px-6 pt-4">
          <Tabs.Trigger value="list">Hasta Listesi</Tabs.Trigger>
          <Tabs.Trigger value="bulk">Toplu İşlemler</Tabs.Trigger>
          <Tabs.Trigger value="search">Gelişmiş Arama</Tabs.Trigger>
          <Tabs.Trigger value="matching">Hasta Eşleştirme</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="list" className="flex-1 flex flex-col">
          {/* Filters & Search */}
          <div className="p-6 space-y-4">
            <PatientSavedViews 
              savedViews={[]}
              onSelectView={handleSelectView}
              onSaveView={handleSaveView}
              onUpdateView={handleUpdateView}
              onDeleteView={handleDeleteView}
              currentFilters={filters}
            />
            <PatientSearch 
              value={searchValue}
              onChange={setSearchValue}
            />
            <PatientFilters 
              filters={filters}
              onChange={setFilters}
              onClearFilters={handleClearFilters}
            />
            <PatientBulkActions 
              selectedPatients={selectedPatients}
              totalPatients={patients.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkAddTag={handleBulkAddTag}
              onBulkRemoveTag={handleBulkRemoveTag}
              onBulkSendSMS={handleBulkSendSMS}
              onBulkSendEmail={handleBulkSendEmail}
              onBulkExport={handleBulkExport}
              onBulkStatusChange={handleBulkStatusChange}
              onBulkDelete={handleBulkDelete}
              onBulkScheduleAppointment={handleBulkScheduleAppointment}
              onBulkAssignToSegment={handleBulkAssignToSegment}
            />
          </div>

          {/* Patient List */}
          <div className="flex-1 p-6">
            <PatientList patients={patients || []} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="bulk" className="flex-1 p-6">
          <PatientBulkOperations />
        </Tabs.Content>

        <Tabs.Content value="search" className="flex-1 p-6">
          <PatientAdvancedSearch />
        </Tabs.Content>

        <Tabs.Content value="matching" className="flex-1 p-6">
          <PatientMatching />
        </Tabs.Content>
      </Tabs>
    </div>
  );
}