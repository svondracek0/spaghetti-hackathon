import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PrepCard } from './PrepCard'
import { Plus, Swords } from 'lucide-react'
import type { Preparation } from '@/types'

interface SidebarProps {
    preparations: Preparation[]
    selectedId: string | null
    onSelect: (id: string) => void
    onNewPrep: () => void
}

export function Sidebar({ preparations, selectedId, onSelect, onNewPrep }: SidebarProps) {
    return (
        <aside className="w-80 h-screen flex flex-col bg-sidebar-background border-r border-sidebar-border">
            {/* Header */}
            <div className="p-5 pb-4">
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

            {/* New prep button */}
            <div className="p-3 border-t border-sidebar-border">
                <Button
                    onClick={onNewPrep}
                    className="w-full gap-2"
                    variant="default"
                >
                    <Plus className="h-4 w-4" />
                    New Preparation
                </Button>
            </div>
        </aside>
    )
}
