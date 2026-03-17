import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/sms/packages')({
    beforeLoad: () => {
        throw redirect({ to: '/plans' })
    },
})
