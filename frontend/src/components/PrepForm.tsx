import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OpponentAutocomplete } from './OpponentAutocomplete'
import { TimelineExplorer } from './TimelineExplorer'
import type { Preparation, PreparationCreate, Opponent, StrategyTopicInput, SelectedTimeframe } from '@/types'
import { Plus, Trash2, Save, X } from 'lucide-react'

interface PrepFormProps {
    initial?: Preparation | null
    allOpponents: Opponent[]
    onSave: (data: PreparationCreate) => void
    onCancel: () => void
}

export function PrepForm({ initial, allOpponents, onSave, onCancel }: PrepFormProps) {
    const [title, setTitle] = useState(initial?.title ?? '')
    const [debateDate, setDebateDate] = useState(initial?.debateDate ?? '')
    const [debateFormat, setDebateFormat] = useState(initial?.debateFormat ?? '')
    const [debateContext, setDebateContext] = useState(initial?.debateContext ?? '')
    const [topic, setTopic] = useState(initial?.topic ?? '')
    const [userPosition, setUserPosition] = useState(initial?.userPosition ?? '')
    const [opponents, setOpponents] = useState<Opponent[]>(initial?.opponents ?? [])
    const [selectedTimeframes, setSelectedTimeframes] = useState<SelectedTimeframe[]>(initial?.selectedTimeframes ?? [])
    const [strategyTopics, setStrategyTopics] = useState<StrategyTopicInput[]>(
        initial?.strategyTopics?.length
            ? initial.strategyTopics.map(({ title, description, stance }) => ({ title, description, stance }))
            : []
    )

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        onSave({
            title: title || 'Untitled Preparation',
            debateDate: debateDate || undefined,
            debateFormat: debateFormat || undefined,
            debateContext: debateContext || undefined,
            topic,
            userPosition,
            opponents: opponents.map(({ name, organization, knownPositions, debateStyle }) => ({
                name,
                organization,
                knownPositions,
                debateStyle,
            })),
            selectedTimeframes,
            strategyTopics: strategyTopics.filter((st) => st.title.trim()),
        })
    }

    function updateStrategyTopic(idx: number, updates: Partial<StrategyTopicInput>) {
        setStrategyTopics((prev) => prev.map((st, i) => (i === idx ? { ...st, ...updates } : st)))
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Preparation title..."
                    className="text-xl font-bold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="flex items-center gap-2 shrink-0">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button type="submit" size="sm">
                        <Save className="h-4 w-4 mr-1" /> Save
                    </Button>
                </div>
            </div>

            {/* Debate Info */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Debate Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm text-muted-foreground">Date</label>
                            <Input
                                type="date"
                                value={debateDate}
                                onChange={(e) => setDebateDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm text-muted-foreground">Format</label>
                            <Input
                                placeholder="e.g. 1v1, Panel..."
                                value={debateFormat}
                                onChange={(e) => setDebateFormat(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm text-muted-foreground">Context / Notes</label>
                        <Textarea
                            placeholder="Any relevant context about the debate..."
                            value={debateContext}
                            onChange={(e) => setDebateContext(e.target.value)}
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Topic */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Topic</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm text-muted-foreground">Main Topic / Motion</label>
                        <Input
                            placeholder="The topic being debated"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm text-muted-foreground">Your Position</label>
                        <Textarea
                            placeholder="Your stance on the topic"
                            value={userPosition}
                            onChange={(e) => setUserPosition(e.target.value)}
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Opponents */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Opponents</CardTitle>
                </CardHeader>
                <CardContent>
                    <OpponentAutocomplete
                        allOpponents={allOpponents}
                        selectedOpponents={opponents}
                        onAdd={(op) =>
                            setOpponents([
                                ...opponents,
                                {
                                    id: crypto.randomUUID(),
                                    name: op.name!,
                                    organization: op.organization,
                                    knownPositions: op.knownPositions,
                                    debateStyle: op.debateStyle,
                                    previousEncounters: (op as Opponent).previousEncounters ?? 0,
                                },
                            ])
                        }
                        onRemove={(idx) => setOpponents(opponents.filter((_, i) => i !== idx))}
                    />
                </CardContent>
            </Card>

            {/* Research Timeframes */}
            <TimelineExplorer
                query={[
                    topic ? `"${topic}"` : '',
                    opponents.length > 0 ? `"${opponents.map(o => o.name).join(' ')}"` : ''
                ].filter(Boolean).join(' & ')}
                selectedTimeframes={selectedTimeframes}
                onSelect={setSelectedTimeframes}
            />

            {/* Strategy Topics (user provides skeleton — backend generates the rest) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        Strategy Topics
                        <span className="ml-2 text-xs text-muted-foreground/60 font-normal">
                            (arguments & articles generated by AI)
                        </span>
                    </h3>
                </div>

                {strategyTopics.map((st, stIdx) => (
                    <Card key={stIdx}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    Topic {stIdx + 1}
                                </CardTitle>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setStrategyTopics(strategyTopics.filter((_, i) => i !== stIdx))}
                                >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">Topic Name</label>
                                <Input
                                    placeholder="Name of the sub-topic"
                                    value={st.title}
                                    onChange={(e) => updateStrategyTopic(stIdx, { title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">Description</label>
                                <Textarea
                                    placeholder="What is this topic about?"
                                    value={st.description}
                                    onChange={(e) => updateStrategyTopic(stIdx, { description: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">Your Stance</label>
                                <Textarea
                                    placeholder="Your position on this specific topic"
                                    value={st.stance}
                                    onChange={(e) => updateStrategyTopic(stIdx, { stance: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setStrategyTopics([...strategyTopics, { title: '', description: '', stance: '' }])}
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Strategy Topic
                </Button>
            </div>

            <Separator />

            <div className="flex justify-end gap-2 pb-6">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">
                    <Save className="h-4 w-4 mr-1" />
                    {initial ? 'Update Preparation' : 'Create Preparation'}
                </Button>
            </div>
        </form>
    )
}
