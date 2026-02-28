import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { CitedText } from './CitedText'
import { SourcePanel } from './SourcePanel'
import { FeedbackBar } from './FeedbackBar'
import { api } from '@/lib/api'
import type { Preparation, ArticleRef } from '@/types'
import { Users, Swords, MessageCircleQuestion, Target, FileText, Sparkles, BookOpen, Loader2 } from 'lucide-react'

interface SharedViewProps {
    token: string
}

export function SharedView({ token }: SharedViewProps) {
    const [preparation, setPreparation] = useState<Preparation | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sourcePanelArticles, setSourcePanelArticles] = useState<ArticleRef[]>([])
    const [sourcePanelOpen, setSourcePanelOpen] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const data = await api.getSharedPreparation(token)
                setPreparation(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'This shared link is invalid or has expired.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [token])

    function openSources(articles: ArticleRef[]) {
        setSourcePanelArticles(articles)
        setSourcePanelOpen(true)
    }

    async function handleFeedback(rating: number, comment: string) {
        await api.addSharedFeedback(token, { rating, comment })
        // Update local feedbacks
        if (preparation) {
            const updated = await api.getSharedPreparation(token)
            setPreparation(updated)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading shared preparation...</span>
                </div>
            </div>
        )
    }

    if (error || !preparation) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-lg font-semibold mb-2">Link not found</p>
                        <p className="text-sm text-muted-foreground">{error || 'This shared preparation could not be found.'}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Top banner */}
            <div className="bg-primary/5 border-b border-primary/10 px-4 py-2">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Shared Debate Preparation</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Read-only view</span>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">
                        {preparation.title || 'Untitled Preparation'}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Shared · Last updated {new Date(preparation.updatedAt).toLocaleDateString()}
                    </p>
                </div>

                {/* Topic & Position */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5" /> Topic & Position
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {preparation.topic && (
                            <p className="font-semibold text-foreground">{preparation.topic}</p>
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
                                            </div>
                                            {op.description && (
                                                <p className="text-xs text-muted-foreground mt-1">{op.description}</p>
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

                {/* Feedback */}
                <Separator />
                <FeedbackBar
                    feedbacks={preparation.feedbacks || []}
                    onSubmit={handleFeedback}
                />

                <p className="text-xs text-muted-foreground/50 text-center pb-6">
                    Shared from Debate Prep · {new Date(preparation.updatedAt).toLocaleString()}
                </p>

                {/* Source panel overlay */}
                <SourcePanel
                    articles={sourcePanelArticles}
                    open={sourcePanelOpen}
                    onClose={() => setSourcePanelOpen(false)}
                />
            </div>
        </div>
    )
}
