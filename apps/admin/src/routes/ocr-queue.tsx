import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/ocr-queue')({
    beforeLoad: () => {
        throw redirect({ to: '/activity-logs' })
    },
})
