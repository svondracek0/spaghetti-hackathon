import { X, ExternalLink, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ArticleRef } from '@/types'

interface SourcePanelProps {
    articles: ArticleRef[]
    open: boolean
    onClose: () => void
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '')
    } catch {
        return ''
    }
}

function getFaviconUrl(url: string): string {
    const domain = getDomain(url)
    return domain ? `https://www.google.com/s2/favicons?sz=32&domain=${domain}` : ''
}

export function SourcePanel({ articles, open, onClose }: SourcePanelProps) {
    if (!open) return null

    return (
        <div className="fixed inset-y-0 right-0 w-[380px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">
                    {articles.length} source{articles.length !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Article list */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                    {articles.map((article, idx) => {
                        const domain = getDomain(article.url)
                        const favicon = getFaviconUrl(article.url)
                        const hasUrl = article.url && article.url.length > 0

                        return (
                            <a
                                key={article.articleId || idx}
                                href={hasUrl ? article.url : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`
                                    block rounded-lg border border-border p-3
                                    ${hasUrl ? 'hover:bg-secondary/60 cursor-pointer' : ''}
                                    transition-colors group
                                `}
                            >
                                {/* Publisher row */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    {favicon ? (
                                        <img
                                            src={favicon}
                                            alt=""
                                            className="w-4 h-4 rounded-sm"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                        />
                                    ) : (
                                        <Newspaper className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className="text-xs text-muted-foreground truncate">
                                        {domain || article.publisher || 'Unknown source'}
                                    </span>
                                    {hasUrl && (
                                        <ExternalLink className="w-3 h-3 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>

                                {/* Title */}
                                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                                    {article.title || `Article ${article.articleId}`}
                                </p>
                            </a>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
