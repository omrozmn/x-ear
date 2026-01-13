import { createFileRoute } from '@tanstack/react-router'
import { PatientDetailsPage } from '../../pages/PatientDetailsPage'

export const Route = createFileRoute('/patients/$patientId')({
  component: PatientDetailsPage,
  loader: async ({ params }) => {
    // Patient ID validation
    if (!params.patientId) {
      throw new Error('Patient ID is required')
    }

    return {
      patientId: params.patientId
    }
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Hasta Bulunamadı</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error?.message || 'Belirtilen hasta bulunamadı veya erişim izniniz yok.'}
        </p>
        <a
          href="/patients"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Hasta Listesine Dön
        </a>
      </div>
    </div>
  )
})