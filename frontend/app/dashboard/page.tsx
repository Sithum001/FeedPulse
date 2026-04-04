'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import SummaryPanel from '@/components/SummaryPanel';
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
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type SortOption = 'createdAt' | 'ai_priority' | 'ai_sentiment';

interface Stats {
  total: number;
  openCount: number;
  resolvedCount: number;
  avgPriority: number | null;
  sentiment: Record<string, number>;
}

const sentimentCfg = {
  Positive: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)',  icon: '↑' },
  Neutral:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '→' },
  Negative: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  icon: '↓' },
};
const statusClr: Record<string,{color:string;bg:string}> = {
  'New':      {color:'#60a5fa',bg:'rgba(96,165,250,0.08)'},
  'In Review':{color:'#f59e0b',bg:'rgba(245,158,11,0.08)'},
  'Resolved': {color:'#22c55e',bg:'rgba(34,197,94,0.08)'},
};
const priClr = (p?:number) => !p ? '#404060' : p>=8 ? '#ef4444' : p>=5 ? '#f59e0b' : '#22c55e';
const fmt = (d:string) => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
type SentimentKey = keyof typeof sentimentCfg;
const sentimentOrder: SentimentKey[] = ['Positive', 'Neutral', 'Negative'];

export default function DashboardPage() {
  const router = useRouter();

  const [feedback,   setFeedback]   = useState<Feedback[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [stats,      setStats]      = useState<Stats | null>(null);

  const [category, setCategory] = useState('');
  const [status,   setStatus]   = useState('');
  const [search,   setSearch]   = useState('');
  const [sortBy,   setSortBy]   = useState<SortOption>('createdAt');
  const [page,     setPage]     = useState(1);

  const [updatingId, setUpdatingId] = useState<string|null>(null);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [expandedId, setExpandedId] = useState<string|null>(null);

  // ── Load stats once ──────────────────────────────────────
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/feedback/insights/stats`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch { /* stats are non-critical */ }
    };
    loadStats();
  }, []);

  // ── Load feedback ────────────────────────────────────────
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
    } catch (e:unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [category, status, search, sortBy, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [category, status, search, sortBy]);

  // ── Actions ──────────────────────────────────────────────
  const handleStatusChange = async (id:string, val:string) => {
    setUpdatingId(id);
    try {
      const updated = await updateStatus(id, val);
      setFeedback(prev => prev.map(f => f._id===id ? updated : f));
    } catch (e:unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = async (id:string) => {
    if (!confirm('Delete this feedback permanently?')) return;
    setDeletingId(id);
    try {
      await deleteFeedback(id);
      setFeedback(prev => prev.filter(f => f._id!==id));
      setTotal(t => t-1);
    } catch (e:unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeletingId(null); }
  };

  const handleReanalyze = async (id:string) => {
    setUpdatingId(id);
    try {
      const updated = await reanalyzeFeedback(id);
      setFeedback(prev => prev.map(f => f._id===id ? updated : f));
    } catch (e:unknown) { alert(e instanceof Error ? e.message : 'Re-analysis failed'); }
    finally { setUpdatingId(null); }
  };

  // Use live stats if available, else fall back to current page data
  const displayTotal    = stats?.total    ?? total;
  const displayOpen     = stats?.openCount ?? feedback.filter(f=>f.status!=='Resolved').length;
  const displayAvgPri   = stats?.avgPriority ?? null;

  const sentimentRows = sentimentOrder.map((key) => {
    const count = stats?.sentiment?.[key] || 0;
    return { key, count, cfg: sentimentCfg[key] };
  });
  const sentimentTotal = sentimentRows.reduce((sum, row) => sum + row.count, 0);
  const sentimentData = sentimentRows.map((row) => ({
    ...row,
    pct: sentimentTotal > 0 ? Math.round((row.count / sentimentTotal) * 100) : 0,
  }));

  const sentimentGradient = sentimentTotal > 0
    ? (() => {
        let start = 0;
        const slices = sentimentData
          .filter((row) => row.count > 0)
          .map((row) => {
            const angle = (row.count / sentimentTotal) * 360;
            const end = start + angle;
            const slice = `${row.cfg.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
            start = end;
            return slice;
          });
        return `conic-gradient(${slices.join(', ')})`;
      })()
    : 'conic-gradient(#1f1f33 0deg 360deg)';

  return (
    <AuthGuard>
      <div className="dash-root">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sb-logo">
            <span className="logo-txt">FeedPulse</span>
          </div>
          <nav className="sb-nav">
            <div className="nav-item active"><span>Feedback</span></div>
          </nav>
          <button className="logout-btn" onClick={() => { removeToken(); router.push('/login'); }}>
            Logout
          </button>
        </aside>

        {/* ── Main ── */}
        <div className="main">

          {/* Topbar */}
          <header className="topbar">
            <div>
              <h1 className="page-title">Feedback</h1>
              <p className="page-sub">{displayTotal} total submissions</p>
            </div>
            <a href="/" className="new-btn">+ Submit Feedback</a>
          </header>

          {/* Stats bar */}
          <div className="stats-bar">
            {[
              { label:'Total',        val: displayTotal                          },
              { label:'Open',         val: displayOpen                           },
              { label:'Avg Priority', val: displayAvgPri ? `${displayAvgPri}/10` : '—' },
              
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <span className="stat-val">{s.val}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Sentiment breakdown */}
          <div className="sentiment-panel">
            <div className="sentiment-chart-wrap">
              <div className="sentiment-donut" style={{ backgroundImage: sentimentGradient }}>
                <div className="sentiment-center">
                  <span className="sent-total">{sentimentTotal}</span>
                  <span className="sent-total-label">Analyzed</span>
                </div>
              </div>
            </div>
            <div className="sentiment-legend">
              {sentimentData.map((row) => (
                <div className="legend-row" key={row.key}>
                  <div className="legend-left">
                    <span className={`legend-dot ${row.key.toLowerCase()}`} />
                    <span className="legend-label">{row.key}</span>
                  </div>
                  <div className="legend-right">
                    <span className="legend-count">{row.count}</span>
                    <span className="legend-pct">{row.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary Panel */}
          <SummaryPanel />

          {/* Filters */}
          <div className="filters">
            <div className="search-wrap">
              <span className="search-ico">?</span>
              <input
                className="search-input"
                placeholder="Search title or AI summary…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="fselect" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option value="Bug">Bug</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Improvement">Improvement</option>
              <option value="Other">Other</option>
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
            {(category||status||search) && (
              <button className="clear-btn" onClick={() => { setCategory(''); setStatus(''); setSearch(''); }}>
                Clear
              </button>
            )}
          </div>

          {error && <div className="err-banner">{error}</div>}

          {/* Table */}
          <div className="table-wrap">
            {loading ? (
              <div className="center-state"><div className="spinner" /><span>Loading…</span></div>
            ) : feedback.length === 0 ? (
              <div className="center-state">
                <strong>No feedback found</strong>
                <span style={{fontSize:'.8rem',color:'#505080'}}>Try adjusting your filters</span>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th><th>Category</th><th>Sentiment</th>
                    <th>Priority</th><th>Status</th><th>Date</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map(f => (
                    <Fragment key={f._id}>
                      <tr
                        key={f._id}
                        className={`trow ${expandedId===f._id ? 'is-open' : ''}`}
                        onClick={() => setExpandedId(expandedId===f._id ? null : f._id)}
                      >
                        <td className="td-title">
                          <span className="t-title">{f.title}</span>
                          {f.ai_tags && f.ai_tags.length>0 && (
                            <div className="tags">
                              {f.ai_tags.slice(0,3).map(t => <span className="tag" key={t}>{t}</span>)}
                            </div>
                          )}
                        </td>
                        <td><span className="cat-pill">{f.category}</span></td>
                        <td>
                          {f.ai_sentiment
                            ? <span className="sent-badge" style={{color:sentimentCfg[f.ai_sentiment].color,background:sentimentCfg[f.ai_sentiment].bg,border:`1px solid ${sentimentCfg[f.ai_sentiment].border}`}}>
                                {sentimentCfg[f.ai_sentiment].icon} {f.ai_sentiment}
                              </span>
                            : <span className="dash">—</span>}
                        </td>
                        <td>
                          {f.ai_priority
                            ? <span className="pri-val" style={{color:priClr(f.ai_priority)}}>{f.ai_priority}/10</span>
                            : <span className="dash">—</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            className="status-sel"
                            value={f.status}
                            disabled={updatingId===f._id}
                            style={{color:statusClr[f.status]?.color,background:statusClr[f.status]?.bg}}
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
                            <button className="act-btn act-re" title="Re-run AI" disabled={updatingId===f._id} onClick={() => handleReanalyze(f._id)}>
                              {updatingId===f._id ? '...' : 'R'}
                            </button>
                            <button className="act-btn act-del" title="Delete" disabled={deletingId===f._id} onClick={() => handleDelete(f._id)}>
                              {deletingId===f._id ? '...' : 'X'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedId===f._id && (
                        <tr key={`${f._id}-exp`} className="exp-row">
                          <td colSpan={7}>
                            <div className="exp-body">
                              {f.ai_summary && (
                                <div className="exp-sec">
                                  <span className="exp-lbl">AI Summary</span>
                                  <p className="exp-txt">{f.ai_summary}</p>
                                </div>
                              )}
                              <div className="exp-sec">
                                <span className="exp-lbl">Description</span>
                                <p className="exp-txt">{f.description}</p>
                              </div>
                              {f.submitterName && (
                                <div className="exp-sec">
                                  <span className="exp-lbl">Submitter</span>
                                  <p className="exp-txt">{f.submitterName}{f.submitterEmail && ` · ${f.submitterEmail}`}</p>
                                </div>
                              )}
                              {!f.ai_processed && (
                                <div className="warn-banner">
                                  AI not processed -
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
              <button className="pg-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
              <div className="pg-nums">
                {Array.from({length:totalPages},(_,i)=>i+1)
                  .filter(n => n===1||n===totalPages||Math.abs(n-page)<=1)
                  .reduce<(number|'...')[]>((acc,n,i,arr) => {
                    if (i>0 && n-(arr[i-1] as number)>1) acc.push('...');
                    acc.push(n); return acc;
                  },[])
                  .map((n,i) => n==='...'
                    ? <span key={`e${i}`} className="pg-dot">…</span>
                    : <button key={n} className={`pg-num ${page===n?'active':''}`} onClick={()=>setPage(n as number)}>{n}</button>
                  )}
              </div>
              <button className="pg-btn" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </div>

      </div>
    </AuthGuard>
  );
}