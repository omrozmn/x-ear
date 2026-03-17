import { createFileRoute } from '@tanstack/react-router'
import { SGKDownloadsPage } from '../../pages/sgk/SGKDownloadsPage'
import { ModuleGate } from '../../components/common/ModuleGate'

function GatedSGKDownloads() {
  return (
    <ModuleGate module="sgk">
      <SGKDownloadsPage />
    </ModuleGate>
  )
}

export const Route = createFileRoute('/sgk/downloads')({
  component: GatedSGKDownloads,
})