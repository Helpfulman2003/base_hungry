import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, X, Gamepad2 } from 'lucide-react';
import { fetchLeaderboard, fetchPlayerStats } from '../lib/contract.js';

const Leaderboard = ({ wallet, onClose }) => {
  const [entries, setEntries]       = useState([]);
  const [myStats, setMyStats]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
      setLastRefresh(new Date());
      if (wallet?.address) {
        const ps = await fetchPlayerStats(wallet.address);
        setMyStats(ps);
      }
    } catch (e) {
      setError('Could not load leaderboard. Contract may not be deployed yet.');
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { load(); }, [load]);

  const rankLabel = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  const isMe = (addr) =>
    wallet?.address && addr.toLowerCase() === wallet.address.toLowerCase();

  const short = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = Math.floor((Date.now() / 1000) - ts);
    if (d < 60) return `${d}s ago`;
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-panel glass-panel">
        {/* Header */}
        <div className="lb-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={24} className="lb-trophy" />
            <h2 className="lb-title">Leaderboard</h2>
            <span className="lb-badge">Base Mainnet</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-icon" onClick={load} title="Refresh">
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
            <button className="btn btn-secondary btn-icon" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* My Stats */}
        {myStats && myStats.totalGames > 0 && (
          <div className="my-stats-bar">
            <span className="my-stats-label">Your Stats</span>
            <div className="my-stats-values">
              <span>🏆 Best: <strong>{myStats.highScore}</strong></span>
              <span>🎮 Games: <strong>{myStats.totalGames}</strong></span>
              <span>📊 Total: <strong>{myStats.totalScore}</strong></span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="lb-scroll">
          {loading ? (
            <div className="lb-loading">
              <div className="pulse-dot" />
              <div className="pulse-dot" style={{ animationDelay: '0.2s' }} />
              <div className="pulse-dot" style={{ animationDelay: '0.4s' }} />
            </div>
          ) : error ? (
            <div className="lb-error">
              <Gamepad2 size={32} />
              <p>{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="lb-error">
              <Trophy size={32} />
              <p>No scores yet. Be the first!</p>
            </div>
          ) : (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Best Score</th>
                  <th>Games</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.player} className={isMe(e.player) ? 'lb-row-me' : ''}>
                    <td className="lb-rank">{rankLabel(i)}</td>
                    <td>
                      <div className="lb-player">
                        <span className="lb-nickname">{e.nickname || 'Anonymous'}</span>
                        <span className="lb-address">{short(e.player)}</span>
                      </div>
                    </td>
                    <td className="lb-score">{e.highScore}</td>
                    <td className="lb-games">{e.totalGames}</td>
                    <td className="lb-time">{timeAgo(e.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {lastRefresh && (
          <p className="lb-footer">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
