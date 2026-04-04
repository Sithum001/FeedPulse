import { getToken, removeToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Feedback {
  _id: string;
  title: string;
  description: string;
  category: 'Bug' | 'Feature Request' | 'Improvement' | 'Other';
  status: 'New' | 'In Review' | 'Resolved';
  submitterName?: string;
  submitterEmail?: string;
  ai_category?: string;
  ai_sentiment?: 'Positive' | 'Neutral' | 'Negative';
  ai_priority?: number;
  ai_summary?: string;
  ai_tags?: string[];
  ai_processed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  feedback: Feedback[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FeedbackFilters {
  category?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

// Core authenticated fetch
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Auto-logout on 401
  if (res.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Request failed');
  return data.data;
};

// GET /api/feedback with filters
export const fetchFeedback = async (
  filters: FeedbackFilters = {}
): Promise<FeedbackListResponse> => {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.status)   params.set('status', filters.status);
  if (filters.search)   params.set('search', filters.search);
  if (filters.sortBy)   params.set('sortBy', filters.sortBy);
  if (filters.page)     params.set('page', String(filters.page));
  if (filters.limit)    params.set('limit', String(filters.limit));

  const query = params.toString();
  return apiFetch(`/api/feedback${query ? `?${query}` : ''}`);
};

// PATCH /api/feedback/:id — update status
export const updateStatus = async (
  id: string,
  status: string
): Promise<Feedback> => {
  return apiFetch(`/api/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

// DELETE /api/feedback/:id
export const deleteFeedback = async (id: string): Promise<void> => {
  return apiFetch(`/api/feedback/${id}`, { method: 'DELETE' });
};

// POST /api/feedback/:id/reanalyze
export const reanalyzeFeedback = async (id: string): Promise<Feedback> => {
  return apiFetch(`/api/feedback/${id}/reanalyze`, { method: 'POST' });
};