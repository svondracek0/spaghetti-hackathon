import type { ArticleRef } from '@/types'

interface CitationBadgeProps {
    index: number
    article: ArticleRef
}

export function CitationBadge({ index, article }: CitationBadgeProps) {
    const hasUrl = article.url && article.url.length > 0

    const badge = (
        <span
            className={`
                inline-flex items-center justify-center
                w-[18px] h-[18px] rounded-full
                text-[10px] font-bold leading-none
                bg-primary/20 text-primary
                align-super ml-0.5
                ${hasUrl ? 'cursor-pointer hover:bg-primary/40 transition-colors' : ''}
            `}
            title={article.title || article.publisher || article.articleId}
        >
            {index}
        </span>
    )

    if (hasUrl) {
        return (
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline">
                {badge}
            </a>
        )
    }

    return badge
}
