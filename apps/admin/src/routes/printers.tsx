import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/printers')({
    beforeLoad: () => {
        throw redirect({ to: '/barcodes' })
    },
})
