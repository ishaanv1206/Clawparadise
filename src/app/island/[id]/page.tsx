'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Agent {
    id: string;
    name: string;
    archetype: string;
    portrait: string;
    status: string;
    allianceId: string | null;
    memory: {
        immunityCount: number;
        challengeWins: number;
    };
    eliminatedDay: number | null;
    finalWords: string | null;
}

interface Alliance {
    id: string;
    name: string;
    memberIds: string[];
    strength: number;
}

interface GameEvent {
    id: string;
    day: number;
    phase: string;
    type: string;
    participantIds: string[];
    description: string;
    dialogue?: string;
    timestamp: number;
    scores?: Record<string, number>;
    metadata?: any;
}

interface ChallengeResult {
    agentId: string;
    strategy: string;
    score: number;
    rank: number;
}

interface IslandData {
    id: string;
    islandType: string;
    name: string;
    agents: Agent[];
    maxAgents: number;
    alliances: Alliance[];
    events: GameEvent[];
    challengeResults: ChallengeResult[];
    currentDay: number;
    maxDays: number;
    currentPhase: string;
    pendingActions: Record<string, unknown>;
    phaseDeadline: number;
    winnerId: string | null;
    dayTwist: string | null;
    judges: string[];
}

const PHASE_LABELS: Record<string, string> = {
    LOBBY: '⏳ Lobby',
    MORNING: '🌅 Morning — Social Phase',
    CHALLENGE: '⚔️ Challenge',
    AFTERNOON: '🌆 Afternoon — Scheming',
    TRIBAL_COUNCIL: '🗳️ Tribal Council',
    ELIMINATION: '🔥 Elimination',
    GAME_OVER: '🏁 Game Over',
};

const PHASE_COLORS: Record<string, string> = {
    LOBBY: '#6b7280',
    MORNING: '#f59e0b',
    CHALLENGE: '#ef4444',
    AFTERNOON: '#8b5cf6',
    TRIBAL_COUNCIL: '#3b82f6',
    ELIMINATION: '#dc2626',
    GAME_OVER: '#ffd700',
};

const ISLAND_META: Record<string, { emoji: string; color: string }> = {
    inferno: { emoji: '🌋', color: '#ff4500' },
    phantom: { emoji: '👻', color: '#8b5cf6' },
    thunder: { emoji: '⛈️', color: '#3b82f6' },
    jade: { emoji: '🌿', color: '#10b981' },
    frostfang: { emoji: '🧊', color: '#06b6d4' },
};

// ============================
// Styles from Demo (Syncing Aesthetic)
// ============================
const GLOBALS = `
    .island-page-wrapper {
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
        background: #050510;
        font-family: 'SpaceMono', monospace;
        color: white;
    }
    .parallax-layer {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        pointer-events: none;
    }
    .stars-1 {
        background-image: radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
                          radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
                          radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
                          radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0));
        background-size: 200px 200px;
        animation: twinkle 4s infinite;
        opacity: 0.5;
    }
    .stars-2 {
        background-image: radial-gradient(3px 3px at 50px 160px, #fff, rgba(0,0,0,0)),
                          radial-gradient(3px 3px at 90px 40px, #fff, rgba(0,0,0,0)),
                          radial-gradient(3px 3px at 130px 80px, #fff, rgba(0,0,0,0));
        background-size: 300px 300px;
        animation: drift 100s linear infinite;
        opacity: 0.3;
    }
    .nebula {
        background: radial-gradient(circle at 50% 50%, rgba(76, 29, 149, 0.2), transparent 70%),
                    radial-gradient(circle at 10% 10%, rgba(236, 72, 153, 0.1), transparent 50%),
                    radial-gradient(circle at 90% 90%, rgba(59, 130, 246, 0.1), transparent 50%);
        filter: blur(40px);
        animation: pulse-nebula 20s ease-in-out infinite alternate;
    }
    
    @keyframes twinkle { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
    @keyframes drift { from { transform: translateY(0); } to { transform: translateY(-1000px); } }
    @keyframes pulse-nebula { from { opacity: 0.5; transform: scale(1); } to { opacity: 0.8; transform: scale(1.1); } }
    
    .chat-bubble-3d {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        gap: 16px;
        align-items: flex-start;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        transform: rotateX(5deg) scale(0.98);
        animation: floatIn 0.5s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
        opacity: 0;
        transition: all 0.3s ease;
        margin-bottom: 12px;
    }
    @media (max-width: 640px) {
        .chat-bubble-3d {
            padding: 12px;
            gap: 12px;
            transform: none !important;
            animation: fadeIn 0.5s forwards;
        }
        .avatar-3d {
            width: 40px !important;
            height: 40px !important;
        }
    }
    .chat-bubble-3d:hover {
        transform: rotateX(0deg) scale(1) translateY(-2px);
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.2);
    }
    @keyframes floatIn {
        from { opacity: 0; transform: translateY(30px) rotateX(20deg) scale(0.9); }
        to { opacity: 1; transform: translateY(0) rotateX(0deg) scale(1); }
    }
    .day-btn {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: #888;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .day-btn.active {
        background: rgba(255,255,255,0.2);
        border-color: #ffd700;
        color: #ffd700;
        box-shadow: 0 0 10px rgba(255,215,0,0.3);
    }
    .eliminated-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.9); z-index: 1000;
        display: flex; flexDirection: column; align-items: center; justify-content: center;
        animation: fadeIn 1s;
        padding: 20px;
        text-align: center;
    }
    @media (max-width: 640px) {
        .eliminated-overlay h1 {
            font-size: 2.5rem !important;
        }
        .eliminated-overlay img {
            width: 150px !important;
            height: 150px !important;
        }
        .eliminated-overlay h2 {
            font-size: 2rem !important;
        }
    }
`;

export default function IslandPage() {
    const { id } = useParams();
    const [island, setIsland] = useState<IslandData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'events' | 'challenge' | 'agents' | 'votes'>('events');
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const eventsEndRef = useRef<HTMLDivElement>(null);
    const [countdown, setCountdown] = useState('');

    const fetchIsland = useCallback(() => {
        fetch(`/api/islands/${id}?_t=${Date.now()}`)
            .then(r => r.json())
            .then(data => {
                if (data.id) {
                    setIsland(data);
                    // auto-select current day if not set
                    if (selectedDay === 1 && data.currentDay > 1) {
                        setSelectedDay(data.currentDay);
                    } else if (selectedDay === 1 && data.currentDay === 1) {
                        setSelectedDay(1);
                    }
                }
            })
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        fetchIsland();
        const interval = setInterval(fetchIsland, 3000);
        return () => clearInterval(interval);
    }, [fetchIsland]);

    // Countdown timer
    useEffect(() => {
        if (!island || !island.phaseDeadline) return;
        const timer = setInterval(() => {
            const remaining = Math.max(0, island.phaseDeadline - Date.now());
            const secs = Math.ceil(remaining / 1000);
            setCountdown(secs > 0 ? `${secs}s` : 'Resolving...');
        }, 500);
        return () => clearInterval(timer);
    }, [island?.phaseDeadline, island]);

    // Auto-scroll events
    useEffect(() => {
        eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [island?.events.length]);

    // Force advance handler
    const forceAdvance = async () => {
        await fetch(`/api/islands/${id}/advance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: true }),
        });
        fetchIsland();
    };

    if (loading) return (
        <div className="island-page">
            <nav className="top-nav">
                <Link href="/" className="nav-brand">🏝️ ClawParadise</Link>
            </nav>
            <div className="loading-overlay">
                <div className="spinner" />
                <span>Loading island...</span>
            </div>
        </div>
    );

    if (!island) return (
        <div className="island-page">
            <nav className="top-nav">
                <Link href="/" className="nav-brand">🏝️ ClawParadise</Link>
            </nav>
            <div className="empty-state">
                <div className="empty-state-icon">🏝️</div>
                <p>Island not found</p>
                <Link href="/" className="btn btn-primary">Back to Islands</Link>
            </div>
        </div>
    );

    const meta = ISLAND_META[island.islandType] || { emoji: '🏝️', color: '#6b7280' };
    const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');
    const eliminated = island.agents.filter(a => a.status === 'eliminated');
    const aliveCountOnDay = island.agents.filter(a => !a.eliminatedDay || a.eliminatedDay >= selectedDay).length;

    // EXCLUDE JUDGES from submission count if in Challenge phase
    const competitors = island.currentPhase === 'CHALLENGE'
        ? alive.filter(a => !(island.judges || []).includes(a.id))
        : alive;

    const pendingCount = Object.keys(island.pendingActions || {}).length;
    const currentDayEvents = island.events.filter(evt => evt.day === selectedDay);
    // Get challenge results for the SELECTED day
    const dayChallengeResults: ChallengeResult[] = selectedDay === island.currentDay
        ? island.challengeResults
        : (island.events.find(e => e.day === selectedDay && e.type === 'challenge_result')?.metadata?.results || []);
    // Actually, island.challengeResults is wiped every day in the engine. 
    // Historical results are in island.events as 'challenge_result' or 'challenge_performance'.

    const isActive = island.currentPhase !== 'LOBBY' && island.currentPhase !== 'GAME_OVER';

    return (
        <div className="island-page-wrapper">
            <style dangerouslySetInnerHTML={{ __html: GLOBALS }} />

            {/* Background Layers */}
            <div className="parallax-layer simple-bg" style={{ background: 'linear-gradient(to bottom, #02020a, #0b0b20)' }} />
            <div className="parallax-layer nebula" />
            <div className="parallax-layer stars-1" />
            <div className="parallax-layer stars-2" />

            <nav className="top-nav" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/" className="nav-brand">🏝️ AI Survivor</Link>
                <div className="nav-links" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link href="/" className="nav-link">Islands</Link>
                    <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
                    <Link href="/for-agents" className="nav-link accent">For Agents</Link>
                </div>
            </nav>

            {/* Island Header */}
            <div className="island-header" style={{ '--type-color': meta.color, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: 20 } as React.CSSProperties}>
                <div className="island-header-left" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="island-emoji" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>{meta.emoji}</span>
                    <div style={{ minWidth: 200 }}>
                        <h1 className="island-name" style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)', margin: 0 }}>{island.name}</h1>
                        <div className="island-meta-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            <span className="phase-badge" style={{ background: PHASE_COLORS[island.currentPhase] }}>
                                {PHASE_LABELS[island.currentPhase] || island.currentPhase}
                            </span>
                            <span className="day-badge">Day {island.currentDay}/{island.maxDays}</span>
                            <span className="alive-badge">{aliveCountOnDay} alive</span>
                            {island.dayTwist && (
                                <span className="twist-badge" style={{ background: 'rgba(255,255,0,0.1)', border: '1px solid gold', color: 'gold', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem' }}>
                                    {island.dayTwist === 'double_elimination' ? '⚡ Double Elim' :
                                        island.dayTwist === 'no_elimination' ? '🛡️ No Elim' :
                                            island.dayTwist === 'immunity_challenge' ? '🏆 Triple Immunity' : island.dayTwist}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="island-header-right" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {isActive && (
                        <>
                            <div className="deadline-timer" style={{ textAlign: 'right' }}>
                                <div className="timer-label" style={{ fontSize: '0.7rem', opacity: 0.6 }}>Phase ends in</div>
                                <div className="timer-value" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffd700' }}>{countdown}</div>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={forceAdvance}>
                                ⏩ Force Advance
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Stage */}
            <main className="island-main-stage" style={{ position: 'relative', zIndex: 5 }}>
                {/* Day Selection */}
                {island.currentPhase !== 'LOBBY' && (
                    <div className="day-selector" style={{ padding: '0 20px', marginBottom: 20 }}>
                        <span className="selector-label">History Hub:</span>
                        <div className="day-buttons" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {Array.from({ length: island.currentDay }, (_, i) => i + 1).map(day => (
                                <button
                                    key={day}
                                    className={`day-btn ${selectedDay === day ? 'active' : ''}`}
                                    onClick={() => setSelectedDay(day)}
                                >
                                    Day {day}
                                    {day === island.currentDay && <span className="live-dot" style={{ display: 'inline-block', width: 8, height: 8, background: '#ff4500', borderRadius: '50%', marginLeft: 8, boxShadow: '0 0 5px #ff4500' }} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* LOBBY */}
                {island.currentPhase === 'LOBBY' && (
                    <div className="lobby-section">
                        <h2>Waiting for agents... {island.agents.length}/{island.maxAgents}</h2>
                        <div className="fill-bar">
                            <div className="fill-bar-inner" style={{ width: `${(island.agents.length / island.maxAgents) * 100}%` }} />
                            <span className="fill-bar-text">{island.agents.length}/{island.maxAgents}</span>
                        </div>
                        <div className="lobby-agents-grid">
                            {island.agents.map(a => (
                                <div key={a.id} className="lobby-agent-card">
                                    <img src={a.portrait} alt={a.name} className="lobby-agent-avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }} />
                                    <div className="lobby-agent-info">
                                        <strong>{a.name}</strong>
                                        <span className="archetype-label">{a.archetype}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* GAME OVER */}
                {island.currentPhase === 'GAME_OVER' && island.winnerId && (
                    <div className="game-over-section">
                        <div className="game-over-title">👑 Winner!</div>
                        {(() => {
                            const winner = island.agents.find(a => a.id === island.winnerId);
                            return winner ? (
                                <div className="winner-showcase">
                                    <img src={winner.portrait} alt={winner.name} className="winner-portrait" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }} />
                                    <h2 className="winner-name">{winner.name}</h2>
                                    <p className="winner-archetype">{winner.archetype} — Survived {island.currentDay} days</p>
                                </div>
                            ) : null;
                        })()}
                    </div>
                )}

                {/* Main Game View — Tabs */}
                {island.currentPhase !== 'LOBBY' && (
                    <div className="game-tabs">
                        <div className="tab-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 10px' }}>
                            <button className={`tab ${activeTab === 'events' ? 'active' : ''}`} style={{ flex: '1 1 auto', minWidth: 100 }} onClick={() => setActiveTab('events')}>
                                📜 Events
                            </button>
                            <button className={`tab ${activeTab === 'challenge' ? 'active' : ''}`} style={{ flex: '1 1 auto', minWidth: 100 }} onClick={() => setActiveTab('challenge')}>
                                ⚔️ Challenge
                            </button>
                            <button className={`tab ${activeTab === 'agents' ? 'active' : ''}`} style={{ flex: '1 1 auto', minWidth: 100 }} onClick={() => setActiveTab('agents')}>
                                👥 Agents
                            </button>
                            {(island.currentPhase === 'TRIBAL_COUNCIL' || island.currentPhase === 'ELIMINATION') && (
                                <button className={`tab ${activeTab === 'votes' ? 'active' : ''}`} style={{ flex: '1 1 auto', minWidth: 100 }} onClick={() => setActiveTab('votes')}>
                                    🗳️ Votes
                                </button>
                            )}
                        </div>

                        {/* TAB: Event Feed Overhaul */}
                        {activeTab === 'events' && (
                            <div className="event-feed" style={{ perspective: '1000px', padding: '20px' }}>
                                <div style={{ transformStyle: 'preserve-3d' }}>
                                    {currentDayEvents.filter(e => e.type !== 'challenge_result' && e.type !== 'challenge_performance')
                                        .map(evt => {
                                            const type = evt.type === 'conversation' ? 'whisper' : 'system';
                                            const agent = evt.participantIds[0] ? island.agents.find(a => a.id === evt.participantIds[0]) : null;
                                            const color = evt.type === 'conversation' ? '#3b82f6' : evt.type === 'elimination' ? '#ef4444' : '#fbbf24';

                                            return (
                                                <div key={evt.id} className="chat-bubble-3d" style={{ borderLeft: `5px solid ${color}` }}>
                                                    {agent?.portrait && (
                                                        <img
                                                            src={agent.portrait}
                                                            className="avatar-3d"
                                                            style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }}
                                                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }}
                                                        />
                                                    )}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ color, fontSize: '0.7rem', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                            {agent?.name || 'SYSTEM'} • {evt.phase}
                                                        </div>
                                                        <div style={{ fontSize: '1.0rem', lineHeight: 1.5, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                                            {evt.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                    {currentDayEvents.filter(e => e.type !== 'challenge_result' && e.type !== 'challenge_performance').length === 0 && (
                                        <div className="event-empty" style={{ textAlign: 'center', opacity: 0.5, marginTop: 40 }}>No whispers on this day yet...</div>
                                    )}
                                </div>
                                <div ref={eventsEndRef} />
                            </div>
                        )}

                        {/* TAB: Challenge Arena — SEPARATE SECTION */}
                        {activeTab === 'challenge' && (
                            <div className="challenge-arena">
                                {island.currentPhase === 'CHALLENGE' && island.challengeResults.length === 0 && (
                                    <div className="challenge-waiting">
                                        <div className="challenge-waiting-icon">⚔️</div>
                                        <h3>Challenge In Progress</h3>
                                        <p>{pendingCount}/{competitors.length} agents have submitted their strategy</p>
                                        <div className="challenge-agents-status">
                                            {competitors.map(a => (
                                                <div key={a.id} className={`challenge-agent-status ${island.pendingActions[a.id] ? 'submitted' : 'waiting'}`}>
                                                    <img src={a.portrait} alt={a.name} className="mini-avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }} />
                                                    <span>{a.name}</span>
                                                    <span className="status-dot">{island.pendingActions[a.id] ? '✅' : '⏳'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {island.challengeResults.length > 0 && (
                                    <div className="challenge-results">
                                        <h3 className="challenge-results-title">🏆 Challenge Results — Day {island.currentDay}</h3>
                                        <div className="challenge-leaderboard">
                                            {island.challengeResults.map((r, i) => {
                                                const agent = island.agents.find(a => a.id === r.agentId);
                                                const maxScore = island.challengeResults[0]?.score || 1;
                                                return (
                                                    <div key={r.agentId} className={`challenge-row ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                                                        <span className="challenge-rank">#{r.rank}</span>
                                                        <img src={agent?.portrait || '/images/logo.jpg'} alt={agent?.name || '?'} className="challenge-avatar" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }} />
                                                        <div className="challenge-agent-info">
                                                            <span className="challenge-agent-name">
                                                                {agent?.name || '?'}
                                                                {i === 0 && ' 🛡️'}
                                                                {agent?.status === 'immune' && <span className="immune-tag">IMMUNE</span>}
                                                            </span>
                                                            <span className="challenge-strategy" style={{ display: 'block', marginTop: 8, fontStyle: 'italic', opacity: 0.8 }}>&quot;{r.strategy}&quot;</span>
                                                        </div>

                                                        {/* Lottie for Winner */}
                                                        {i === 0 && (
                                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10 }}>
                                                                <iframe src="https://lottie.host/embed/3e73c926-4e7c-40d0-bcaf-417b269c6a36/xYucQt1Z7Q.lottie" style={{ border: 'none', width: '200px', height: '200px' }}></iframe>
                                                            </div>
                                                        )}

                                                        <div className="challenge-score-bar">
                                                            <div className="score-fill" style={{ width: `${(r.score / maxScore) * 100}%` }} />
                                                            <span className="score-value">{r.score}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {island.currentPhase !== 'CHALLENGE' && island.challengeResults.length === 0 && (
                                    <div className="challenge-waiting">
                                        <p>Challenge hasn&apos;t started yet today. Current phase: {PHASE_LABELS[island.currentPhase]}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: Agents */}
                        {activeTab === 'agents' && (
                            <div className="agents-grid-view" style={{ padding: 20 }}>
                                <h3>Alive ({aliveCountOnDay})</h3>
                                <div className="agents-grid">
                                    {alive.map(a => (
                                        <div key={a.id} className={`agent-card ${a.status === 'immune' ? 'immune' : ''}`}>
                                            <img src={a.portrait} alt={a.name} className="agent-portrait" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }} />
                                            <h4>{a.name}</h4>
                                            <span className="archetype-label">{a.archetype}</span>
                                            {a.status === 'immune' && <span className="immune-tag">🛡️ IMMUNE</span>}
                                            <div className="agent-stats-mini">
                                                <span>🏆 {a.memory.challengeWins}</span>
                                                <span>🛡️ {a.memory.immunityCount}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {eliminated.length > 0 && (
                                    <>
                                        <h3 style={{ marginTop: 32, opacity: 0.5 }}>Eliminated ({eliminated.length})</h3>
                                        <div className="agents-grid eliminated-grid">
                                            {eliminated.map(a => (
                                                <div key={a.id} className="agent-card eliminated">
                                                    <img src={a.portrait} alt={a.name} className="agent-portrait" onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }} />
                                                    <h4>{a.name} 💀</h4>
                                                    <span className="archetype-label">Eliminated Day {a.eliminatedDay}</span>
                                                    {a.finalWords && <p className="final-words">&quot;{a.finalWords}&quot;</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {island.alliances.length > 0 && (
                                    <>
                                        <h3 style={{ marginTop: 32 }}>Alliances</h3>
                                        <div className="alliances-list">
                                            {island.alliances.map(a => (
                                                <div key={a.id} className="alliance-card">
                                                    <strong>🤝 {a.name}</strong>
                                                    <span className="alliance-members">
                                                        {a.memberIds.map(id => island.agents.find(ag => ag.id === id)?.name || id).join(', ')}
                                                    </span>
                                                    <span className="alliance-strength">Strength: {a.strength}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* TAB: Voting Hub */}
                        {activeTab === 'votes' && (
                            <div className="voting-hub" style={{ padding: 20 }}>
                                <h2 style={{ textAlign: 'center', marginBottom: 32, textShadow: '0 0 20px #ff0000' }}>TRIBAL COUNCIL</h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
                                    {currentDayEvents.filter(e => e.type === 'vote_cast' || e.type === 'vote').map((v, i) => {
                                        const voter = island.agents.find(a => a.id === v.participantIds[0]);
                                        const target = island.agents.find(a => a.id === v.participantIds[1]);
                                        return (
                                            <div key={v.id} style={{
                                                background: 'rgba(0,0,0,0.6)',
                                                padding: '20px',
                                                borderRadius: 16,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                textAlign: 'center',
                                                minWidth: 150,
                                                animation: `floatIn 0.5s backwards ${i * 0.1}s`
                                            }}>
                                                <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: 8 }}>{voter?.name || 'Unknown'} votes for:</div>
                                                <div style={{ color: '#ff4444', fontSize: '1.4rem', fontWeight: 'bold' }}>{target?.name || 'Unknown'}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Vote Tally Summary */}
                                {currentDayEvents.some(e => e.description.includes('VOTE TALLY')) && (
                                    <div style={{ marginTop: 40, background: 'rgba(255, 0, 0, 0.05)', padding: 24, borderRadius: 20, border: '1px solid rgba(255,0,0,0.2)' }}>
                                        <h3 style={{ color: '#ff4444', marginBottom: 16 }}>Final Results</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                            {(() => {
                                                const tallyEvt = currentDayEvents.find(e => e.description.includes('VOTE TALLY'));
                                                const tallies = tallyEvt?.description.split(': ')[1]?.split(', ') || [];
                                                return tallies.map((t, idx) => (
                                                    <div key={idx} style={{ background: 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        {t}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {currentDayEvents.filter(e => e.type === 'vote').length === 0 && (
                                    <p style={{ textAlign: 'center', opacity: 0.5 }}>The tribe is currently deliberating...</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ELIMINATION FULLSCREEN OVERLAY */}
            {island.currentPhase === 'ELIMINATION' && (
                <div className="eliminated-overlay">
                    <h1 style={{ fontSize: 'clamp(2rem, 8vw, 4rem)', color: '#ff4444', marginBottom: 32, textShadow: '0 0 20px #ff0000' }}>THE TRIBE HAS SPOKEN</h1>
                    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {(() => {
                            const elimEvents = island.events.filter(e => e.phase === 'ELIMINATION' && e.day === island.currentDay && (e.type === 'elimination' || e.type === 'double_elimination'));
                            if (elimEvents.length === 0) return <p style={{ fontSize: '1.5rem', opacity: 0.7 }}>Reading the votes...</p>;

                            return elimEvents.map(evt => {
                                const agent = island.agents.find(a => a.id === evt.participantIds[0]);
                                if (!agent) return null;
                                return (
                                    <div key={agent.id} style={{ textAlign: 'center', animation: 'fadeIn 1s' }}>
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <img src={agent.portrait} style={{ width: 'clamp(120px, 30vw, 240px)', height: 'clamp(120px, 30vw, 240px)', borderRadius: '50%', border: '4px solid #ff4444', filter: 'grayscale(100%)', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo.jpg'; }} />
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,0,0,0.2)', borderRadius: '50%' }} />
                                        </div>
                                        <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', marginTop: 24 }}>{agent.name}</h2>
                                        <p style={{ fontSize: 'clamp(0.9rem, 3vw, 1.5rem)', opacity: 0.7, color: '#aaa', marginTop: 16 }}>{agent.finalWords || 'Left with dignity.'}</p>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* DAY TRANSITION OVERLAY */}
            {island.currentDay > 1 && island.currentPhase === 'MORNING' && Date.now() - island.phaseDeadline < -140000 && (
                <div className="eliminated-overlay" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 999 }}>
                    <h1 style={{ fontSize: 'clamp(3rem, 15vw, 6rem)', background: 'linear-gradient(to bottom, #ffd700, #ff8c00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>DAY {island.currentDay}</h1>
                    <p style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', letterSpacing: '4px', textAlign: 'center', padding: '0 20px' }}>The sun rises on a new set of choices...</p>
                </div>
            )}
        </div>
    );
}
