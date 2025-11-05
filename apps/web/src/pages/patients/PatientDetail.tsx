import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { 
  Button, 
  Badge, 
  Tabs,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert
} from '@x-ear/ui-web';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  MapPin,
  User,
  CreditCard,
  Activity,
  FileText,
  Settings,
  Heart,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Upload,
  Plus
} from 'lucide-react';
import { PatientSearchItem } from '../../types/patient/patient-search.types';
import { usePatients } from '../../hooks/usePatients';

interface PatientDetailProps {
  patientId?: string;
}

/**
 * PatientDetail Page
 * Displays comprehensive patient information with tabs for different sections
 */
export function PatientDetail({ patientId: propPatientId }: PatientDetailProps) {
  const { id: paramPatientId } = useParams({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const patientId = propPatientId || paramPatientId;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [patient, setPatient] = useState<PatientSearchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: patientsData } = usePatients({ page: 1, per_page: 200 });
  const patients = patientsData?.patients || [];

  useEffect(() => {
    if (!patientId) {
      setError('Hasta ID bulunamadı');
      setLoading(false);
      return;
    }

    loadPatient();
  }, [patientId]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Search for the specific patient by ID
      const foundPatient = patients.find(p => p.id === patientId) ?? null;
      
      if (foundPatient) {
        setPatient(foundPatient);
      } else {
        setError('Hasta bulunamadı');
      }
    } catch (err) {
      setError('Hasta bilgileri yüklenirken hata oluştu');
      console.error('Error loading patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate({ to: `/patients/${patientId}/edit` });
  };

  const handleDelete = () => {
    if (window.confirm('Bu hastayı silmek istediğinizden emin misiniz?')) {
      // TODO: Implement delete functionality
      console.log('Delete patient:', patientId);
      navigate({ to: '/patients' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Aktif</Badge>;
      case 'inactive':
        return <Badge variant="warning">Pasif</Badge>;
      case 'archived':
        return <Badge variant="secondary">Arşiv</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'standard':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'basic':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR')}`;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Hasta bulunamadı</h4>
            <p className="text-sm mt-1">Aradığınız hasta mevcut değil veya silinmiş olabilir.</p>
          </div>
        </Alert>
        
        <div className="mt-6">
          <Button onClick={() => navigate({ to: '/patients' })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Hasta Listesine Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate({ to: '/patients' })} 
            variant="secondary" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
          
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-medium">
            {getInitials(patient.firstName, patient.lastName)}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            
            <div className="flex items-center space-x-3 mt-1">
              {getStatusBadge(patient.status)}
              
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                getSegmentColor(patient.segment)
              }`}>
                {patient.segment}
              </span>
              
              {patient.priority > 0 && (
                <Badge variant="warning">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Yüksek Öncelik ({patient.priority})
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={handleEdit} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
          
          <Button onClick={handleDelete} variant="outline" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Kayıt Tarihi</p>
                <p className="font-medium">{formatDate(patient.registrationDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Cihaz Sayısı</p>
                <p className="font-medium">{patient.deviceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Sigorta</p>
                <p className="font-medium">{patient.hasInsurance ? 'Var' : 'Yok'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Bakiye</p>
                <p className={`font-medium ${patient.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {patient.outstandingBalance > 0 ? formatCurrency(patient.outstandingBalance) : 'Temiz'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="grid w-full grid-cols-6">
          <Tabs.Trigger value="overview">Genel Bakış</Tabs.Trigger>
          <Tabs.Trigger value="contact">İletişim</Tabs.Trigger>
          <Tabs.Trigger value="devices">Cihazlar</Tabs.Trigger>
          <Tabs.Trigger value="appointments">Randevular</Tabs.Trigger>
          <Tabs.Trigger value="notes">Notlar</Tabs.Trigger>
          <Tabs.Trigger value="documents">Belgeler</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Kişisel Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Ad Soyad</label>
                  <p className="text-gray-900">{patient.firstName} {patient.lastName}</p>
                </div>
                
                {patient.tcNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">TC Kimlik No</label>
                    <p className="text-gray-900">{patient.tcNumber}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Durum</label>
                  <div className="mt-1">{getStatusBadge(patient.status)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Segment</label>
                  <p className="text-gray-900 capitalize">{patient.segment}</p>
                </div>
              </CardContent>
            </Card>

            {/* Labels & Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Etiketler</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.labels && patient.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.labels.map((label, index) => (
                      <Badge key={index} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Henüz etiket eklenmemiş</p>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs.Content>

        <Tabs.Content value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                İletişim Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-600">Telefon</label>
                    <p className="text-gray-900">{patient.phone}</p>
                  </div>
                </div>
              )}
              
              {patient.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-600">E-posta</label>
                    <p className="text-gray-900">{patient.email}</p>
                  </div>
                </div>
              )}
              
              {!patient.phone && !patient.email && (
                <p className="text-gray-500 text-sm">İletişim bilgisi bulunmuyor</p>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Cihazlar ({patient.deviceCount})
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Cihaz Ekle
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.deviceCount > 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Cihaz detayları yükleniyor...</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz cihaz kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Randevular
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Randevu Ekle
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Randevu geçmişi yükleniyor...</p>
              </div>
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Notlar
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Not Ekle
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz not bulunmuyor</p>
              </div>
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Belgeler
                </div>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Belge Yükle
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz belge yüklenmemiş</p>
              </div>
            </CardContent>
          </Card>
        </Tabs.Content>
      </Tabs>
    </div>
  );
}