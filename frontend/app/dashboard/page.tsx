'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { removeToken } from '@/lib/auth';
import './dashboard.css';
import {
  fetchFeedback,
  updateStatus,
  deleteFeedback,
  reanalyzeFeedback,
  Feedback,
  FeedbackFilters,
} from '@/lib/api';

type SortOption = 'createdAt' | 'ai_priority' | 'ai_sentiment';

const sentimentConfig = {
  Positive: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)',  icon: '↑' },
  Neutral:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '→' },
  Negative: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  icon: '↓' },
};

const categoryIcon: Record<string, string> = {
  'Bug': '🐛', 'Feature Request': '✨', 'Improvement': '🔧', 'Other': '💬',
};

const statusColors: Record<string, { color: string; bg: string }> = {
  'New':       { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)'  },
  'In Review': { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
  'Resolved':  { color: '#22c55e', bg: 'rgba(34,197,94,0.08)'   },
};

const priorityColor = (p?: number) => {
  if (!p) return '#404060';
  if (p >= 8) return '#ef4444';
  if (p >= 5) return '#f59e0b';
  return '#22c55e';
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function DashboardPage() {
  const router = useRouter();

  const [feedback, setFeedback]     = useState<Feedback[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const [category, setCategory] = useState('');
  const [status, setStatus]     = useState('');
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState<SortOption>('createdAt');
  const [page, setPage]         = useState(1);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const filters: FeedbackFilters = { page, limit: 10, sortBy };
      if (category) filters.category = category;
      if (status)   filters.status   = status;
      if (search)   filters.search   = search;
      const data = await fetchFeedback(filters);
      setFeedback(data.feedback);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [category, status, search, sortBy, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [category, status, search, sortBy]);

  const handleStatusChange = async (id: string, val: string) => {
    setUpdatingId(id);
    try {
      const updated = await updateStatus(id, val);
      setFeedback(prev => prev.map(f => f._id === id ? updated : f));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback permanently?')) return;
    setDeletingId(id);
    try {
      await deleteFeedback(id);
      setFeedback(prev => prev.filter(f => f._id !== id));
      setTotal(t => t - 1);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeletingId(null); }
  };

  const handleReanalyze = async (id: string) => {
    setUpdatingId(id);
    try {
      const updated = await reanalyzeFeedback(id);
      setFeedback(prev => prev.map(f => f._id === id ? updated : f));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Re-analysis failed'); }
    finally { setUpdatingId(null); }
  };

  // Stats
  const openCount = feedback.filter(f => f.status !== 'Resolved').length;
  const pScored   = feedback.filter(f => f.ai_priority);
  const avgPri    = pScored.length
    ? (pScored.reduce((s, f) => s + (f.ai_priority || 0), 0) / pScored.length).toFixed(1)
    : '—';
  const allTags   = feedback.flatMap(f => f.ai_tags || []);
  const topTag    = allTags.length
    ? Object.entries(allTags.reduce<Record<string,number>>((a, t) => ({ ...a, [t]: (a[t]||0)+1 }), {}))
        .sort((a, b) => b[1] - a[1])[0]?.[0]
    : '—';

  return (
    <AuthGuard>
      <div className="dash-root">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sb-logo">
            <span>⚡</span>
            <span className="logo-txt">FeedPulse</span>
          </div>
          <nav className="sb-nav">
            <div className="nav-item active">
              <span>◈</span><span>Feedback</span>
            </div>
          </nav>
          <button className="logout-btn" onClick={() => { removeToken(); router.push('/login'); }}>
            ↩ Logout
          </button>
        </aside>

        {/* ── Main ── */}
        <div className="main">

          {/* Topbar */}
          <header className="topbar">
            <div>
              <h1 className="page-title">Feedback</h1>
              <p className="page-sub">{total} total submissions</p>
            </div>
            <a href="/" className="new-btn">+ Submit Feedback</a>
          </header>

          {/* Stats */}
          <div className="stats-bar">
            {[
              { label: 'Total',        val: total       },
              { label: 'Open',         val: openCount   },
              { label: 'Avg Priority', val: avgPri      },
              { label: 'Top Tag',      val: topTag      },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <span className="stat-val">{s.val}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="filters">
            <div className="search-wrap">
              <span className="search-ico">⌕</span>
              <input
                className="search-input"
                placeholder="Search feedback…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="fselect" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option value="Bug">🐛 Bug</option>
              <option value="Feature Request">✨ Feature Request</option>
              <option value="Improvement">🔧 Improvement</option>
              <option value="Other">💬 Other</option>
            </select>
            <select className="fselect" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="In Review">In Review</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select className="fselect" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
              <option value="createdAt">Latest First</option>
              <option value="ai_priority">Highest Priority</option>
              <option value="ai_sentiment">By Sentiment</option>
            </select>
            {(category || status || search) && (
              <button className="clear-btn" onClick={() => { setCategory(''); setStatus(''); setSearch(''); }}>
                ✕ Clear
              </button>
            )}
          </div>

          {error && <div className="err-banner">⚠ {error}</div>}

          {/* Table */}
          <div className="table-wrap">
            {loading ? (
              <div className="center-state"><div className="spinner" /><span>Loading…</span></div>
            ) : feedback.length === 0 ? (
              <div className="center-state">
                <span style={{fontSize:'2rem'}}>◎</span>
                <strong>No feedback found</strong>
                <span style={{fontSize:'0.8rem',color:'#505080'}}>Try adjusting your filters</span>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Sentiment</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map(f => (
                    <Fragment key={f._id}>
                      <tr
                        className={`trow ${expandedId === f._id ? 'is-open' : ''}`}
                        onClick={() => setExpandedId(expandedId === f._id ? null : f._id)}
                      >
                        <td className="td-title">
                          <span className="t-title">{f.title}</span>
                          {f.ai_tags && f.ai_tags.length > 0 && (
                            <div className="tags">
                              {f.ai_tags.slice(0, 3).map(t => <span className="tag" key={t}>{t}</span>)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="cat-pill">
                            {categoryIcon[f.category]} {f.category}
                          </span>
                        </td>
                        <td>
                          {f.ai_sentiment ? (
                            <span className="sent-badge" style={{
                              color: sentimentConfig[f.ai_sentiment].color,
                              background: sentimentConfig[f.ai_sentiment].bg,
                              border: `1px solid ${sentimentConfig[f.ai_sentiment].border}`,
                            }}>
                              {sentimentConfig[f.ai_sentiment].icon} {f.ai_sentiment}
                            </span>
                          ) : <span className="dash">—</span>}
                        </td>
                        <td>
                          {f.ai_priority
                            ? <span className="pri-val" style={{color: priorityColor(f.ai_priority)}}>{f.ai_priority}/10</span>
                            : <span className="dash">—</span>
                          }
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            className="status-sel"
                            value={f.status}
                            disabled={updatingId === f._id}
                            style={{ color: statusColors[f.status]?.color, background: statusColors[f.status]?.bg }}
                            onChange={e => handleStatusChange(f._id, e.target.value)}
                          >
                            <option value="New">New</option>
                            <option value="In Review">In Review</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>
                        <td className="td-date">{fmt(f.createdAt)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="acts">
                            <button
                              className="act-btn act-re" title="Re-run AI"
                              disabled={updatingId === f._id}
                              onClick={() => handleReanalyze(f._id)}
                            >{updatingId === f._id ? '…' : '⟳'}</button>
                            <button
                              className="act-btn act-del" title="Delete"
                              disabled={deletingId === f._id}
                              onClick={() => handleDelete(f._id)}
                            >{deletingId === f._id ? '…' : '✕'}</button>
                          </div>
                        </td>
                      </tr>

                      {expandedId === f._id && (
                        <tr key={`${f._id}-exp`} className="exp-row">
                          <td colSpan={7}>
                            <div className="exp-body">
                              {f.ai_summary && (
                                <div className="exp-sec">
                                  <span className="exp-lbl">⚡ AI Summary</span>
                                  <p className="exp-txt">{f.ai_summary}</p>
                                </div>
                              )}
                              <div className="exp-sec">
                                <span className="exp-lbl">📝 Description</span>
                                <p className="exp-txt">{f.description}</p>
                              </div>
                              {f.submitterName && (
                                <div className="exp-sec">
                                  <span className="exp-lbl">👤 Submitter</span>
                                  <p className="exp-txt">{f.submitterName}{f.submitterEmail && ` · ${f.submitterEmail}`}</p>
                                </div>
                              )}
                              {!f.ai_processed && (
                                <div className="warn-banner">
                                  ⚠ AI not processed —
                                  <button className="inline-link" onClick={() => handleReanalyze(f._id)}>run now</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <div className="pg-nums">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | '...')[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(n); return acc;
                  }, [])
                  .map((n, i) => n === '...'
                    ? <span key={`e${i}`} className="pg-dot">…</span>
                    : <button key={n} className={`pg-num ${page === n ? 'active' : ''}`} onClick={() => setPage(n as number)}>{n}</button>
                  )}
              </div>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>

      </div>
    </AuthGuard>
  );
}