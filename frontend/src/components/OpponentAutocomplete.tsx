import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Opponent } from '@/types'
import { User, X } from 'lucide-react'

interface OpponentAutocompleteProps {
    allOpponents: Opponent[]
    selectedOpponents: Opponent[]
    onAdd: (opponent: Partial<Opponent>) => void
    onRemove: (index: number) => void
}

export function OpponentAutocomplete({
    allOpponents,
    selectedOpponents,
    onAdd,
    onRemove,
}: OpponentAutocompleteProps) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const filtered = allOpponents.filter(
        (op) =>
            op.name.toLowerCase().includes(query.toLowerCase()) &&
            !selectedOpponents.some((s) => s.name === op.name)
    )

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function handleSelect(opponent: Opponent) {
        onAdd(opponent)
        setQuery('')
        setIsOpen(false)
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && query.trim()) {
            e.preventDefault()
            // If exact match exists in suggestions, select it
            const exactMatch = filtered.find(
                (op) => op.name.toLowerCase() === query.toLowerCase()
            )
            if (exactMatch) {
                handleSelect(exactMatch)
            } else {
                // Create new opponent
                onAdd({ name: query.trim() })
                setQuery('')
                setIsOpen(false)
            }
        }
    }

    return (
        <div className="space-y-2">
            {/* Selected opponents */}
            {selectedOpponents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedOpponents.map((op, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5 text-sm group"
                        >
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{op.name}</span>
                            {op.previousEncounters > 0 && (
                                <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0 bg-primary/15 text-primary">
                                    {op.previousEncounters}× seen
                                </Badge>
                            )}
                            <button
                                type="button"
                                onClick={() => onRemove(idx)}
                                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Search input */}
            <div ref={wrapperRef} className="relative">
                <Input
                    placeholder="Search or add opponent..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />

                {/* Dropdown */}
                {isOpen && query.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
                        {filtered.length > 0 ? (
                            <ul className="max-h-48 overflow-auto py-1">
                                {filtered.map((op) => (
                                    <li key={op.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(op)}
                                            className={cn(
                                                'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between transition-colors cursor-pointer'
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                {op.name}
                                                {op.organization && (
                                                    <span className="text-muted-foreground">
                                                        — {op.organization}
                                                    </span>
                                                )}
                                            </span>
                                            {op.previousEncounters > 0 && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary">
                                                    {op.previousEncounters}× encountered
                                                </Badge>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Enter</kbd> to add "{query}" as new opponent
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
