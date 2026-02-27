import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from './StatusBadge'
import type { Preparation } from '@/types'
import { Calendar, Users, Pencil, Trash2, Swords, MessageCircleQuestion, Target, FileText } from 'lucide-react'

interface PrepDetailProps {
    preparation: Preparation
    onEdit: () => void
    onDelete: () => void
}

export function PrepDetail({ preparation, onEdit, onDelete }: PrepDetailProps) {
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
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

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
                                        {op.knownPositions && (
                                            <p className="text-xs text-muted-foreground mt-1">{op.knownPositions}</p>
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
                                            {q}
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
                                        <li key={aIdx} className="text-sm pl-2 border-l-2 border-primary/30">{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {st.whyBadForOpponent && (
                            <div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Why Bad for Opponent</span>
                                <p className="text-sm mt-0.5 whitespace-pre-wrap text-destructive/80">{st.whyBadForOpponent}</p>
                            </div>
                        )}

                        {st.articleIds.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Articles:</span>
                                {st.articleIds.map((id, aIdx) => (
                                    <Badge key={aIdx} variant="outline" className="text-xs">{id}</Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            <Separator />
            <p className="text-xs text-muted-foreground/50 text-center pb-6">
                Created {new Date(preparation.createdAt).toLocaleString()} · Updated {new Date(preparation.updatedAt).toLocaleString()}
            </p>
        </div>
    )
}
