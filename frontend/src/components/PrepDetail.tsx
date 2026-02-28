import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from './StatusBadge'
import { CitedText } from './CitedText'
import { SourcePanel } from './SourcePanel'
import { exportAsMarkdown, exportAsPdf } from '@/lib/export'
import { api } from '@/lib/api'
import type { Preparation, ArticleRef } from '@/types'
import { Calendar, Users, Pencil, Trash2, Swords, MessageCircleQuestion, Target, FileText, Sparkles, Loader2, BookOpen, Download } from 'lucide-react'

interface PrepDetailProps {
    preparation: Preparation
    onEdit: () => void
    onDelete: () => void
    onUpdate: (updated: Preparation) => void
}

export function PrepDetail({ preparation, onEdit, onDelete, onUpdate }: PrepDetailProps) {
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sourcePanelArticles, setSourcePanelArticles] = useState<ArticleRef[]>([])
    const [sourcePanelOpen, setSourcePanelOpen] = useState(false)

    function openSources(articles: ArticleRef[]) {
        setSourcePanelArticles(articles)
        setSourcePanelOpen(true)
    }

    async function handleGenerate() {
        setGenerating(true)
        setError(null)
        try {
            const updated = await api.generateStrategy(preparation.id)
            onUpdate(updated)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-foreground">
                            {preparation.title || 'Untitled Preparation'}
                        </h1>
                        <StatusBadge status={preparation.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {preparation.debateDate && (
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(preparation.debateDate).toLocaleDateString()}
                            </span>
                        )}
                        {preparation.debateFormat && (
                            <Badge variant="outline" className="text-xs">{preparation.debateFormat}</Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {preparation.status === 'Ready' && (
                        <div className="relative group">
                            <Button variant="outline" size="sm">
                                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                            </Button>
                            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                                <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 rounded-t-md transition-colors"
                                    onClick={() => exportAsMarkdown(preparation)}
                                >
                                    📝 Markdown
                                </button>
                                <button
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 rounded-b-md transition-colors"
                                    onClick={() => exportAsPdf(preparation)}
                                >
                                    📄 PDF
                                </button>
                            </div>
                        </div>
                    )}
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Generate Strategy Button */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center justify-between py-4">
                    <div>
                        <p className="font-medium text-sm">
                            {preparation.status === 'Ready'
                                ? '✅ Strategy generated — click to regenerate'
                                : preparation.strategyTopics.length > 0
                                    ? `🎯 ${preparation.strategyTopics.length} topic(s) ready for AI analysis`
                                    : '🔍 Generate strategy — AI will discover topics from news'}
                        </p>
                        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        size="sm"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-1.5" />
                                Generate Strategy
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Debate Context */}
            {preparation.debateContext && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground font-medium">Context</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{preparation.debateContext}</p>
                    </CardContent>
                </Card>
            )}

            {/* Topic & Position */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" /> Topic & Position
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {preparation.topic && (
                        <div>
                            <p className="font-semibold text-foreground">{preparation.topic}</p>
                        </div>
                    )}
                    {preparation.userPosition && (
                        <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Your position</span>
                            <p className="text-sm mt-0.5 whitespace-pre-wrap">{preparation.userPosition}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Opponents */}
            {preparation.opponents.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" /> Opponents ({preparation.opponents.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {preparation.opponents.map((op, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                                        {op.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{op.name}</span>
                                            {op.organization && (
                                                <span className="text-xs text-muted-foreground">— {op.organization}</span>
                                            )}
                                            {op.previousEncounters > 0 && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary">
                                                    {op.previousEncounters}× seen
                                                </Badge>
                                            )}
                                        </div>
                                        {op.description && (
                                            <p className="text-xs text-muted-foreground mt-1">{op.description}</p>
                                        )}
                                        {op.knownPositions && (
                                            <p className="text-xs text-muted-foreground mt-0.5 italic">{op.knownPositions}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Strategy */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                        <Swords className="h-3.5 w-3.5" /> Strategy
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {preparation.winStrategy && (
                        <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Win Strategy</span>
                            <p className="text-sm mt-0.5 whitespace-pre-wrap">{preparation.winStrategy}</p>
                        </div>
                    )}
                    {preparation.keyArguments.length > 0 && (
                        <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Key Arguments</span>
                            <ul className="mt-1.5 space-y-1">
                                {preparation.keyArguments.map((arg, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-primary font-mono text-xs mt-0.5">{idx + 1}.</span>
                                        {arg}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Strategy Topics */}
            {preparation.strategyTopics.map((st, idx) => (
                <Card key={idx}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            {st.title || `Strategy Topic ${idx + 1}`}
                            {st.source === 'discovered' && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-yellow-500/15 text-yellow-500 ml-1">
                                    ✨ Discovered
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {st.sneakyQuestions.length > 0 && (
                            <div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                    <MessageCircleQuestion className="h-3 w-3" /> Sneaky Questions
                                </span>
                                <ul className="mt-1.5 space-y-1">
                                    {st.sneakyQuestions.map((q, qIdx) => (
                                        <li key={qIdx} className="text-sm text-foreground/90 pl-2 border-l-2 border-preparing/30">
                                            <CitedText text={q} articles={st.articles || []} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {st.arguments.length > 0 && (
                            <div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Arguments</span>
                                <ul className="mt-1.5 space-y-1">
                                    {st.arguments.map((a, aIdx) => (
                                        <li key={aIdx} className="text-sm pl-2 border-l-2 border-primary/30">
                                            <CitedText text={a} articles={st.articles || []} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {st.whyBadForOpponent && (
                            <div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Why Bad for Opponent</span>
                                <p className="text-sm mt-0.5 whitespace-pre-wrap text-destructive/80">
                                    <CitedText text={st.whyBadForOpponent} articles={st.articles || []} />
                                </p>
                            </div>
                        )}

                        {(st.articles?.length > 0 || st.articleIds.length > 0) && (
                            <div className="flex items-center gap-2 pt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => openSources(st.articles || [])}
                                >
                                    <BookOpen className="h-3 w-3" />
                                    {st.articles?.length || st.articleIds.length} source{(st.articles?.length || st.articleIds.length) !== 1 ? 's' : ''}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            <Separator />
            <p className="text-xs text-muted-foreground/50 text-center pb-6">
                Created {new Date(preparation.createdAt).toLocaleString()} · Updated {new Date(preparation.updatedAt).toLocaleString()}
            </p>

            {/* Source panel overlay */}
            <SourcePanel
                articles={sourcePanelArticles}
                open={sourcePanelOpen}
                onClose={() => setSourcePanelOpen(false)}
            />
        </div>
    )
}
