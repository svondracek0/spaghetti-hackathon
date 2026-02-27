import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import type { Preparation } from '@/types'
import { Calendar } from 'lucide-react'

interface PrepCardProps {
    preparation: Preparation
    isSelected: boolean
    onClick: () => void
}

export function PrepCard({ preparation, isSelected, onClick }: PrepCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer',
                'hover:bg-accent/50 hover:border-accent-foreground/10',
                isSelected
                    ? 'bg-accent border-primary/30 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
                    : 'bg-transparent border-transparent'
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-medium text-sm text-foreground truncate flex-1">
                    {preparation.title || 'Untitled Preparation'}
                </h3>
                <StatusBadge status={preparation.status} />
            </div>

            {preparation.topic && (
                <p className="text-xs text-muted-foreground truncate mb-1.5">
                    {preparation.topic}
                </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                {preparation.debateDate && (
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(preparation.debateDate).toLocaleDateString()}
                    </span>
                )}
                {preparation.opponents.length > 0 && (
                    <span>
                        {preparation.opponents.length} opponent{preparation.opponents.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
        </button>
    )
}
