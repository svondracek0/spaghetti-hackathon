import type { Preparation, PreparationCreate, PreparationUpdate, Opponent } from '@/types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    })
    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<T>
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

    // Opponents (for autocomplete)
    getOpponents: () =>
        request<Opponent[]>('/opponents'),
}
