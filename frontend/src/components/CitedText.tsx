import { Fragment, type ReactNode } from 'react'
import { CitationBadge } from './CitationBadge'
import type { ArticleRef } from '@/types'

interface CitedTextProps {
    text: string
    articles: ArticleRef[]
    className?: string
}

/**
 * Renders text with inline Perplexity-style citation badges.
 * Handles multiple citation formats:
 *   - Bracket style: [1], [2][3], [1][2][5]
 *   - Legacy parenthetical: (Articles 1, 2, 3), (Article 3), (Art 1, 2, 5)
 */
export function CitedText({ text, articles, className }: CitedTextProps) {
    if (!articles.length) {
        return <span className={className}>{text}</span>
    }

    // Combine all citation patterns into one regex:
    // 1. Bracket citations: [1], [2], [12]
    // 2. Parenthetical: (Articles 1, 2, 3) or (Article 3) or (Art 1, 2, 5)
    const citationRegex = /\[(\d+)\]|\(Art(?:icles?)?\s+([\d,\s]+)\)/gi

    const parts: (string | ReactNode)[] = []
    let lastIndex = 0

    for (const match of text.matchAll(citationRegex)) {
        const matchStart = match.index!
        const matchEnd = matchStart + match[0].length

        // Add text before this citation
        if (matchStart > lastIndex) {
            parts.push(text.slice(lastIndex, matchStart))
        }

        // Parse the article numbers from the match
        // Group 1 = bracket [N], Group 2 = parenthetical (Art N, N, N)
        const bracketNum = match[1]
        const parenNums = match[2]

        let numbers: number[]
        if (bracketNum) {
            numbers = [parseInt(bracketNum, 10)]
        } else {
            const numStr = parenNums ?? ''
            numbers = numStr
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n))
        }

        // Render citation badges
        numbers.forEach((num) => {
            const articleIndex = num - 1 // 1-based to 0-based
            const article = articles[articleIndex]
            if (articleIndex >= 0 && article) {
                parts.push(
                    <CitationBadge
                        key={`${matchStart}-${num}`}
                        index={num}
                        article={article}
                    />
                )
            }
        })

        lastIndex = matchEnd
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
    }

    // If no matches were found, return text as-is
    if (parts.length === 0) {
        return <span className={className}>{text}</span>
    }

    return (
        <span className={className}>
            {parts.map((part, i) => (
                <Fragment key={i}>{part}</Fragment>
            ))}
        </span>
    )
}
