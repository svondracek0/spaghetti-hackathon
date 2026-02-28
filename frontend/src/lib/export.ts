import type { Preparation } from '@/types'

/**
 * Strip citation markers like [1][2] from text for clean export.
 */
function stripCitations(text: string): string {
    return text
        .replace(/\[(\d+)\]/g, '') // [1], [2]
        .replace(/\(Art(?:icles?)?\s+[\d,\s]+\)/gi, '') // (Art 1, 2), (Articles 1, 2, 3)
        .replace(/\s{2,}/g, ' ')
        .trim()
}

/**
 * Build a Markdown string from a Preparation object.
 */
export function preparationToMarkdown(prep: Preparation): string {
    const lines: string[] = []

    // Title
    lines.push(`# ${prep.title || 'Untitled Preparation'}`)
    lines.push('')

    // Meta
    const meta: string[] = []
    if (prep.debateDate) meta.push(`**Date:** ${new Date(prep.debateDate).toLocaleDateString()}`)
    if (prep.debateFormat) meta.push(`**Format:** ${prep.debateFormat}`)
    meta.push(`**Status:** ${prep.status}`)
    lines.push(meta.join(' · '))
    lines.push('')

    // Context
    if (prep.debateContext) {
        lines.push('## Debate Context')
        lines.push('')
        lines.push(prep.debateContext)
        lines.push('')
    }

    // Topic & Position
    if (prep.topic || prep.userPosition) {
        lines.push('## Topic & Position')
        lines.push('')
        if (prep.topic) lines.push(`**Topic:** ${prep.topic}`)
        if (prep.userPosition) lines.push(`**Your Position:** ${prep.userPosition}`)
        lines.push('')
    }

    // Opponents
    if (prep.opponents.length > 0) {
        lines.push('## Opponents')
        lines.push('')
        for (const op of prep.opponents) {
            lines.push(`### ${op.name}`)
            if (op.organization) lines.push(`*${op.organization}*`)
            lines.push('')
            if (op.description) lines.push(op.description)
            if (op.knownPositions) lines.push(`**Known Positions:** ${op.knownPositions}`)
            if (op.debateStyle) lines.push(`**Debate Style:** ${op.debateStyle}`)
            lines.push('')
        }
    }

    // Win Strategy
    if (prep.winStrategy) {
        lines.push('## Win Strategy')
        lines.push('')
        lines.push(prep.winStrategy)
        lines.push('')
    }

    // Key Arguments
    if (prep.keyArguments.length > 0) {
        lines.push('## Key Arguments')
        lines.push('')
        prep.keyArguments.forEach((arg, i) => {
            lines.push(`${i + 1}. ${arg}`)
        })
        lines.push('')
    }

    // Strategy Topics
    if (prep.strategyTopics.length > 0) {
        lines.push('## Strategy Topics')
        lines.push('')

        for (const st of prep.strategyTopics) {
            const tag = st.source === 'discovered' ? ' ✨ *Discovered*' : ''
            lines.push(`### ${st.title || 'Untitled Topic'}${tag}`)
            lines.push('')

            if (st.sneakyQuestions.length > 0) {
                lines.push('**Sneaky Questions:**')
                lines.push('')
                for (const q of st.sneakyQuestions) {
                    lines.push(`- ${stripCitations(q)}`)
                }
                lines.push('')
            }

            if (st.arguments.length > 0) {
                lines.push('**Arguments:**')
                lines.push('')
                for (const a of st.arguments) {
                    lines.push(`- ${stripCitations(a)}`)
                }
                lines.push('')
            }

            if (st.whyBadForOpponent) {
                lines.push('**Why Bad for Opponent:**')
                lines.push('')
                lines.push(stripCitations(st.whyBadForOpponent))
                lines.push('')
            }

            // Sources
            const articles = st.articles || []
            if (articles.length > 0) {
                lines.push('**Sources:**')
                lines.push('')
                articles.forEach((art, i) => {
                    const display = art.title || `Article ${art.articleId}`
                    if (art.url) {
                        lines.push(`${i + 1}. [${display}](${art.url})${art.publisher ? ` — *${art.publisher}*` : ''}`)
                    } else {
                        lines.push(`${i + 1}. ${display}${art.publisher ? ` — *${art.publisher}*` : ''}`)
                    }
                })
                lines.push('')
            }
        }
    }

    // Footer
    lines.push('---')
    lines.push(`*Generated ${new Date().toLocaleDateString()} by DebatePrep*`)
    lines.push('')

    return lines.join('\n')
}

/**
 * Download a string as a file.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Export preparation as Markdown file download.
 */
export function exportAsMarkdown(prep: Preparation) {
    const md = preparationToMarkdown(prep)
    const safeName = (prep.title || 'preparation').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    downloadFile(md, `${safeName}.md`, 'text/markdown;charset=utf-8')
}

/**
 * Export preparation as PDF via a print-optimized popup window.
 */
export function exportAsPdf(prep: Preparation) {
    const md = preparationToMarkdown(prep)
    const html = markdownToHtml(md)

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Please allow popups to export PDF')
        return
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${prep.title || 'Debate Prep'} — Export</title>
<style>
    @page { margin: 1.5cm; size: A4; }
    * { box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
        font-size: 13px;
    }
    h1 { font-size: 22px; border-bottom: 2px solid #6366f1; padding-bottom: 6px; margin-bottom: 8px; }
    h2 { font-size: 16px; color: #4f46e5; margin-top: 20px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 14px; margin-top: 14px; margin-bottom: 4px; }
    ul, ol { padding-left: 20px; margin: 4px 0; }
    li { margin-bottom: 4px; }
    p { margin: 4px 0; }
    em { color: #6b7280; }
    strong { color: #111827; }
    a { color: #4f46e5; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }
    code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
</style>
</head>
<body>
${html}
</body>
</html>`)
    printWindow.document.close()

    // Wait for rendering, then trigger print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print()
        }, 300)
    }
    // Fallback if onload doesn't fire
    setTimeout(() => {
        printWindow.print()
    }, 800)
}

/**
 * Minimal Markdown → HTML converter (no dependencies).
 * Handles: headings, bold, italic, links, lists, hr, paragraphs.
 */
function markdownToHtml(md: string): string {
    const lines = md.split('\n')
    const html: string[] = []
    let inList: 'ul' | 'ol' | null = null

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!

        // Close list if current line is not a list item
        const isUl = /^- /.test(line)
        const isOl = /^\d+\. /.test(line)
        if (inList && !isUl && !isOl) {
            html.push(inList === 'ul' ? '</ul>' : '</ol>')
            inList = null
        }

        // Headings
        if (line.startsWith('### ')) {
            html.push(`<h3>${inlineFormat(line.slice(4))}</h3>`)
            continue
        }
        if (line.startsWith('## ')) {
            html.push(`<h2>${inlineFormat(line.slice(3))}</h2>`)
            continue
        }
        if (line.startsWith('# ')) {
            html.push(`<h1>${inlineFormat(line.slice(2))}</h1>`)
            continue
        }

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
            html.push('<hr>')
            continue
        }

        // Unordered list item
        if (isUl) {
            if (inList !== 'ul') {
                html.push('<ul>')
                inList = 'ul'
            }
            html.push(`<li>${inlineFormat(line.slice(2))}</li>`)
            continue
        }

        // Ordered list item
        if (isOl) {
            if (inList !== 'ol') {
                html.push('<ol>')
                inList = 'ol'
            }
            html.push(`<li>${inlineFormat(line.replace(/^\d+\.\s*/, ''))}</li>`)
            continue
        }

        // Empty line
        if (line.trim() === '') {
            continue
        }

        // Paragraph
        html.push(`<p>${inlineFormat(line)}</p>`)
    }

    // Close any open list
    if (inList) {
        html.push(inList === 'ul' ? '</ul>' : '</ol>')
    }

    return html.join('\n')
}

/**
 * Format inline Markdown: **bold**, *italic*, [links](url), `code`
 */
function inlineFormat(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}
