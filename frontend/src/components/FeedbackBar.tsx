import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, Send, X } from 'lucide-react'
import type { Feedback } from '@/types'

interface FeedbackBarProps {
    feedbacks: Feedback[]
    onSubmit: (rating: number, comment: string) => Promise<void>
}

export function FeedbackBar({ feedbacks, onSubmit }: FeedbackBarProps) {
    const [selectedRating, setSelectedRating] = useState<number | null>(null)
    const [showComment, setShowComment] = useState(false)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const upCount = feedbacks.filter(f => f.rating > 0).length
    const downCount = feedbacks.filter(f => f.rating < 0).length

    async function handleRating(rating: number) {
        setSelectedRating(rating)
        setShowComment(true)
    }

    async function handleSubmit() {
        if (selectedRating === null) return
        setSubmitting(true)
        try {
            await onSubmit(selectedRating, comment)
            setSubmitted(true)
            setShowComment(false)
            setComment('')
        } catch {
            // keep form open on error
        } finally {
            setSubmitting(false)
        }
    }

    async function handleQuickSubmit(rating: number) {
        // Double-click submits without comment
        setSubmitting(true)
        try {
            await onSubmit(rating, '')
            setSubmitted(true)
            setShowComment(false)
        } catch {
            // ignore
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-secondary/50 border border-border/50">
                <span className="text-sm text-muted-foreground">Thanks for your feedback!</span>
                {upCount + (selectedRating === 1 ? 1 : 0) > 0 && (
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5">
                        <ThumbsUp className="h-3 w-3" /> {upCount + (selectedRating === 1 ? 1 : 0)}
                    </span>
                )}
                {downCount + (selectedRating === -1 ? 1 : 0) > 0 && (
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5">
                        <ThumbsDown className="h-3 w-3" /> {downCount + (selectedRating === -1 ? 1 : 0)}
                    </span>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-secondary/30 border border-border/50">
                <span className="text-sm text-muted-foreground">Was this preparation helpful?</span>
                <div className="flex items-center gap-1">
                    {feedbacks.length > 0 && (
                        <span className="text-xs text-muted-foreground/50 mr-2">
                            {upCount > 0 && `${upCount} 👍`}
                            {upCount > 0 && downCount > 0 && ' · '}
                            {downCount > 0 && `${downCount} 👎`}
                        </span>
                    )}
                    <Button
                        variant={selectedRating === 1 ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRating(1)}
                        onDoubleClick={() => handleQuickSubmit(1)}
                        disabled={submitting}
                    >
                        <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={selectedRating === -1 ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRating(-1)}
                        onDoubleClick={() => handleQuickSubmit(-1)}
                        disabled={submitting}
                    >
                        <ThumbsDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {showComment && selectedRating !== null && (
                <div className="flex gap-2 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                    <textarea
                        className="flex-1 min-h-[60px] rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="Optional: Tell us what could be improved..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        autoFocus
                    />
                    <div className="flex flex-col gap-1">
                        <Button
                            size="sm"
                            className="h-8"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            <Send className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => { setShowComment(false); setSelectedRating(null) }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
