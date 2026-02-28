import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PrepCard } from './PrepCard'
import { Plus, Sun, Moon } from 'lucide-react'
import type { Preparation } from '@/types'
import logo from '@/assets/daemonsthenes.png'

interface SidebarProps {
    preparations: Preparation[]
    selectedId: string | null
    onSelect: (id: string) => void
    onNewPrep: () => void
}

export function Sidebar({ preparations, selectedId, onSelect, onNewPrep }: SidebarProps) {
    const [isLight, setIsLight] = useState(() => {
        return localStorage.getItem('theme') === 'light'
    })

    useEffect(() => {
        if (isLight) {
            document.documentElement.classList.add('light')
            localStorage.setItem('theme', 'light')
        } else {
            document.documentElement.classList.remove('light')
            localStorage.setItem('theme', 'dark')
        }
    }, [isLight])

    return (
        <aside className="w-80 h-screen flex flex-col bg-sidebar-background border-r border-sidebar-border transition-colors duration-300">
            {/* Header */}
            <div className="p-5 pb-4">
                <div className="flex flex-col items-center gap-2 mb-1">
                    <img src={logo} alt="Daemonsthenes Logo" className="h-12 w-12 object-contain" />
                    <h1 className="text-xl font-bold tracking-tighter text-foreground uppercase">
                        Daemonsthenes
                    </h1>
                </div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70 font-medium mt-2 text-center">
                    Strategic Intelligence
                </p>
            </div>

            <Separator />

            {/* Prep list */}
            <ScrollArea className="flex-1 p-3">
                <div className="space-y-1">
                    {preparations.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-sm text-muted-foreground">No preparations yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Create your first one below
                            </p>
                        </div>
                    ) : (
                        preparations.map((prep) => (
                            <PrepCard
                                key={prep.id}
                                preparation={prep}
                                isSelected={prep.id === selectedId}
                                onClick={() => onSelect(prep.id)}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer: New prep + Theme toggle */}
            <div className="p-3 border-t border-sidebar-border flex gap-2">
                <Button
                    onClick={onNewPrep}
                    className="flex-1 gap-2"
                    variant="default"
                >
                    <Plus className="h-4 w-4" />
                    New Preparation
                </Button>
                <Button
                    onClick={() => setIsLight(!isLight)}
                    variant="outline"
                    size="icon"
                    title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                    {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
            </div>
        </aside>
    )
}
