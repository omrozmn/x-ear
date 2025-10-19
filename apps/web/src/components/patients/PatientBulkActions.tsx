import React, { useState, useCallback, useMemo } from 'react'
import { 
  Tag, 
  MessageSquare, 
  Download, 
  Trash2, 
  Archive, 
  UserCheck, 
  UserX, 
  Mail, 
  FileText, 
  Calendar, 
  CheckSquare, 
  X, 
  AlertTriangle,
  Users,
  Send,
  Plus,
  Edit3
} from 'lucide-react'

interface PatientBulkActionsProps {
  selectedPatients: string[]
  totalPatients: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkAddTag: (tag: string) => Promise<void>
  onBulkRemoveTag: (tag: string) => Promise<void>
  onBulkSendSMS: (message: string, phoneNumbers: string[]) => Promise<void>
  onBulkSendEmail: (subject: string, message: string, emails: string[]) => Promise<void>
  onBulkExport: (format: 'csv' | 'excel' | 'pdf') => Promise<void>
  onBulkStatusChange: (status: 'active' | 'inactive' | 'archived') => Promise<void>
  onBulkDelete: () => Promise<void>
  onBulkScheduleAppointment: (appointmentData: any) => Promise<void>
  onBulkAssignToSegment: (segment: string) => Promise<void>
  availableTags?: string[]
  availableSegments?: string[]
  className?: string
  loading?: boolean
  disabled?: boolean
}

interface BulkAction {
  id: string
  name: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  description: string
  requiresConfirmation?: boolean
  requiresInput?: boolean
  inputType?: 'text' | 'textarea' | 'select' | 'multiselect'
  inputPlaceholder?: string
  inputOptions?: { value: string; label: string }[]
  category: 'communication' | 'data' | 'status' | 'organization' | 'dangerous'
  minSelection?: number
  maxSelection?: number
}

export const PatientBulkActions: React.FC<PatientBulkActionsProps> = ({
  selectedPatients,
  totalPatients,
  onSelectAll,
  onDeselectAll,
  onBulkAddTag,
  onBulkRemoveTag,
  onBulkSendSMS,
  onBulkSendEmail,
  onBulkExport,
  onBulkStatusChange,
  onBulkDelete,
  onBulkScheduleAppointment,
  onBulkAssignToSegment,
  availableTags = [],
  availableSegments = [],
  className = "",
  loading = false,
  disabled = false
}) => {
  const [showActionModal, setShowActionModal] = useState(false)
  const [currentAction, setCurrentAction] = useState<BulkAction | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [inputValues, setInputValues] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const selectedCount = selectedPatients.length
  const isAllSelected = selectedCount === totalPatients && totalPatients > 0

  // Define available bulk actions based on legacy system
  const bulkActions: BulkAction[] = useMemo(() => [
    // Communication Actions
    {
      id: 'add-tag',
      name: 'Etiket Ekle',
      icon: Tag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Seçili hastalara etiket ekle',
      requiresInput: true,
      inputType: 'select',
      inputPlaceholder: 'Etiket seçin veya yeni etiket yazın',
      inputOptions: availableTags.map(tag => ({ value: tag, label: tag })),
      category: 'organization',
      minSelection: 1
    },
    {
      id: 'remove-tag',
      name: 'Etiket Kaldır',
      icon: Tag,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Seçili hastalardan etiket kaldır',
      requiresInput: true,
      inputType: 'select',
      inputPlaceholder: 'Kaldırılacak etiketi seçin',
      inputOptions: availableTags.map(tag => ({ value: tag, label: tag })),
      category: 'organization',
      minSelection: 1
    },
    {
      id: 'send-sms',
      name: 'SMS Gönder',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Seçili hastalara SMS gönder',
      requiresInput: true,
      inputType: 'textarea',
      inputPlaceholder: 'SMS mesajınızı yazın...',
      category: 'communication',
      minSelection: 1,
      maxSelection: 100
    },
    {
      id: 'send-email',
      name: 'E-posta Gönder',
      icon: Mail,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Seçili hastalara e-posta gönder',
      requiresInput: true,
      inputType: 'textarea',
      inputPlaceholder: 'E-posta mesajınızı yazın...',
      category: 'communication',
      minSelection: 1,
      maxSelection: 50
    },
    
    // Data Actions
    {
      id: 'export-csv',
      name: 'CSV Dışa Aktar',
      icon: Download,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Seçili hastaları CSV formatında dışa aktar',
      category: 'data',
      minSelection: 1
    },
    {
      id: 'export-excel',
      name: 'Excel Dışa Aktar',
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Seçili hastaları Excel formatında dışa aktar',
      category: 'data',
      minSelection: 1
    },
    
    // Status Actions
    {
      id: 'activate',
      name: 'Aktifleştir',
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Seçili hastaları aktif duruma getir',
      requiresConfirmation: true,
      category: 'status',
      minSelection: 1
    },
    {
      id: 'deactivate',
      name: 'Pasifleştir',
      icon: UserX,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Seçili hastaları pasif duruma getir',
      requiresConfirmation: true,
      category: 'status',
      minSelection: 1
    },
    {
      id: 'archive',
      name: 'Arşivle',
      icon: Archive,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Seçili hastaları arşivle',
      requiresConfirmation: true,
      category: 'status',
      minSelection: 1
    },
    
    // Organization Actions
    {
      id: 'assign-segment',
      name: 'Segment Ata',
      icon: Users,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      description: 'Seçili hastaları bir segmente ata',
      requiresInput: true,
      inputType: 'select',
      inputPlaceholder: 'Segment seçin',
      inputOptions: availableSegments.map(segment => ({ value: segment, label: segment })),
      category: 'organization',
      minSelection: 1
    },
    {
      id: 'schedule-appointment',
      name: 'Randevu Planla',
      icon: Calendar,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      description: 'Seçili hastalar için randevu planla',
      requiresInput: true,
      inputType: 'text',
      inputPlaceholder: 'Randevu notları (opsiyonel)',
      category: 'organization',
      minSelection: 1,
      maxSelection: 20
    },
    
    // Dangerous Actions
    {
      id: 'delete',
      name: 'Sil',
      icon: Trash2,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Seçili hastaları kalıcı olarak sil',
      requiresConfirmation: true,
      category: 'dangerous',
      minSelection: 1
    }
  ], [availableTags, availableSegments])

  // Filter actions based on selection count
  const availableActions = useMemo(() => {
    return bulkActions.filter(action => {
      if (action.minSelection && selectedCount < action.minSelection) return false
      if (action.maxSelection && selectedCount > action.maxSelection) return false
      return true
    })
  }, [bulkActions, selectedCount])

  // Group actions by category
  const actionsByCategory = useMemo(() => {
    const grouped: Record<string, BulkAction[]> = {}
    availableActions.forEach(action => {
      if (!grouped[action.category]) {
        grouped[action.category] = []
      }
      grouped[action.category].push(action)
    })
    return grouped
  }, [availableActions])

  const categoryLabels = {
    communication: 'İletişim',
    data: 'Veri İşlemleri',
    status: 'Durum Değişiklikleri',
    organization: 'Organizasyon',
    dangerous: 'Tehlikeli İşlemler'
  }

  const handleActionClick = useCallback((action: BulkAction) => {
    if (disabled || loading) return

    setCurrentAction(action)
    setInputValue('')
    setInputValues({})
    
    if (action.requiresInput || action.requiresConfirmation) {
      setShowActionModal(true)
    } else {
      executeAction(action)
    }
  }, [disabled, loading])

  const executeAction = useCallback(async (action: BulkAction, inputData?: any) => {
    if (!action || selectedCount === 0) return

    setIsProcessing(true)
    
    try {
      switch (action.id) {
        case 'add-tag':
          await onBulkAddTag(inputData || inputValue)
          break
        case 'remove-tag':
          await onBulkRemoveTag(inputData || inputValue)
          break
        case 'send-sms':
          // In real implementation, you'd get phone numbers from selected patients
          await onBulkSendSMS(inputData || inputValue, [])
          break
        case 'send-email':
          // In real implementation, you'd get emails from selected patients
          await onBulkSendEmail('Toplu E-posta', inputData || inputValue, [])
          break
        case 'export-csv':
          await onBulkExport('csv')
          break
        case 'export-excel':
          await onBulkExport('excel')
          break
        case 'activate':
          await onBulkStatusChange('active')
          break
        case 'deactivate':
          await onBulkStatusChange('inactive')
          break
        case 'archive':
          await onBulkStatusChange('archived')
          break
        case 'assign-segment':
          await onBulkAssignToSegment(inputData || inputValue)
          break
        case 'schedule-appointment':
          await onBulkScheduleAppointment({ notes: inputData || inputValue })
          break
        case 'delete':
          await onBulkDelete()
          break
      }
      
      setShowActionModal(false)
      setCurrentAction(null)
    } catch (error) {
      console.error('Bulk action failed:', error)
      // Handle error (show toast, etc.)
    } finally {
      setIsProcessing(false)
    }
  }, [
    selectedCount,
    inputValue,
    onBulkAddTag,
    onBulkRemoveTag,
    onBulkSendSMS,
    onBulkSendEmail,
    onBulkExport,
    onBulkStatusChange,
    onBulkDelete,
    onBulkScheduleAppointment,
    onBulkAssignToSegment
  ])

  const handleConfirmAction = useCallback(() => {
    if (currentAction) {
      executeAction(currentAction, inputValue)
    }
  }, [currentAction, inputValue, executeAction])

  if (selectedCount === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center text-gray-500">
          <CheckSquare className="w-5 h-5 mr-2" />
          <span>Toplu işlem yapmak için hasta seçin</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">
              {selectedCount} hasta seçili
            </span>
            {selectedCount < totalPatients && (
              <button
                onClick={onSelectAll}
                className="ml-3 text-sm text-blue-600 hover:text-blue-800 underline"
                disabled={disabled || loading}
              >
                Tümünü seç ({totalPatients})
              </button>
            )}
          </div>
          <button
            onClick={onDeselectAll}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
            disabled={disabled || loading}
          >
            <X className="w-4 h-4 mr-1" />
            Seçimi temizle
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4">
        {Object.entries(actionsByCategory).map(([category, actions]) => (
          <div key={category} className="mb-6 last:mb-0">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {actions.map((action) => {
                const Icon = action.icon
                const isDisabled = disabled || loading || isProcessing
                const isDangerous = action.category === 'dangerous'
                
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    disabled={isDisabled}
                    className={`
                      relative p-3 rounded-lg border transition-all duration-200
                      ${isDisabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:shadow-md hover:-translate-y-0.5'
                      }
                      ${isDangerous 
                        ? 'border-red-200 hover:border-red-300 hover:bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                    title={action.description}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-8 h-8 ${action.bgColor} rounded-full flex items-center justify-center mb-2`}>
                        <Icon className={`w-4 h-4 ${action.color}`} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 leading-tight">
                        {action.name}
                      </span>
                    </div>
                    
                    {/* Selection limits indicator */}
                    {(action.minSelection || action.maxSelection) && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {action.maxSelection ? `≤${action.maxSelection}` : `≥${action.minSelection}`}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Modal */}
      {showActionModal && currentAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentAction.name}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isProcessing}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                {currentAction.description}
              </p>
              
              {currentAction.category === 'dangerous' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">
                      Bu işlem geri alınamaz!
                    </span>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <span className="text-sm text-blue-800">
                  <strong>{selectedCount}</strong> hasta etkilenecek
                </span>
              </div>

              {currentAction.requiresInput && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentAction.inputPlaceholder}
                  </label>
                  
                  {currentAction.inputType === 'textarea' ? (
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={currentAction.inputPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      disabled={isProcessing}
                    />
                  ) : currentAction.inputType === 'select' ? (
                    <div>
                      <select
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isProcessing}
                      >
                        <option value="">Seçin...</option>
                        {currentAction.inputOptions?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      
                      {/* Allow custom input for tags */}
                      {(currentAction.id === 'add-tag' || currentAction.id === 'remove-tag') && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Veya yeni etiket yazın..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isProcessing}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={currentAction.inputPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isProcessing}
                    />
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                İptal
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isProcessing || (currentAction.requiresInput && !inputValue.trim())}
                className={`
                  px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${currentAction.category === 'dangerous'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }
                  ${(isProcessing || (currentAction.requiresInput && !inputValue.trim()))
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                  }
                `}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    İşleniyor...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2 inline" />
                    {currentAction.name}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}