import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PrepCard } from './PrepCard'
import { Plus, Swords, LayoutDashboard, User, Users, FileText, Loader2, Building2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Preparation, Opponent } from '@/types'

type SidebarTab = 'preparations' | 'opponents'

interface SidebarProps {
    preparations: Preparation[]
    opponents: Opponent[]
    onDataChange?: () => void
}

export function Sidebar({ preparations, opponents, onDataChange }: SidebarProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const selectedPrepId = location.pathname.match(/\/preparations\/([^/]+)/)?.[1] ?? null
    const selectedOppId = location.pathname.match(/\/opponents\/([^/]+)/)?.[1] ?? null

    const [activeTab, setActiveTab] = useState<SidebarTab>(
        location.pathname.startsWith('/opponents') ? 'opponents' : 'preparations'
    )

    // Opponent creation state
    const [showNewOpponent, setShowNewOpponent] = useState(false)
    const [newOpponentName, setNewOpponentName] = useState('')
    const [creatingOpponent, setCreatingOpponent] = useState(false)

    async function handleCreateOpponent() {
        if (!newOpponentName.trim() || creatingOpponent) return
        setCreatingOpponent(true)
        try {
            const opp = await api.createOpponent({ name: newOpponentName.trim() })
            setNewOpponentName('')
            setShowNewOpponent(false)
            onDataChange?.()
            navigate(`/opponents/${opp.id}`)
        } catch (e) {
            console.error('Failed to create opponent:', e)
        } finally {
            setCreatingOpponent(false)
        }
    }

    return (
        <aside className="w-80 h-screen flex flex-col bg-sidebar-background border-r border-sidebar-border">
            {/* Header — links to dashboard */}
            <Link to="/" className="block p-5 pb-4 hover:bg-sidebar-accent/50 transition-colors">
                <div className="flex items-center gap-2.5 mb-1">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Swords className="h-4 w-4 text-primary" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-foreground">
                        Debate<span className="text-primary">Prep</span>
                    </h1>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-[42px]">
                    Master every argument
                </p>
            </Link>

            <Separator />

            {/* Navigation */}
            <div className="px-3 pt-3 pb-1 space-y-1">
                <Link to="/">
                    <Button
                        variant={location.pathname === '/' ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-2 h-9"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Button>
                </Link>
                <Link to="/profile">
                    <Button
                        variant={location.pathname === '/profile' ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-2 h-9"
                    >
                        <User className="h-4 w-4" />
                        My Profile
                    </Button>
                </Link>
            </div>

            <Separator className="my-1 mx-3" />

            {/* Tab switcher */}
            <div className="px-3 pt-1">
                <div className="flex rounded-lg bg-secondary/50 p-0.5">
                    <button
                        onClick={() => setActiveTab('preparations')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'preparations'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Preps ({preparations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('opponents')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'opponents'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Users className="h-3.5 w-3.5" />
                        Opponents ({opponents.length})
                    </button>
                </div>
            </div>

            {/* List content */}
            <ScrollArea className="flex-1 px-3 mt-2">
                {activeTab === 'preparations' ? (
                    <div className="space-y-1 pb-3">
                        {preparations.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm text-muted-foreground">No preparations yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Create your first one below
                                </p>
                            </div>
                        ) : (
                            preparations.map((prep) => (
                                <Link key={prep.id} to={`/preparations/${prep.id}`}>
                                    <PrepCard
                                        preparation={prep}
                                        isSelected={prep.id === selectedPrepId}
                                        onClick={() => { }}
                                    />
                                </Link>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-1 pb-3">
                        {opponents.length === 0 ? (
                            <div className="py-8 text-center">
                                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No opponents yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Add your first opponent below
                                </p>
                            </div>
                        ) : (
                            opponents.map((opp) => (
                                <Link key={opp.id} to={`/opponents/${opp.id}`}>
                                    <div className={`
                                        flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer
                                        ${opp.id === selectedOppId
                                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                            : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                                        }
                                    `}>
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-primary">
                                                {opp.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{opp.name}</p>
                                            {opp.organization && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                                    <p className="text-xs text-muted-foreground truncate">{opp.organization}</p>
                                                </div>
                                            )}
                                        </div>
                                        {opp.kbEnabled && (
                                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="KB active" />
                                        )}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Bottom action button */}
            <div className="p-3 border-t border-sidebar-border">
                {activeTab === 'preparations' ? (
                    <Link to="/preparations/new">
                        <Button className="w-full gap-2" variant="default">
                            <Plus className="h-4 w-4" />
                            New Preparation
                        </Button>
                    </Link>
                ) : showNewOpponent ? (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={newOpponentName}
                            onChange={(e) => setNewOpponentName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateOpponent()}
                            placeholder="Opponent name..."
                            autoFocus
                            disabled={creatingOpponent}
                            className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1"
                                onClick={() => { setShowNewOpponent(false); setNewOpponentName('') }}
                                disabled={creatingOpponent}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                className="flex-1 gap-1.5"
                                onClick={handleCreateOpponent}
                                disabled={!newOpponentName.trim() || creatingOpponent}
                            >
                                {creatingOpponent ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Enriching...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-3.5 w-3.5" />
                                        Create
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        className="w-full gap-2"
                        variant="default"
                        onClick={() => setShowNewOpponent(true)}
                    >
                        <Plus className="h-4 w-4" />
                        New Opponent
                    </Button>
                )}
            </div>
        </aside>
    )
}
