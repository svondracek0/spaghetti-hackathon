import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { PrepDetail } from '@/components/PrepDetail'
import { PrepForm } from '@/components/PrepForm'
import { Dashboard } from '@/components/Dashboard'
import { OpponentDetail } from '@/components/OpponentDetail'
import { UserProfile } from '@/components/UserProfile'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import type { Preparation, PreparationCreate, Opponent } from '@/types'

function App() {
  const [preparations, setPreparations] = useState<Preparation[]>([])
  const [allOpponents, setAllOpponents] = useState<Opponent[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar preparations={preparations} opponents={allOpponents} onDataChange={refresh} />

      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/preparations/new" element={
                <PrepFormWrapper
                  allOpponents={allOpponents}
                  onSave={async (data) => {
                    const created = await api.createPreparation(data)
                    setPreparations((prev) => [created, ...prev])
                    const opps = await api.getOpponents()
                    setAllOpponents(opps)
                    return created.id
                  }}
                />
              } />
              <Route path="/preparations/:id/edit" element={
                <PrepEditWrapper
                  preparations={preparations}
                  allOpponents={allOpponents}
                  onSave={async (id, data) => {
                    const updated = await api.updatePreparation(id, data)
                    setPreparations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                    const opps = await api.getOpponents()
                    setAllOpponents(opps)
                    return updated.id
                  }}
                />
              } />
              <Route path="/preparations/:id" element={
                <PrepDetailWrapper
                  preparations={preparations}
                  setPreparations={setPreparations}
                  setAllOpponents={setAllOpponents}
                />
              } />
              <Route path="/opponents/:id" element={<OpponentDetailWrapper onDataChange={refresh} />} />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          )}
        </ScrollArea>
      </main>
    </div>
  )
}

/** Wrapper to handle prep creation with navigation */
function PrepFormWrapper({
  allOpponents,
  onSave,
}: {
  allOpponents: Opponent[]
  onSave: (data: PreparationCreate) => Promise<string>
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetDate = searchParams.get('date') || undefined

  return (
    <div className="p-8">
      <PrepForm
        initial={presetDate ? { debateDate: presetDate } as Preparation : undefined}
        allOpponents={allOpponents}
        onSave={async (data) => {
          const id = await onSave(data)
          navigate(`/preparations/${id}`)
        }}
        onCancel={() => navigate('/')}
      />
    </div>
  )
}

/** Wrapper to handle prep editing with navigation */
function PrepEditWrapper({
  preparations,
  allOpponents,
  onSave,
}: {
  preparations: Preparation[]
  allOpponents: Opponent[]
  onSave: (id: string, data: PreparationCreate) => Promise<string>
}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const prep = preparations.find((p) => p.id === id)

  if (!prep) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">Preparation not found</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PrepForm
        initial={prep}
        allOpponents={allOpponents}
        onSave={async (data) => {
          await onSave(id!, data)
          navigate(`/preparations/${id}`)
        }}
        onCancel={() => navigate(`/preparations/${id}`)}
      />
    </div>
  )
}

/** Wrapper to handle prep detail with navigation */
function PrepDetailWrapper({
  preparations,
  setPreparations,
  setAllOpponents,
}: {
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  setAllOpponents: React.Dispatch<React.SetStateAction<Opponent[]>>
}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const prep = preparations.find((p) => p.id === id)

  if (!prep) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">Preparation not found</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PrepDetail
        preparation={prep}
        onEdit={() => navigate(`/preparations/${id}/edit`)}
        onDelete={async () => {
          await api.deletePreparation(id!)
          setPreparations((prev) => prev.filter((p) => p.id !== id))
          const opps = await api.getOpponents()
          setAllOpponents(opps)
          navigate('/')
        }}
        onUpdate={(updated) => {
          setPreparations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        }}
      />
    </div>
  )
}

/** Wrapper for opponent detail with navigation + data refresh on delete */
function OpponentDetailWrapper({ onDataChange }: { onDataChange: () => Promise<void> }) {
  const navigate = useNavigate()
  return <OpponentDetail onDelete={async () => { await onDataChange(); navigate('/') }} />
}

export default App
