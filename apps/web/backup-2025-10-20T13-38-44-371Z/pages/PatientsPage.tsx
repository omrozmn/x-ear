/**
 * PatientsPage Component
 * @fileoverview Main patients management page with search, filters, and patient list
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@x-ear/ui-web';
import { useNavigate, Outlet, useParams } from '@tanstack/react-router';
import { usePatients } from '../hooks/usePatients';
import { Patient } from '../types/patient';
import { Users, CheckCircle, Flame, Headphones, Filter, Search, Plus, RefreshCw, Upload } from 'lucide-react';

export function PatientsPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ strict: false }) as { patientId?: string };

  // State
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // Hooks
  const {
    patients,
    isLoading,
    error
  } = usePatients();

  // Mock stats for now
  const stats = {
    total: patients?.length || 0,
    active: patients?.filter(p => p.status === 'active').length || 0,
    inactive: patients?.filter(p => p.status === 'inactive').length || 0,
    withDevices: 0
  };

  // Handlers
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleRefresh = () => {
    // refetch is not available in this hook, we'll use a different approach
    window.location.reload();
  };

  const handleNewPatient = () => {
    setShowNewPatientModal(true);
  };

  const handlePatientSelect = (patientId: string, selected: boolean) => {
    if (selected) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  };

  const handleViewPatient = (patient: Patient) => {
    navigate({ to: `/patients/${patient.id}` });
  };

  // Filter patients based on search
  const filteredPatients = patients.filter(patient => {
    if (!searchValue) return true;
    const searchLower = searchValue.toLowerCase();
    return (
      patient.firstName?.toLowerCase().includes(searchLower) ||
      patient.lastName?.toLowerCase().includes(searchLower) ||
      patient.tcNumber?.toLowerCase().includes(searchLower) ||
      patient.phone?.toLowerCase().includes(searchLower)
    );
  });

  if (patientId) {
    return <Outlet />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hastalar</h1>
          <p className="text-gray-600">Hasta kayıtlarını yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button onClick={handleNewPatient}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Hasta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Toplam Hasta</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Flame className="w-8 h-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pasif</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Headphones className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Cihazlı</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withDevices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Hasta Listesi</TabsTrigger>
          <TabsTrigger value="bulk">Toplu İşlemler</TabsTrigger>
          <TabsTrigger value="search">Gelişmiş Arama</TabsTrigger>
          <TabsTrigger value="matching">Hasta Eşleştirme</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Hasta ara (ad, soyad, TC, telefon)..."
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtreler
            </Button>
          </div>

          {/* Patient List */}
          <div className="bg-white rounded-lg border">
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <p className="text-red-600">Hata: {typeof error === 'string' ? error : 'Bir hata oluştu'}</p>
              </div>
            )}
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Hastalar yükleniyor...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPatients(filteredPatients.map(p => p.id!));
                            } else {
                              setSelectedPatients([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Ad Soyad</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TC Kimlik</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Telefon</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Durum</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Kayıt Tarihi</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {searchValue ? 'Arama kriterlerine uygun hasta bulunamadı.' : 'Henüz hasta kaydı bulunmuyor.'}
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={selectedPatients.includes(patient.id!)}
                              onChange={(e) => handlePatientSelect(patient.id!, e.target.checked)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {patient.tcNumber}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {patient.phone}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              patient.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {patient.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPatient(patient)}
                            >
                              Görüntüle
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Toplu İşlemler</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV Dosyası Yükle
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    CSV dosyasını sürükleyip bırakın veya seçin
                  </p>
                  <Button variant="outline" className="mt-2">
                    Dosya Seç
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Gelişmiş Arama</h3>
            <p className="text-gray-600">Gelişmiş arama özellikleri yakında eklenecek.</p>
          </div>
        </TabsContent>

        <TabsContent value="matching" className="space-y-4">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Hasta Eşleştirme</h3>
            <p className="text-gray-600">Hasta eşleştirme özellikleri yakında eklenecek.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}