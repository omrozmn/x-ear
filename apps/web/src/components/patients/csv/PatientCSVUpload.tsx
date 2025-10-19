import React, { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'

interface PatientCSVUploadProps {
  onUpload?: (file: File) => Promise<void>
  className?: string
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message?: string
  progress?: number
}

export const PatientCSVUpload: React.FC<PatientCSVUploadProps> = ({
  onUpload,
  className = ""
}) => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus({
        status: 'error',
        message: 'Lütfen sadece CSV dosyası yükleyin'
      })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({
        status: 'error',
        message: 'Dosya boyutu 10MB\'dan küçük olmalıdır'
      })
      return
    }

    try {
      setUploadStatus({ status: 'uploading', progress: 0 })
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: Math.min((prev.progress || 0) + 10, 90)
        }))
      }, 200)

      if (onUpload) {
        await onUpload(file)
      }

      clearInterval(progressInterval)
      setUploadStatus({
        status: 'success',
        message: `${file.name} başarıyla yüklendi`
      })

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus({ status: 'idle' })
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 3000)

    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: 'Dosya yüklenirken hata oluştu'
      })
    }
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  const resetUpload = () => {
    setUploadStatus({ status: 'idle' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          CSV Dosyası Yükle
        </h3>
        <p className="text-sm text-gray-600">
          Hasta verilerini toplu olarak içe aktarmak için CSV dosyası yükleyin
        </p>
      </div>

      {uploadStatus.status === 'idle' && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
            dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <button
                type="button"
                onClick={onButtonClick}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Dosya seçin
              </button>
              {' '}veya sürükleyip bırakın
            </p>
            <p className="text-xs text-gray-500 mt-1">
              CSV dosyası, maksimum 10MB
            </p>
          </div>
        </div>
      )}

      {uploadStatus.status === 'uploading' && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 mb-2">Dosya yükleniyor...</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadStatus.progress || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            %{uploadStatus.progress || 0} tamamlandı
          </p>
        </div>
      )}

      {uploadStatus.status === 'success' && (
        <div className="text-center py-6">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-sm text-green-600 font-medium">
            {uploadStatus.message}
          </p>
          <button
            onClick={resetUpload}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Yeni dosya yükle
          </button>
        </div>
      )}

      {uploadStatus.status === 'error' && (
        <div className="text-center py-6">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-sm text-red-600 font-medium mb-3">
            {uploadStatus.message}
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={resetUpload}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              İptal
            </button>
            <button
              onClick={onButtonClick}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      )}

      {/* CSV Format Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              CSV Format Bilgisi
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              CSV dosyanız aşağıdaki sütunları içermelidir:
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>• <code className="bg-gray-200 px-1 rounded">firstName</code> - Ad (zorunlu)</div>
              <div>• <code className="bg-gray-200 px-1 rounded">lastName</code> - Soyad (zorunlu)</div>
              <div>• <code className="bg-gray-200 px-1 rounded">tcNumber</code> - TC Kimlik No</div>
              <div>• <code className="bg-gray-200 px-1 rounded">phone</code> - Telefon</div>
              <div>• <code className="bg-gray-200 px-1 rounded">email</code> - E-posta</div>
              <div>• <code className="bg-gray-200 px-1 rounded">birthDate</code> - Doğum Tarihi (YYYY-MM-DD)</div>
              <div>• <code className="bg-gray-200 px-1 rounded">gender</code> - Cinsiyet (M/F)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}