import { createFileRoute } from '@tanstack/react-router'
import FileManager from '../pages/admin/FileManager'

export const Route = createFileRoute('/files')({
    component: FileManager,
})
