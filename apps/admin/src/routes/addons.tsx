import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/addons')({
    beforeLoad: () => {
        throw redirect({ to: '/plans' })
    },
})
