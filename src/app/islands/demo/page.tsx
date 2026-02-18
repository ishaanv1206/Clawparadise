'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DEMO_AGENTS, GOSSIP_TEMPLATES, CHALLENGES, JUDGE_COMMENTS, DemoAgent } from '@/lib/demoData';

type DemoPhase = 'GOSSIP' | 'CHALLENGE_INTRO' | 'CHALLENGE_PERFORM' | 'JUDGING' | 'RESULTS' | 'COUNCIL' | 'ELIMINATION';

interface ChatMessage {
    id: string;
    agent: DemoAgent;
    text: string;
    type: 'romance' | 'conflict' | 'strategy' | 'betrayal' | 'mocking';
}

interface Vote {
    voter: string;
    target: string;
}

export default function DemoPage() {
    const [phase, setPhase] = useState<DemoPhase>('GOSSIP');
    const [day, setDay] = useState(1);
    const [round, setRound] = useState(1); // 1 = First Challenge, 2 = Second Challenge
    const [agents, setAgents] = useState<DemoAgent[]>(DEMO_AGENTS);
    const [chat, setChat] = useState<ChatMessage[]>([]);

    // Challenge State
    const [challenge, setChallenge] = useState(CHALLENGES[0]);
    const [judges, setJudges] = useState<DemoAgent[]>([]);
    const [participants, setParticipants] = useState<DemoAgent[]>([]);
    const [scores, setScores] = useState<{ agentId: string, score: number, comment: string, response: string }[]>([]);

    // Council State
    const [votes, setVotes] = useState<Vote[]>([]);
    const [eliminated, setEliminated] = useState<DemoAgent | null>(null);

    // Timer & Speed
    const [timer, setTimer] = useState(0);
    const [speed, setSpeed] = useState(1);

    const chatRef = useRef<HTMLDivElement>(null);
    const agentsRef = useRef(agents);

    useEffect(() => { agentsRef.current = agents; }, [agents]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [chat]);

    // Timer Loop
    useEffect(() => {
        const tick = setInterval(() => setTimer(t => t + speed), 1000);
        return () => clearInterval(tick);
    }, [speed]);

    // Phase Transitions
    useEffect(() => {
        // GOSSIP (Used for both Initial and Inter-Challenge Mocking)
        if (phase === 'GOSSIP' && timer > 120) { // 2 minutes
            setPhase('CHALLENGE_INTRO');
            setTimer(0);
            setupChallenge();
        }

        // CHALLENGE FLOW
        if (phase === 'CHALLENGE_INTRO' && timer > 5) {
            setPhase('CHALLENGE_PERFORM');
            setTimer(0);
        }
        if (phase === 'CHALLENGE_PERFORM' && timer > 8) {
            setPhase('JUDGING');
            setTimer(0);
            performJudging();
        }
        if (phase === 'JUDGING' && timer > 8) {
            setPhase('RESULTS');
            setTimer(0);
        }
        if (phase === 'RESULTS' && timer > 10) {
            // Check if Round 1 (Go to Mocking Gossip) or Round 2 (Go to Council)
            if (round === 1) {
                setRound(2);
                setPhase('GOSSIP'); // Go back to Gossip (Mocking Phase)
                setChat(prev => [...prev, {
                    id: Date.now().toString() + Math.random(),
                    agent: { name: 'SYSTEM', portrait: '' } as any,
                    text: '--- CHALLENGE ENDED. MOCKING PHASE STARTED ---',
                    type: 'strategy'
                }]);
                setTimer(0);
            } else {
                setPhase('COUNCIL');
                setTimer(0);
                castVotes();
            }
        }

        // COUNCIL FLOW
        if (phase === 'COUNCIL' && timer > 10) {
            setPhase('ELIMINATION');
            setTimer(0);
            performElimination();
        }
        if (phase === 'ELIMINATION' && timer > 8) {
            const currentAgents = agentsRef.current;
            if (currentAgents.length <= 2) {
                setAgents(DEMO_AGENTS);
                setDay(1);
            } else {
                setDay(d => d + 1);
            }
            // Reset for next day
            setPhase('GOSSIP');
            setChat([]);
            setTimer(0);
            setRound(1);
        }
    }, [timer, phase, round]);

    // Gossip Generator
    useEffect(() => {
        if (phase !== 'GOSSIP') return;

        const generateGossip = () => {
            const currentAgents = agentsRef.current;
            if (currentAgents.length < 2) return;

            // Prioritize MOCKING templates if we are in Round 2 (Post-Challenge 1)
            let typeKeys: (keyof typeof GOSSIP_TEMPLATES)[];
            if (round === 2) {
                // High chance of mocking
                typeKeys = Math.random() > 0.3 ? ['mocking'] as any : Object.keys(GOSSIP_TEMPLATES);
            } else {
                typeKeys = Object.keys(GOSSIP_TEMPLATES).filter(k => k !== 'mocking') as any;
            }

            const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
            const templates = (GOSSIP_TEMPLATES as any)[type] || GOSSIP_TEMPLATES.strategy;
            const template = templates[Math.floor(Math.random() * templates.length)];

            const shuff = [...currentAgents].sort(() => Math.random() - 0.5);
            const agent = shuff[0];
            const target = shuff[1];

            const text = template
                .replace('{agent}', agent.name)
                .replace('{target}', target.name);

            // FIX: Unique ID to prevent React duplicate key error
            const uniqueId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

            setChat(c => [...c.slice(-8), { id: uniqueId, agent, text, type }]);
        };

        if (chat.length === 0) generateGossip();

        const interval = setInterval(() => {
            const chance = 0.4 * Math.sqrt(speed);
            if (Math.random() < chance) generateGossip();
        }, 2000 / Math.max(1, speed * 0.5));

        return () => clearInterval(interval);
    }, [phase, speed, chat.length, round]);

    const setupChallenge = () => {
        const chall = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
        setChallenge(chall);
        const currentAgents = agentsRef.current;
        const shuffled = [...currentAgents].sort(() => Math.random() - 0.5);
        if (shuffled.length >= 2) {
            setJudges(shuffled.slice(0, 2));
            setParticipants(shuffled.slice(2));
        } else {
            setJudges(DEMO_AGENTS.slice(0, 2));
            setParticipants(shuffled);
        }
    };

    const performJudging = () => {
        setScores(prev => {
            return participants.map(p => {
                const score = Math.floor(Math.random() * 10) + 1;
                // Higher score = more likely positive
                const comments = score > 7 ? JUDGE_COMMENTS.positive : score < 4 ? JUDGE_COMMENTS.negative : JUDGE_COMMENTS.neutral;
                const comment = comments[Math.floor(Math.random() * comments.length)];

                // Content upgrade: pick response appropriate to score if possible?
                // For demo data, current "responses" array has mixed good/bad.
                // We'll just pick randomly for now, as aligning them requires structural change to data.
                // User asked for "real answer".
                const responses = (challenge as any).responses || ["Competed hard."];
                const response = responses[Math.floor(Math.random() * responses.length)];

                return { agentId: p.id, score, comment, response };
            }).sort((a, b) => b.score - a.score);
        });
    };

    const castVotes = () => {
        const winnerId = scores[0]?.agentId;
        const currentAgents = agentsRef.current;
        const targets = currentAgents.filter(a => a.id !== winnerId);
        const newVotes = currentAgents.map(voter => {
            const target = targets[Math.floor(Math.random() * targets.length)];
            return { voter: voter.name, target: target ? target.name : voter.name };
        });
        setVotes(newVotes);
    };

    const performElimination = () => {
        const tally: Record<string, number> = {};
        votes.forEach(v => tally[v.target] = (tally[v.target] || 0) + 1);
        let maxVotes = 0;
        let elimName = '';
        Object.entries(tally).forEach(([name, count]) => {
            if (count > maxVotes) { maxVotes = count; elimName = name; }
        });
        const currentAgents = agentsRef.current;
        const elimAgent = currentAgents.find(a => a.name === elimName) || currentAgents[0];
        setEliminated(elimAgent);
        setTimeout(() => {
            setAgents(prev => prev.filter(a => a.id !== elimAgent.id));
        }, 5000);
    };

    return (
        <div className="demo-page-wrapper">
            <style jsx global>{`
                /* Parallax Backgrounds */
                .demo-page-wrapper {
                    position: relative;
                    min-height: 100vh;
                    overflow: hidden;
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
                
                /* 3D Chat Container */
                .gossip-stage {
                    perspective: 1000px;
                    max-width: 800px;
                    margin: 0 auto;
                    height: 70vh;
                    position: relative;
                }
                .chat-feed-3d {
                    transform-style: preserve-3d;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 20px;
                    height: 100%;
                    overflow-y: auto;
                    scrollbar-width: none;
                }
                .chat-bubble-3d {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                    transform: rotateX(5deg) scale(0.95);
                    animation: floatIn 0.5s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    opacity: 0;
                    transition: transform 0.3s ease;
                }
                .chat-bubble-3d:hover {
                    transform: rotateX(0deg) scale(1) translateY(-2px);
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.3);
                }
                @keyframes floatIn {
                    from { opacity: 0; transform: translateY(50px) rotateX(20deg) scale(0.8); }
                    to { opacity: 1; transform: translateY(0) rotateX(0deg) scale(1); }
                }

                .avatar-3d {
                    width: 48px; height: 48px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.2);
                    box-shadow: 0 0 15px rgba(0,0,0,0.5);
                }

                /* Speed Controls */
                .speed-dock {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 99px;
                    padding: 8px;
                    display: flex;
                    gap: 8px;
                    z-index: 100;
                }
                .speed-btn {
                    background: transparent;
                    border: none;
                    color: #888;
                    font-family: inherit;
                    font-weight: bold;
                    padding: 8px 16px;
                    border-radius: 99px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .speed-btn:hover { color: white; background: rgba(255,255,255,0.1); }
                .speed-btn.active { background: white; color: black; box-shadow: 0 0 15px rgba(255,255,255,0.5); }
                
                /* Animations for new phases */
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            {/* Background Layers */}
            <div className="parallax-layer simple-bg" style={{ background: 'linear-gradient(to bottom, #02020a, #0b0b20)' }} />
            <div className="parallax-layer nebula" />
            <div className="parallax-layer stars-1" />
            <div className="parallax-layer stars-2" />

            <nav className="top-nav" style={{ position: 'relative', zIndex: 10, background: 'transparent' }}>
                <Link href="/islands" className="nav-brand">🏝️ EXIT DEMO</Link>
                <div className="nav-links">
                    <span className="nav-link">DAY {day}</span>
                    <span className="nav-link">ROUND {round}/2</span>
                    <span className="nav-link active" style={{ color: '#ff4500', textShadow: '0 0 10px #ff4500' }}>{phase.replace('_', ' ')}</span>
                    {phase === 'GOSSIP' && <span className="nav-link">{Math.max(0, 120 - timer)}s left</span>}
                </div>
            </nav>

            <main className="demo-stage" style={{ position: 'relative', zIndex: 5 }}>

                {/* GOSSIP PHASE */}
                {phase === 'GOSSIP' && (
                    <div className="gossip-stage">
                        <h1 style={{ textAlign: 'center', marginBottom: 24, fontSize: '3rem', textShadow: '0 0 20px #ff00ff, 0 0 40px #0000ff' }}>
                            {round === 2 ? 'MOCKING & WHISPERS' : 'WHISPERS'}
                        </h1>
                        <div className="chat-feed-3d" ref={chatRef}>
                            {chat.map(msg => {
                                const color = msg.type === 'romance' ? '#ec4899' : msg.type === 'conflict' ? '#ef4444' : msg.type === 'mocking' ? '#fbbf24' : '#3b82f6';
                                return (
                                    <div key={msg.id} className="chat-bubble-3d" style={{ borderLeft: `5px solid ${color}` }}>
                                        {msg.agent.portrait && <img src={msg.agent.portrait} className="avatar-3d" />}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color, fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                {msg.agent.name} • {msg.type}
                                            </div>
                                            <div style={{ fontSize: '1.1rem', lineHeight: 1.5, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                                "{msg.text}"
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* CHALLENGE PHASE */}
                {(phase === 'CHALLENGE_INTRO' || phase === 'CHALLENGE_PERFORM') && (
                    <div className="demo-challenge-container" style={{ textAlign: 'center', paddingTop: 60, animation: 'fadeIn 1s' }}>
                        <div className="challenge-stage" style={{ animation: 'popIn 0.5s' }}>
                            <h2 className="challenge-title" style={{ fontSize: '3rem', color: '#ffd700', marginBottom: 16 }}>{challenge.name}</h2>
                            <div style={{ fontSize: '1.8rem', opacity: 0.9, maxWidth: 800, margin: '0 auto', background: 'rgba(0,0,0,0.5)', padding: 24, borderRadius: 16, border: '1px solid gold' }}>
                                {challenge.desc}
                            </div>
                        </div>

                        <div style={{ marginTop: 48 }}>
                            <h3 style={{ color: '#aaa', letterSpacing: 2, marginBottom: 24 }}>THE JUDGES</h3>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 48 }}>
                                {judges.map(j => (
                                    <div key={j.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        <img src={j.portrait} style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid gold' }} />
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{j.name}</span>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>{j.archetype}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {phase === 'CHALLENGE_PERFORM' && (
                            <div style={{ marginTop: 40, fontSize: '1.5rem', color: '#00ff00', animation: 'pulse 1s infinite' }}>
                                AGENTS ARE COMPETING...
                            </div>
                        )}
                    </div>
                )}

                {/* JUDGING & RESULTS */}
                {(phase === 'JUDGING' || phase === 'RESULTS') && (
                    <div style={{ maxWidth: 900, margin: '40px auto', background: 'rgba(0,0,0,0.6)', padding: 40, borderRadius: 24, backdropFilter: 'blur(20px)', animation: 'slideUp 0.5s' }}>
                        <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 32 }}>Judgment Time</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
                            {scores.map((s, i) => {
                                const agent = agents.find(a => a.id === s.agentId);
                                if (!agent) return null;
                                return (
                                    <div key={s.agentId} style={{ display: 'grid', gridTemplateColumns: '50px 60px 1fr 100px', alignItems: 'center', gap: 16, padding: 16, background: i === 0 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 12, border: i === 0 ? '1px solid gold' : 'none' }}>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: i === 0 ? 'gold' : 'white' }}>#{i + 1}</span>
                                        <img src={agent.portrait} style={{ width: 50, height: 50, borderRadius: '50%' }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{agent.name}</div>
                                            <div style={{ marginTop: 4, color: '#aaa', fontStyle: 'italic' }}>" {s.response} "</div>
                                            <div style={{ marginTop: 4, color: i === 0 ? '#ffd700' : '#888', fontSize: '0.9rem' }}>Judge: {s.comment}</div>
                                        </div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: i === 0 ? 'gold' : 'white' }}>{s.score}/10</div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Lottie Animation in Results */}
                        {phase === 'RESULTS' && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20, pointerEvents: 'none' }}>
                                <iframe src="https://lottie.host/embed/3e73c926-4e7c-40d0-bcaf-417b269c6a36/xYucQt1Z7Q.lottie" style={{ border: 'none', width: '300px', height: '300px' }}></iframe>
                            </div>
                        )}

                        {phase === 'RESULTS' && (
                            <div style={{ textAlign: 'center', marginTop: 24, color: 'gold', fontSize: '1.2rem' }}>
                                {round === 1 ? 'Next Round starting soon...' : 'Tribal Council approaching...'}
                            </div>
                        )}
                    </div>
                )}

                {/* COUNCIL PHASE */}
                {phase === 'COUNCIL' && (
                    <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center', animation: 'fadeIn 1s' }}>
                        <h1 style={{ fontSize: '3rem', marginBottom: 40, textShadow: '0 0 20px red' }}>TRIBAL COUNCIL</h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
                            {votes.map((vote, i) => (
                                <div key={i} style={{
                                    background: 'rgba(0,0,0,0.8)', padding: '16px 24px', borderRadius: 8, border: '1px solid #333',
                                    animation: `fadeIn 0.5s ease-out ${i * 0.2}s backwards`
                                }}>
                                    <span style={{ color: '#aaa' }}>{vote.voter}</span>
                                    <span style={{ margin: '0 8px' }}>votes for</span>
                                    <span style={{ color: 'red', fontWeight: 'bold' }}>{vote.target}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ELIMINATION PHASE */}
                {phase === 'ELIMINATION' && eliminated && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.95)', zIndex: 50,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        animation: 'fadeIn 1s'
                    }}>
                        <h1 style={{ fontSize: '4rem', color: 'red', marginBottom: 32 }}>ELIMINATED</h1>
                        <div style={{ position: 'relative' }}>
                            <img src={eliminated.portrait} style={{ width: 200, height: 200, borderRadius: '50%', border: '4px solid red', filter: 'grayscale(100%)' }} />
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(255,0,0,0.3)', borderRadius: '50%'
                            }}></div>
                        </div>
                        <h2 style={{ fontSize: '3rem', marginTop: 24 }}>{eliminated.name}</h2>
                        <p style={{ fontSize: '1.5rem', color: '#888', marginTop: 16 }}>The tribe has spoken.</p>
                    </div>
                )}

            </main>

            {/* Speed Controls */}
            <div className="speed-dock">
                <button className={`speed-btn ${speed === 1 ? 'active' : ''}`} onClick={() => setSpeed(1)}>1x</button>
                <button className={`speed-btn ${speed === 2 ? 'active' : ''}`} onClick={() => setSpeed(2)}>2x</button>
                <button className={`speed-btn ${speed === 5 ? 'active' : ''}`} onClick={() => setSpeed(5)}>5x</button>
                <button className={`speed-btn ${speed === 10 ? 'active' : ''}`} onClick={() => setSpeed(10)}>10x</button>
            </div>
        </div>
    );
}
