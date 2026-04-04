'use client';

import { useState } from 'react';
import { getToken } from '@/lib/auth';

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

const priorityStyle: Record<string, { color: string; bg: string; border: string }> = {
  High:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
  Low:    { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'   },
};

export default function SummaryPanel() {
  const [summary, setSummary]   = useState<SummaryData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [open, setOpen]         = useState(false);

  const fetchSummary = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/feedback/summary`, {
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
                      className="theme-priority"
                      style={{
                        color:       priorityStyle[theme.priority]?.color,
                        background:  priorityStyle[theme.priority]?.bg,
                        border: `1px solid ${priorityStyle[theme.priority]?.border}`,
                      }}
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

      <style jsx>{`
        .summary-wrap {
          display: flex;
          flex-direction: column;
          gap: .75rem;
        }

        .summary-trigger {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          padding: .55rem 1.1rem;
          background: rgba(91,91,214,.1);
          border: 1px solid rgba(91,91,214,.25);
          border-radius: 8px;
          color: #a5a5f5;
          font-family: inherit;
          font-size: .83rem;
          font-weight: 500;
          cursor: pointer;
          transition: background .2s, border-color .2s;
          align-self: flex-start;
        }
        .summary-trigger:hover:not(:disabled) {
          background: rgba(91,91,214,.18);
          border-color: rgba(91,91,214,.4);
        }
        .summary-trigger:disabled { opacity: .6; cursor: not-allowed; }
        .trigger-icon { font-size: 1rem; }

        .mini-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(165,165,245,.3);
          border-top-color: #a5a5f5;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Panel */
        .summary-panel {
          background: #0d0d1a;
          border: 1px solid #1a1a2e;
          border-radius: 12px;
          overflow: hidden;
          animation: slideDown .25s ease both;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: none; }
        }

        .sp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 1.5rem;
          border-bottom: 1px solid #1a1a2e;
        }
        .sp-title-row { display: flex; flex-direction: column; gap: .15rem; }
        .sp-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 1rem; color: #ddddf5;
        }
        .sp-meta { font-size: .72rem; color: #58587a; }
        .sp-close {
          width: 26px; height: 26px; border-radius: 6px;
          background: transparent; border: 1px solid #1a1a2e;
          color: #58587a; cursor: pointer; font-size: .8rem;
          display: flex; align-items: center; justify-content: center;
          transition: border-color .15s, color .15s;
        }
        .sp-close:hover { border-color: #ef4444; color: #ef4444; }

        .sp-insight {
          padding: 1.1rem 1.5rem;
          border-bottom: 1px solid #1a1a2e;
          display: flex; flex-direction: column; gap: .5rem;
        }
        .sp-section-label {
          font-size: .68rem; color: #58587a;
          text-transform: uppercase; letter-spacing: .07em;
        }
        .sp-insight-text {
          font-size: .88rem; line-height: 1.7;
          color: #b0b0d0;
        }

        .sp-themes {
          padding: 1.1rem 1.5rem;
          display: flex; flex-direction: column; gap: .75rem;
          border-bottom: 1px solid #1a1a2e;
        }
        .themes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: .75rem;
        }
        .theme-card {
          background: #111120;
          border: 1px solid #1a1a2e;
          border-radius: 10px;
          padding: 1rem;
          display: flex; flex-direction: column; gap: .5rem;
          transition: border-color .15s;
        }
        .theme-card:hover { border-color: rgba(91,91,214,.3); }

        .theme-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .theme-num {
          font-family: 'Syne', sans-serif;
          font-weight: 800; font-size: 1.3rem;
          color: #1e1e35;
        }
        .theme-priority {
          font-size: .68rem; font-weight: 600;
          padding: .15rem .5rem; border-radius: 100px;
        }
        .theme-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: .88rem; color: #ddddf5;
          line-height: 1.3;
        }
        .theme-desc {
          font-size: .78rem; color: #7070a0; line-height: 1.6; flex: 1;
        }
        .theme-footer { margin-top: .25rem; }
        .theme-count {
          font-size: .7rem; color: #404060;
        }

        .sp-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: .75rem 1.5rem;
          font-size: .72rem; color: #404060;
        }
        .sp-refresh {
          background: transparent; border: none;
          color: #5b5bd6; font-family: inherit;
          font-size: .72rem; cursor: pointer;
          transition: color .15s;
        }
        .sp-refresh:hover { color: #a5a5f5; }
        .sp-refresh:disabled { opacity: .5; cursor: not-allowed; }

        .summary-error {
          padding: .65rem 1rem;
          background: rgba(239,68,68,.07);
          border: 1px solid rgba(239,68,68,.2);
          border-radius: 8px;
          color: #fca5a5; font-size: .82rem;
        }

        @media (max-width: 900px) {
          .themes-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}