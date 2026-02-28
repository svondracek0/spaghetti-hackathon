import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PreparationSummary } from '@/types'

interface DebateCalendarProps {
    debates: PreparationSummary[]
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

export function DebateCalendar({ debates }: DebateCalendarProps) {
    const navigate = useNavigate()
    const today = new Date()
    const [currentMonth, setCurrentMonth] = useState(today.getMonth())
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [hoveredDate, setHoveredDate] = useState<string | null>(null)

    // Map debate dates -> debates for quick lookup
    const debatesByDate = useMemo(() => {
        const map: Record<string, PreparationSummary[]> = {}
        for (const d of debates) {
            if (d.debateDate) {
                if (!map[d.debateDate]) map[d.debateDate] = []
                map[d.debateDate].push(d)
            }
        }
        return map
    }, [debates])

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)

        // Monday=0 adjustment (JS getDay: 0=Sun)
        let startWeekday = firstDay.getDay() - 1
        if (startWeekday < 0) startWeekday = 6

        const days: (number | null)[] = []

        // Empty slots before first day
        for (let i = 0; i < startWeekday; i++) days.push(null)

        // Days of month
        for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)

        // Pad to full weeks
        while (days.length % 7 !== 0) days.push(null)

        return days
    }, [currentMonth, currentYear])

    function getDateString(day: number): string {
        const m = String(currentMonth + 1).padStart(2, '0')
        const d = String(day).padStart(2, '0')
        return `${currentYear}-${m}-${d}`
    }

    function isToday(day: number): boolean {
        return (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        )
    }

    function prevMonth() {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear(currentYear - 1)
        } else {
            setCurrentMonth(currentMonth - 1)
        }
    }

    function nextMonth() {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear(currentYear + 1)
        } else {
            setCurrentMonth(currentMonth + 1)
        }
    }

    // Get debates for the hovered date
    const hoveredDebates = hoveredDate ? debatesByDate[hoveredDate] || [] : []

    return (
        <div className="rounded-xl bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Debate Calendar</h2>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-foreground">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((wd) => (
                    <div key={wd} className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-1">
                        {wd}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} className="h-10" />
                    }

                    const dateStr = getDateString(day)
                    const dayDebates = debatesByDate[dateStr] || []
                    const hasDebate = dayDebates.length > 0
                    const isTodayDay = isToday(day)
                    const isHovered = hoveredDate === dateStr

                    return (
                        <div key={dateStr} className="relative">
                            <button
                                onClick={() => {
                                    if (hasDebate && dayDebates.length === 1) {
                                        navigate(`/preparations/${dayDebates[0].id}`)
                                    } else {
                                        navigate(`/preparations/new?date=${dateStr}`)
                                    }
                                }}
                                onMouseEnter={() => setHoveredDate(dateStr)}
                                onMouseLeave={() => setHoveredDate(null)}
                                className={`
                                    w-full h-10 rounded-lg text-sm font-medium transition-all relative
                                    flex items-center justify-center
                                    ${isTodayDay
                                        ? 'ring-1 ring-primary text-primary font-bold'
                                        : 'text-foreground/80'
                                    }
                                    ${hasDebate
                                        ? 'bg-primary/15 text-primary hover:bg-primary/25'
                                        : 'hover:bg-secondary'
                                    }
                                    ${isHovered ? 'scale-110 z-10' : ''}
                                `}
                            >
                                {day}
                                {hasDebate && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                        {dayDebates.slice(0, 3).map((_, i) => (
                                            <span
                                                key={i}
                                                className="h-1 w-1 rounded-full bg-primary"
                                            />
                                        ))}
                                    </span>
                                )}
                            </button>

                            {/* Hover tooltip */}
                            {isHovered && hasDebate && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 p-2.5 rounded-lg bg-popover border border-border shadow-xl">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                        {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                    {dayDebates.map((debate) => (
                                        <div
                                            key={debate.id}
                                            className="text-xs text-foreground py-1 border-t border-border first:border-t-0"
                                        >
                                            <span className="font-medium">{debate.title}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] px-1 py-0 rounded-full ${debate.status === 'Ready'
                                                        ? 'bg-ready/20 text-ready'
                                                        : 'bg-preparing/20 text-preparing'
                                                    }`}>
                                                    {debate.status}
                                                </span>
                                                <span className="text-muted-foreground text-[10px]">
                                                    {debate.opponentCount} opp.
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Hovered date details below calendar (fallback for visibility) */}
            <div className="mt-4 min-h-[40px]">
                {hoveredDate && hoveredDebates.length > 0 ? (
                    <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                            {hoveredDebates.length} debate{hoveredDebates.length > 1 ? 's' : ''} on{' '}
                            {new Date(hoveredDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        </span>
                        {' — '}
                        {hoveredDebates.map((d) => d.title).join(', ')}
                    </div>
                ) : hoveredDate ? (
                    <div className="text-xs text-muted-foreground">
                        Click to create a new preparation for{' '}
                        {new Date(hoveredDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground/50">
                        Hover over a date to see details · Click to create a new prep
                    </div>
                )}
            </div>
        </div>
    )
}
