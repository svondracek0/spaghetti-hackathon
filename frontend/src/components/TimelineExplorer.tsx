import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { Loader2, TrendingUp, Calendar, X, Search } from 'lucide-react'
import { api } from '@/lib/api'
import type { TimeframeData, SelectedTimeframe } from '@/types'

interface TimelineExplorerProps {
    query: string
    selectedTimeframes: SelectedTimeframe[]
    onSelect?: (timeframes: SelectedTimeframe[]) => void
    readOnly?: boolean
}

export function TimelineExplorer({ query, selectedTimeframes, onSelect, readOnly }: TimelineExplorerProps) {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<TimeframeData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const lastAnalyzedQuery = useRef<string | null>(null)

    const analyze = useCallback(async () => {
        if (!query || query.trim().length < 3 || loading) return
        lastAnalyzedQuery.current = query
        setLoading(true)
        setError(null)
        try {
            const result = await api.getRelevantTimeframes(query)
            setData(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed')
        } finally {
            setLoading(false)
        }
    }, [query, loading])

    // Auto-analyze only in readOnly mode (e.g. opponent page where query is stable)
    useEffect(() => {
        if (!readOnly || !query || query.trim().length < 3) return
        const timer = setTimeout(() => analyze(), 500)
        return () => clearTimeout(timer)
    }, [query, readOnly]) // eslint-disable-line react-hooks/exhaustive-deps

    const queryChanged = data && lastAnalyzedQuery.current !== query

    function toggleTimeframe(tf: SelectedTimeframe) {
        if (readOnly || !onSelect) return
        const isSelected = selectedTimeframes.some(s => s.from === tf.from && s.to === tf.to)
        if (isSelected) {
            onSelect(selectedTimeframes.filter(s => !(s.from === tf.from && s.to === tf.to)))
        } else {
            onSelect([...selectedTimeframes, tf])
        }
    }

    const earliestSpikeDate = data?.suggestions?.length && data.suggestions[0]
        ? data.suggestions.reduce((min, s) => s.from < min ? s.from : min, data.suggestions[0].from).substring(0, 7)
        : null;

    return (
        <Card className="border-primary/20 bg-background/50">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Research Timeframes
                </CardTitle>
                <CardDescription>
                    Analyze article volume over the last 5 years to find the most relevant periods to research.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!readOnly && (
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant={queryChanged ? 'default' : 'secondary'}
                            size="sm"
                            onClick={analyze}
                            disabled={loading || !query || query.trim().length < 3}
                            className="shrink-0"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Search className="h-4 w-4 mr-2" />
                            )}
                            {loading ? 'Analyzing...' : data ? 'Re-analyze' : 'Analyze Timeframes'}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {!query || query.trim().length < 3
                                ? 'Add a topic and opponents first'
                                : queryChanged
                                    ? 'Topic/opponents changed — click to re-analyze'
                                    : data
                                        ? 'Analysis complete'
                                        : 'Click to analyze article volume over the last 5 years'}
                        </span>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                        {error}
                    </div>
                )}

                {data && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Chart */}
                        <div className="h-64 w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                    <XAxis
                                        dataKey="period"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                                        dy={10}
                                        tickFormatter={(val) => {
                                            if (val.endsWith('-01')) return val.split('-')[0]
                                            return ''
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--color-secondary)' }}
                                        contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--color-foreground)' }}
                                    />
                                    <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="var(--color-primary)">
                                        {data.data.map((entry, index) => {
                                            // Using the top-level earliestSpikeDate
                                            const isBeforeSpike = earliestSpikeDate && entry.period < earliestSpikeDate;
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={isBeforeSpike ? "var(--color-muted-foreground)" : "var(--color-primary)"}
                                                    opacity={isBeforeSpike ? 0.3 : 0.8}
                                                />
                                            );
                                        })}
                                    </Bar>
                                    {data.suggestions.map((s, idx) => {
                                        const periodStr = s.from.substring(0, 7)
                                        return (
                                            <ReferenceLine
                                                key={`ref-${idx}`}
                                                x={periodStr}
                                                stroke="var(--color-destructive)"
                                                strokeDasharray="3 3"
                                                label={{ position: 'top', value: 'Spike', fill: 'var(--color-destructive)', fontSize: 10 }}
                                            />
                                        )
                                    })}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Suggestions */}
                        {data.suggestions.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground">Suggested Periods</h4>
                                <div className="flex flex-wrap gap-2">
                                    {data.suggestions.map((s, idx) => {
                                        const tf: SelectedTimeframe = { from: s.from, to: s.to, label: s.label }
                                        const isSelected = selectedTimeframes.some(st => st.from === tf.from && st.to === tf.to)

                                        return (
                                            <button
                                                type="button"
                                                key={idx}
                                                onClick={() => toggleTimeframe(tf)}
                                                disabled={readOnly}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected
                                                    ? 'bg-destructive text-destructive-foreground shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                                    : readOnly ? 'bg-secondary/50 text-foreground/70 opacity-50 cursor-default' : 'bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer'
                                                    }`}
                                            >
                                                <Calendar className="h-3 w-3" />
                                                {s.label}
                                                <span className={`opacity-70 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                                    ({s.totalArticles} articles)
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Selected Timeframes Overview */}
                {selectedTimeframes.length > 0 && (
                    <div className="pt-4 border-t space-y-3">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                            Filters Applied
                            <Badge variant="secondary" className="px-1.5 min-w-[1.25rem] justify-center">{selectedTimeframes.length}</Badge>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedTimeframes.map((tf, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-secondary/50 border rounded-md px-2.5 py-1 text-xs text-secondary-foreground">
                                    <span className="font-medium">{tf.label || `Since ${tf.from}`}</span>
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => toggleTimeframe(tf)}
                                            className="p-0.5 hover:bg-background rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
