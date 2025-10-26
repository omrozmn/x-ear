import { createFileRoute } from '@tanstack/react-router'
import { SGKDownloadsPage } from '../../pages/sgk/SGKDownloadsPage'

export const Route = createFileRoute('/sgk/downloads')({
  component: SGKDownloadsPage,
})