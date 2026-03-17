import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/label-templates')({
    beforeLoad: () => {
        throw redirect({ to: '/barcodes' })
    },
})
