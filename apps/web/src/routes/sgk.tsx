import { createFileRoute } from '@tanstack/react-router'
import SGKPage from '../pages/sgk/SGKPage'

export const Route = createFileRoute('/sgk')({
  component: SGKPage,
})
