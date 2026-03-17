import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/sms/headers')({
    beforeLoad: () => {
        throw redirect({ to: '/plans' })
    },
})
