import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { PrepDetail } from '@/components/PrepDetail'
import { PrepForm } from '@/components/PrepForm'
import { SharedView } from '@/components/SharedView'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import type { Preparation, PreparationCreate, Opponent } from '@/types'
import { Swords } from 'lucide-react'

type View = 'empty' | 'detail' | 'create' | 'edit'

// Simple client-side route detection for shared links
function getSharedToken(): string | null {
  const match = window.location.pathname.match(/^\/shared\/([^/]+)/)
  return match ? match[1]! : null
}

function App() {
  const sharedToken = getSharedToken()

  // If this is a shared link, render the read-only shared view
  if (sharedToken) {
    return <SharedView token={sharedToken} />
  }

  return <MainApp />
}

function MainApp() {
  const [preparations, setPreparations] = useState<Preparation[]>([])
  const [allOpponents, setAllOpponents] = useState<Opponent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<View>('empty')
  const [loading, setLoading] = useState(true)

  const selectedPrep = preparations.find((p) => p.id === selectedId) ?? null

  const refresh = useCallback(async () => {
    try {
      const [preps, opps] = await Promise.all([
        api.getPreparations(),
        api.getOpponents(),
      ])
      setPreparations(preps)
      setAllOpponents(opps)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleSelect(id: string) {
    setSelectedId(id)
    setView('detail')
  }

  function handleNewPrep() {
    setSelectedId(null)
    setView('create')
  }

  async function handleSave(data: PreparationCreate) {
    try {
      if (view === 'edit' && selectedId) {
        const updated = await api.updatePreparation(selectedId, data)
        setPreparations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        setView('detail')
      } else {
        const created = await api.createPreparation(data)
        setPreparations((prev) => [created, ...prev])
        setSelectedId(created.id)
        setView('detail')
      }
      // Refresh opponents list
      const opps = await api.getOpponents()
      setAllOpponents(opps)
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  async function handleDelete() {
    if (!selectedId) return
    try {
      await api.deletePreparation(selectedId)
      setPreparations((prev) => prev.filter((p) => p.id !== selectedId))
      setSelectedId(null)
      setView('empty')
      const opps = await api.getOpponents()
      setAllOpponents(opps)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        preparations={preparations}
        selectedId={selectedId}
        onSelect={handleSelect}
        onNewPrep={handleNewPrep}
      />

      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : view === 'empty' ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Swords className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No preparation selected
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Select a preparation from the sidebar or create a new one to get started.
              </p>
            </div>
          ) : view === 'create' ? (
            <PrepForm
              allOpponents={allOpponents}
              onSave={handleSave}
              onCancel={() => setView(selectedId ? 'detail' : 'empty')}
            />
          ) : view === 'edit' && selectedPrep ? (
            <PrepForm
              initial={selectedPrep}
              allOpponents={allOpponents}
              onSave={handleSave}
              onCancel={() => setView('detail')}
            />
          ) : view === 'detail' && selectedPrep ? (
            <PrepDetail
              preparation={selectedPrep}
              onEdit={() => setView('edit')}
              onDelete={handleDelete}
              onUpdate={(updated) => {
                setPreparations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }}
            />
          ) : null}
        </ScrollArea>
      </main>
    </div>
  )
}

export default App
