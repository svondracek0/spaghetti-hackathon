import { cn } from '@/lib/utils'
import type { PreparationStatus } from '@/types'

interface StatusBadgeProps {
    status: PreparationStatus
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
                status === 'Ready'
                    ? 'bg-ready/15 text-ready'
                    : 'bg-preparing/15 text-preparing',
                className
            )}
        >
            <span
                className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    status === 'Ready' ? 'bg-ready' : 'bg-preparing'
                )}
            />
            {status}
        </span>
    )
}
