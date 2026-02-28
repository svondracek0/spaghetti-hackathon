import type { Preparation, PreparationCreate, PreparationUpdate, Opponent, OpponentDetail, UserProfile, UserProfileUpdate, DashboardStats, KBStatus, KBQueryResult } from '@/types'

const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (response.status === 204) {
        return null as T
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Network error' }))
        throw new Error(error.detail || 'An error occurred')
    }

    return response.json()
}

export const api = {
    // Preparations
    getPreparations: () =>
        request<Preparation[]>('/preparations'),

    getPreparation: (id: string) =>
        request<Preparation>(`/preparations/${id}`),

    createPreparation: (data: PreparationCreate) =>
        request<Preparation>('/preparations', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updatePreparation: (id: string, data: PreparationUpdate) =>
        request<Preparation>(`/preparations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deletePreparation: (id: string) =>
        request<void>(`/preparations/${id}`, { method: 'DELETE' }),

    // Strategy generation
    generateStrategy: (id: string) =>
        request<Preparation>(`/preparations/${id}/generate`, {
            method: 'POST',
        }),

    // Opponents
    getOpponents: () =>
        request<Opponent[]>('/opponents'),

    getOpponent: (id: string) =>
        request<OpponentDetail>(`/opponents/${id}`),

    createOpponent: (data: { name: string }) =>
        request<Opponent>('/opponents', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    deleteOpponent: (id: string) =>
        request<{ status: string, message: string }>(`/opponents/${id}`, {
            method: 'DELETE',
        }),

    // User Profile
    getProfile: () =>
        request<UserProfile>('/profile'),

    updateProfile: (data: UserProfileUpdate) =>
        request<UserProfile>('/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    // Dashboard
    getDashboardStats: () =>
        request<DashboardStats>('/dashboard/stats'),

    // Knowledgebase
    enableKB: (opponentId: string) =>
        request<KBStatus>(`/opponents/${opponentId}/kb/enable`, { method: 'POST' }),

    disableKB: (opponentId: string) =>
        request<KBStatus>(`/opponents/${opponentId}/kb/disable`, { method: 'POST' }),

    getKBStatus: (opponentId: string) =>
        request<KBStatus>(`/opponents/${opponentId}/kb/status`),

    queryKB: (opponentId: string, query: string, mode: string = 'hybrid') =>
        request<KBQueryResult>(`/opponents/${opponentId}/kb/query`, {
            method: 'POST',
            body: JSON.stringify({ query, mode }),
        }),

    getKBGraph: (opponentId: string) =>
        request<any>(`/opponents/${opponentId}/kb/graph`),
}
