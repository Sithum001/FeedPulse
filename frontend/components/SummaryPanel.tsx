'use client';

import { useState } from 'react';
import { getToken } from '@/lib/auth';
import './SummaryPanel.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Theme {
  title: string;
  description: string;
  count: number;
  priority: 'High' | 'Medium' | 'Low';
}

interface SummaryData {
  themes: Theme[];
  overall_insight: string;
  feedbackCount: number;
  period: string;
  generatedAt: string;
}

const priorityClass: Record<Theme['priority'], string> = {
  High: 'theme-priority-high',
  Medium: 'theme-priority-medium',
  Low: 'theme-priority-low',
};

export default function SummaryPanel() {
  const [summary, setSummary]   = useState<SummaryData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [open, setOpen]         = useState(false);

  const fetchSummary = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/feedback/insights/weekly`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSummary(data.data);
      setOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="summary-wrap">
      {/* Trigger button */}
      <button
        className={`summary-trigger ${loading ? 'loading' : ''}`}
        onClick={open ? () => setOpen(false) : fetchSummary}
        disabled={loading}
      >
        <span className="trigger-icon">⚡</span>
        <span>{loading ? 'Analyzing…' : open ? 'Hide Summary' : 'AI Weekly Summary'}</span>
        {loading && <span className="mini-spinner" />}
      </button>

      {/* Panel */}
      {open && summary && (
        <div className="summary-panel">
          {/* Header */}
          <div className="sp-header">
            <div className="sp-title-row">
              <span className="sp-title">Weekly Insights</span>
              <span className="sp-meta">
                {summary.feedbackCount} submissions · {summary.period}
              </span>
            </div>
            <button className="sp-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Overall insight */}
          {summary.overall_insight && (
            <div className="sp-insight">
              <span className="sp-section-label">Overall Insight</span>
              <p className="sp-insight-text">{summary.overall_insight}</p>
            </div>
          )}

          {/* Top 3 themes */}
          <div className="sp-themes">
            <span className="sp-section-label">Top 3 Themes</span>
            <div className="themes-grid">
              {summary.themes.map((theme, i) => (
                <div className="theme-card" key={i}>
                  <div className="theme-top">
                    <div className="theme-num">0{i + 1}</div>
                    <span
                      className={`theme-priority ${priorityClass[theme.priority]}`}
                    >
                      {theme.priority}
                    </span>
                  </div>
                  <h3 className="theme-title">{theme.title}</h3>
                  <p className="theme-desc">{theme.description}</p>
                  <div className="theme-footer">
                    <span className="theme-count">
                      {theme.count} related {theme.count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="sp-footer">
            <span>Generated {new Date(summary.generatedAt).toLocaleString()}</span>
            <button className="sp-refresh" onClick={fetchSummary} disabled={loading}>
              {loading ? '…' : '⟳ Regenerate'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="summary-error">⚠ {error}</div>
      )}
    </div>
  );
}