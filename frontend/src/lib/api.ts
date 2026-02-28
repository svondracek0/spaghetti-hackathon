import type { Preparation, PreparationCreate, PreparationUpdate, Opponent, TimeframeData } from '@/types'

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

    // Opponents (for autocomplete)
    // Opponents (for autocomplete)
    getOpponents: () =>
        request<Opponent[]>('/opponents'),

    // Timeline
    getRelevantTimeframes: (query: string) =>
        request<TimeframeData>(`/relevant-timeframes?query=${encodeURIComponent(query)}`),
}
