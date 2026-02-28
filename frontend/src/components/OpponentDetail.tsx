import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { api } from '@/lib/api'
import type { OpponentDetail as OpponentDetailType, NewsTrendPoint, KBStatus, KBGraphData } from '@/types'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Building2, MessageSquare, Target, Swords, TrendingUp, Brain, Search, Loader2, Database, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KBGraphViz } from './KBGraphViz'

/** Generate mock trend data for demo purposes */
function generateMockTrend(name: string): NewsTrendPoint[] {
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const month = d.toISOString().slice(0, 7)
        const seed = name.length + i
        const count = Math.floor(Math.abs(Math.sin(seed * 2.5) * 30) + Math.random() * 10)
        months.push({ month, count })
    }
    return months
}

export function OpponentDetail({ onDelete }: { onDelete?: () => Promise<void> }) {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [opponent, setOpponent] = useState<OpponentDetailType | null>(null)
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)

    // KB state
    const [kbStatus, setKbStatus] = useState<KBStatus | null>(null)
    const [kbToggling, setKbToggling] = useState(false)
    const [kbQuery, setKbQuery] = useState('')
    const [kbResult, setKbResult] = useState<string | null>(null)
    const [kbQuerying, setKbQuerying] = useState(false)
    const [graphData, setGraphData] = useState<KBGraphData | null>(null)

    useEffect(() => {
        if (!id) return
        api.getOpponent(id)
            .then((data) => {
                setOpponent(data)
                // Fetch KB status
                api.getKBStatus(id).then(setKbStatus).catch(() => { })
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        if (!id || !kbStatus) return
        if (kbStatus.status === 'ready' || kbStatus.status === 'ingesting') {
            api.getKBGraph(id)
                .then(setGraphData)
                .catch(e => console.error("Could not fetch graph data:", e))
        }
    }, [id, kbStatus?.status, kbStatus?.processedCount])

    // Poll KB status while ingesting
    useEffect(() => {
        if (!id || !kbStatus || kbStatus.status !== 'ingesting') return
        const interval = setInterval(() => {
            api.getKBStatus(id).then(setKbStatus).catch(() => { })
        }, 5000) // Poll every 5 seconds
        return () => clearInterval(interval)
    }, [id, kbStatus?.status])

    const trendData = useMemo(() => {
        if (!opponent) return []
        return generateMockTrend(opponent.name)
    }, [opponent])

    async function handleKBToggle() {
        if (!id || kbToggling) return
        setKbToggling(true)
        try {
            if (kbStatus?.enabled) {
                const status = await api.disableKB(id)
                setKbStatus(status)
            } else {
                const status = await api.enableKB(id)
                setKbStatus(status)
            }
        } catch (e) {
            console.error('KB toggle failed:', e)
        } finally {
            setKbToggling(false)
        }
    }

    async function handleKBQuery() {
        if (!id || !kbQuery.trim() || kbQuerying) return
        setKbQuerying(true)
        setKbResult(null)
        try {
            const result = await api.queryKB(id, kbQuery.trim())
            setKbResult(result.result)
        } catch (e: any) {
            setKbResult(`Error: ${e.message}`)
        } finally {
            setKbQuerying(false)
        }
    }

    async function handleDelete() {
        if (!id || deleting) return
        if (!confirm('Are you sure you want to delete this opponent? All associated preparations and knowledgebase data will be permanently removed.')) {
            return
        }

        setDeleting(true)
        try {
            await api.deleteOpponent(id)
            if (onDelete) {
                await onDelete()
            } else {
                navigate('/')
            }
        } catch (e) {
            console.error('Failed to delete opponent:', e)
            alert('Failed to delete the opponent.')
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="animate-pulse text-muted-foreground">Loading opponent...</div>
            </div>
        )
    }

    if (!opponent) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <p className="text-muted-foreground">Opponent not found</p>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Back button */}
            <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-primary">
                            {opponent.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{opponent.name}</h1>
                        {opponent.organization && (
                            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span className="text-sm">{opponent.organization}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {opponent.previousEncounters} debate{opponent.previousEncounters !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2"
                >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete Opponent
                </Button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opponent.knownPositions && (
                    <div className="rounded-xl bg-card border border-border p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold text-foreground">Known Positions</h3>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {opponent.knownPositions}
                        </p>
                    </div>
                )}
                {opponent.debateStyle && (
                    <div className="rounded-xl bg-card border border-border p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold text-foreground">Debate Style</h3>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {opponent.debateStyle}
                        </p>
                    </div>
                )}
            </div>

            {opponent.description && (
                <div className="rounded-xl bg-card border border-border p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {opponent.description}
                    </p>
                </div>
            )}

            {/* Advanced Media Tracking (KB) */}
            <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Advanced Media Tracking</h2>
                    </div>
                    <button
                        onClick={handleKBToggle}
                        disabled={kbToggling}
                        className={`
                            relative w-12 h-6 rounded-full transition-colors duration-200
                            ${kbStatus?.enabled ? 'bg-primary' : 'bg-secondary'}
                            ${kbToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        <span className={`
                            absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200
                            ${kbStatus?.enabled ? 'translate-x-6' : 'translate-x-0'}
                        `} />
                    </button>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                    When enabled, a RAG knowledgebase is created with articles about this opponent from the last 5 years.
                    New articles are ingested automatically every 30 minutes.
                </p>

                {/* KB Status */}
                {kbStatus?.enabled && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg bg-secondary/50 p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    {kbStatus.status === 'ingesting' ? (
                                        <Loader2 className="h-3.5 w-3.5 text-preparing animate-spin" />
                                    ) : (
                                        <Database className="h-3.5 w-3.5 text-primary" />
                                    )}
                                    <span className={`text-[10px] font-medium uppercase tracking-wider ${kbStatus.status === 'ready' ? 'text-ready' :
                                        kbStatus.status === 'ingesting' ? 'text-preparing' :
                                            kbStatus.status === 'error' ? 'text-destructive' :
                                                'text-muted-foreground'
                                        }`}>
                                        {kbStatus.status}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Status</p>
                            </div>
                            <div className="rounded-lg bg-secondary/50 p-3 text-center flex flex-col items-center justify-center">
                                <p className="text-lg font-bold text-foreground">
                                    {kbStatus.processedCount ?? 0}
                                </p>
                                <p className="text-[10px] text-muted-foreground">RAG Processed</p>
                            </div>
                            <div className="rounded-lg bg-secondary/50 p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-foreground">
                                        {kbStatus.lastIngested
                                            ? new Date(kbStatus.lastIngested).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : '—'
                                        }
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Last Ingested</p>
                            </div>
                        </div>

                        {/* Query Input */}
                        {(kbStatus.status === 'ready' || kbStatus.status === 'ingesting') && (
                            <div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={kbQuery}
                                            onChange={(e) => setKbQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleKBQuery()}
                                            placeholder="Search the knowledgebase..."
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleKBQuery}
                                        disabled={kbQuerying || !kbQuery.trim()}
                                        className="px-4"
                                    >
                                        {kbQuerying ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Query'
                                        )}
                                    </Button>
                                </div>

                                {/* Query Result */}
                                {kbResult && (
                                    <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border">
                                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Result:</p>
                                        <div className="text-sm text-foreground leading-relaxed prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary">
                                            <ReactMarkdown>{kbResult}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Knowledge Graph Visualization */}
                        {(kbStatus.status === 'ready' || kbStatus.status === 'ingesting') && graphData && (
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <Database className="h-4 w-4 text-primary" />
                                    Knowledge Graph Map (Top Entities)
                                </h3>
                                <KBGraphViz data={graphData} />
                            </div>
                        )}

                        {kbStatus.status === 'ingesting' && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-preparing/10 border border-preparing/20">
                                <Loader2 className="h-4 w-4 text-preparing animate-spin" />
                                <span className="text-sm text-preparing">
                                    Ingesting historical articles... This may take a few minutes.
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Article Trend Chart */}
            <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Media Coverage Trend</h2>
                    <span className="text-xs text-muted-foreground ml-auto">Last 12 months (mock data)</span>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                                dataKey="month"
                                tickFormatter={(v) => {
                                    const [, m] = v.split('-')
                                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                    return months[parseInt(m) - 1] || v
                                }}
                                stroke="#71717a"
                                fontSize={12}
                            />
                            <YAxis stroke="#71717a" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#111118',
                                    border: '1px solid #27272a',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                }}
                                labelStyle={{ color: '#fafafa' }}
                                itemStyle={{ color: '#6366f1' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#6366f1"
                                fillOpacity={1}
                                fill="url(#colorCount)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Debate History */}
            <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center gap-2 mb-5">
                    <Swords className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Debate History</h2>
                </div>
                {opponent.preparations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No debate history found
                    </p>
                ) : (
                    <div className="space-y-2">
                        {opponent.preparations.map((prep) => (
                            <Link
                                key={prep.id}
                                to={`/preparations/${prep.id}`}
                                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-medium text-foreground">{prep.title}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {prep.debateDate && (
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(prep.debateDate).toLocaleDateString()}
                                            </span>
                                        )}
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${prep.status === 'Ready'
                                            ? 'bg-ready/20 text-ready'
                                            : 'bg-preparing/20 text-preparing'
                                            }`}>
                                            {prep.status}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
