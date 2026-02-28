import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { DashboardStats } from '@/types'
import { DebateCalendar } from '@/components/DebateCalendar'
import { Swords, Users, CheckCircle2, Clock, ChevronRight, Trophy } from 'lucide-react'

export function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.getDashboardStats()
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <p className="text-muted-foreground">Failed to load dashboard</p>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Your debate preparation at a glance</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Swords className="h-5 w-5" />}
                    label="Total Preparations"
                    value={stats.totalPreparations}
                    color="text-primary"
                    bgColor="bg-primary/10"
                />
                <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Opponents Tracked"
                    value={stats.totalOpponents}
                    color="text-blue-400"
                    bgColor="bg-blue-400/10"
                />
                <StatCard
                    icon={<Clock className="h-5 w-5" />}
                    label="In Progress"
                    value={stats.preparingCount}
                    color="text-preparing"
                    bgColor="bg-preparing/10"
                />
                <StatCard
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    label="Ready"
                    value={stats.readyCount}
                    color="text-ready"
                    bgColor="bg-ready/10"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Debate Calendar */}
                <DebateCalendar debates={stats.upcomingDebates} />

                {/* Top Opponents */}
                <div className="rounded-xl bg-card border border-border p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Top Opponents</h2>
                    </div>
                    {stats.topOpponents.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No opponents yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Add opponents to your preparations
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {stats.topOpponents.map((opp, index) => (
                                <Link
                                    key={opp.id}
                                    to={`/opponents/${opp.id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {opp.name}
                                        </p>
                                        {opp.organization && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {opp.organization}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {opp.previousEncounters} debate{opp.previousEncounters !== 1 ? 's' : ''}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({
    icon,
    label,
    value,
    color,
    bgColor,
}: {
    icon: React.ReactNode
    label: string
    value: number
    color: string
    bgColor: string
}) {
    return (
        <div className="rounded-xl bg-card border border-border p-5">
            <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center ${color}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </div>
        </div>
    )
}
