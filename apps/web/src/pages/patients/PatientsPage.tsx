// @ts-nocheck
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
import { usePatients } from '../../hooks/patient/usePatients';

export function PatientsPage() {
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<PatientSearchFilters>({});
  const [selectedPatients, setSelectedPatients] = useState<Patient[]>([]);

  // Use the patients hook to fetch data
  const { data: patientsData, isLoading, error } = usePatients({
    page: 1,
    per_page: 50, // Show more patients per page
    search: searchValue || undefined,
    status: filters.status || undefined
  });

  const patients = patientsData?.patients || [];
  const totalPatients = patientsData?.total || 0;

  // Mock stats data until we have real stats
  const mockStats = {
    total: totalPatients,
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
      {/* <PatientStats stats={mockStats} /> */}

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
              totalPatients={totalPatients}
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
            <PatientList 
              patients={patients || []} 
              loading={isLoading}
            />
          </div>
        </Tabs.Content>

        <Tabs.Content value="bulk" className="flex-1 p-6">
          <PatientBulkOperations 
            selectedPatients={selectedPatients}
            onClearSelection={() => setSelectedPatients([])}
            onRefresh={() => {}}
          />
        </Tabs.Content>

        <Tabs.Content value="search" className="flex-1 p-6">
          <PatientAdvancedSearch 
            patients={patients || []}
            onFilteredResults={(results) => setPatients(results)}
            onClearFilters={() => setFilters({})}
          />
        </Tabs.Content>

        <Tabs.Content value="matching" className="flex-1 p-6">
          <PatientMatching 
            patients={patients || []}
            onMergePatients={(patientIds, targetId) => console.log('Merge:', patientIds, targetId)}
            onRefresh={() => {}}
          />
        </Tabs.Content>
      </Tabs>
    </div>
  );
}