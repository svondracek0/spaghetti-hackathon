import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Link2, Check, Lock, Globe, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Preparation } from '@/types'

interface ShareDialogProps {
    preparation: Preparation
    onUpdate: (updated: Preparation) => void
}

export function ShareDialog({ preparation, onUpdate }: ShareDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const isShared = !!preparation.shareToken

    const shareUrl = isShared
        ? `${window.location.origin}/shared/${preparation.shareToken}`
        : null

    async function handleToggleShare() {
        setLoading(true)
        try {
            if (isShared) {
                await api.unsharePreparation(preparation.id)
                onUpdate({ ...preparation, shareToken: null })
            } else {
                const { shareToken } = await api.sharePreparation(preparation.id)
                onUpdate({ ...preparation, shareToken })
            }
        } catch (err) {
            console.error('Share toggle failed:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleCopy() {
        if (!shareUrl) return
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback
            const textarea = document.createElement('textarea')
            textarea.value = shareUrl
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(!open)}
                className={isShared ? 'border-primary/40 text-primary' : ''}
            >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Share
            </Button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

                    {/* Dialog */}
                    <div className="absolute right-0 top-full mt-2 w-[340px] bg-card border border-border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-sm">Share this preparation</h3>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {/* Privacy options */}
                            <div className="space-y-1 mb-4">
                                <button
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                        !isShared ? 'bg-secondary/60' : 'hover:bg-secondary/30'
                                    }`}
                                    onClick={() => isShared && handleToggleShare()}
                                    disabled={loading}
                                >
                                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium">Private</p>
                                        <p className="text-xs text-muted-foreground">Only you can view</p>
                                    </div>
                                    {!isShared && <Check className="h-4 w-4 text-primary ml-auto" />}
                                </button>

                                <button
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                        isShared ? 'bg-secondary/60' : 'hover:bg-secondary/30'
                                    }`}
                                    onClick={() => !isShared && handleToggleShare()}
                                    disabled={loading}
                                >
                                    <Globe className="h-4 w-4 text-primary shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-primary">Anyone with the link</p>
                                        <p className="text-xs text-muted-foreground">Anyone with the link can view &amp; give feedback</p>
                                    </div>
                                    {isShared && <Check className="h-4 w-4 text-primary ml-auto" />}
                                </button>
                            </div>

                            {/* Link copied confirmation */}
                            {isShared && copied && (
                                <div className="flex items-center gap-2 text-sm text-primary mb-3">
                                    <Check className="h-4 w-4" />
                                    Link copied. Paste to share.
                                </div>
                            )}

                            {/* Share section */}
                            {isShared && (
                                <div className="border-t border-border pt-3">
                                    <p className="text-xs text-muted-foreground mb-2 font-medium">Share</p>
                                    <Button
                                        variant="secondary"
                                        className="w-full justify-center gap-2"
                                        onClick={handleCopy}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="h-4 w-4" />
                                                Copy Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
