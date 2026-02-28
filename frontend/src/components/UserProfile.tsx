import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import type { UserProfile as UserProfileType, UserProfileUpdate, NewsTrendPoint } from '@/types'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { User, Building2, Target, MessageSquare, TrendingUp, Save, Pencil, X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Generate mock trend data for demo purposes */
function generateMockTrend(name: string): NewsTrendPoint[] {
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const month = d.toISOString().slice(0, 7)
        const seed = (name || 'user').length + i
        const count = Math.floor(Math.abs(Math.sin(seed * 3.1) * 25) + Math.random() * 8)
        months.push({ month, count })
    }
    return months
}

export function UserProfile() {
    const [profile, setProfile] = useState<UserProfileType | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<UserProfileUpdate>({})

    useEffect(() => {
        api.getProfile()
            .then((p) => {
                setProfile(p)
                setForm({
                    name: p.name,
                    bio: p.bio,
                    organization: p.organization || '',
                    isPublicFigure: p.isPublicFigure,
                    knownPositions: p.knownPositions || '',
                    debateStyle: p.debateStyle || '',
                })
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const trendData = useMemo(() => {
        return generateMockTrend(profile?.name || 'user')
    }, [profile?.name])

    async function handleSave() {
        setSaving(true)
        try {
            const updated = await api.updateProfile(form)
            setProfile(updated)
            setEditing(false)
        } catch (err) {
            console.error('Failed to save profile:', err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="animate-pulse text-muted-foreground">Loading profile...</div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <p className="text-muted-foreground">Failed to load profile</p>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {editing ? 'Edit Profile' : profile.name || 'My Profile'}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {editing ? 'Update your debate identity' : 'Your debate identity and stats'}
                        </p>
                    </div>
                </div>
                {!editing ? (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setEditing(false)
                                setForm({
                                    name: profile.name,
                                    bio: profile.bio,
                                    organization: profile.organization || '',
                                    isPublicFigure: profile.isPublicFigure,
                                    knownPositions: profile.knownPositions || '',
                                    debateStyle: profile.debateStyle || '',
                                })
                            }}
                            className="gap-1.5"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                            <Save className="h-3.5 w-3.5" />
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Profile Form / View */}
            {editing ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Name</label>
                            <input
                                type="text"
                                value={form.name || ''}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Your name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Organization</label>
                            <input
                                type="text"
                                value={form.organization || ''}
                                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Your organization"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Bio</label>
                        <textarea
                            value={form.bio || ''}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-y"
                            placeholder="Tell us about yourself"
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, isPublicFigure: !form.isPublicFigure })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isPublicFigure ? 'bg-primary' : 'bg-muted'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isPublicFigure ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <div>
                            <p className="text-sm font-medium text-foreground">Public Figure</p>
                            <p className="text-xs text-muted-foreground">Enable media coverage tracking</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Known Positions</label>
                        <textarea
                            value={form.knownPositions || ''}
                            onChange={(e) => setForm({ ...form, knownPositions: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-y"
                            placeholder="Your known stances and positions"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Debate Style</label>
                        <textarea
                            value={form.debateStyle || ''}
                            onChange={(e) => setForm({ ...form, debateStyle: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-y"
                            placeholder="Describe your debate approach"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Profile Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.organization && (
                            <div className="rounded-xl bg-card border border-border p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-foreground">Organization</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">{profile.organization}</p>
                            </div>
                        )}
                        {profile.isPublicFigure && (
                            <div className="rounded-xl bg-card border border-border p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-foreground">Public Figure</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">Media coverage tracking enabled</p>
                            </div>
                        )}
                    </div>

                    {profile.bio && (
                        <div className="rounded-xl bg-card border border-border p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Bio</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {profile.bio}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.knownPositions && (
                            <div className="rounded-xl bg-card border border-border p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-foreground">Known Positions</h3>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {profile.knownPositions}
                                </p>
                            </div>
                        )}
                        {profile.debateStyle && (
                            <div className="rounded-xl bg-card border border-border p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-foreground">Debate Style</h3>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {profile.debateStyle}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Show empty state if profile is mostly empty */}
                    {!profile.name && !profile.bio && !profile.organization && (
                        <div className="text-center py-12 rounded-xl bg-card border border-border">
                            <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">Set up your profile</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                                Add your name, organization, and debate style to personalize your experience.
                            </p>
                            <Button variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Profile
                            </Button>
                        </div>
                    )}
                </div>
            )}

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
                                <linearGradient id="colorCountProfile" x1="0" y1="0" x2="0" y2="1">
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
                                fill="url(#colorCountProfile)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
