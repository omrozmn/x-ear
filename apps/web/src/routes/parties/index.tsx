import { createFileRoute } from '@tanstack/react-router'
import { PartiesPage } from '../../pages/PartiesPage'

export const Route = createFileRoute('/parties/')({
  component: PartiesPage,
})
