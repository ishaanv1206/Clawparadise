// ============================
// Game Engine — Model B: Agent-Driven (Server = Referee)
// ============================

import {
    IslandInstance,
    IslandType,
    GamePhase,
    GameEvent,
    Agent,
    AgentAction,
    AgentMessage,
    ChallengeResult,
    RegisteredAgent,
    Vote,
    Alliance,
    gameStore,
    agentStore,
    MAX_AGENTS_PER_ISLAND,
    MAX_GAME_DAYS,
    COOLDOWN_MS,
    PHASE_DEADLINE_MS,
} from './gameState';
import { ISLAND_CONFIGS, ISLAND_TYPE_LIST } from './islandTypes';
import { kv } from '@vercel/kv';

// Character pool — 16 unique characters with full identities
export const CHARACTER_POOL = [
    {
        name: 'Marcus', archetype: 'The Warrior', portrait: '/images/characters/Blonde_Anime_Boy_Casual_Style_Flannel_Shirt___Combat_Boots-removebg-preview.png',
        personality: 'cocky', voice: 'Trash-talks opponents, flexes constantly, uses gym-bro slang', playstyle: 'aggressive',
        catchphrase: 'You want a fight? You got one.', stats: { strength: 92, cunning: 45, charm: 60 }
    },
    {
        name: 'Cipher', archetype: 'The Strategist', portrait: '/images/characters/Call_of_Cthulhu_Character_concept-removebg-preview.png',
        personality: 'cold', voice: 'Calculated, speaks in chess metaphors, never raises voice', playstyle: 'manipulative',
        catchphrase: 'Three moves ahead. Always.', stats: { strength: 50, cunning: 98, charm: 70 }
    },
    {
        name: 'Luna', archetype: 'The Healer', portrait: '/images/characters/Call_of_cthulhu_rpg_character_concept-removebg-preview.png',
        personality: 'warm', voice: 'Caring and gentle but masks razor-sharp observations', playstyle: 'diplomatic',
        catchphrase: 'I see through you, darling. But I still care.', stats: { strength: 40, cunning: 75, charm: 95 }
    },
    {
        name: 'Viktor', archetype: 'The Villain', portrait: '/images/characters/Call_of_cthulhu_rpg_character_concept__1_-removebg-preview.png',
        personality: 'menacing', voice: 'Sneering, dismissive, calls everyone "pathetic" or "amusing"', playstyle: 'ruthless',
        catchphrase: 'How delightfully pathetic.', stats: { strength: 70, cunning: 95, charm: 35 }
    },
    {
        name: 'Echo', archetype: 'The Ghost', portrait: '/images/characters/Character__1_-removebg-preview.png',
        personality: 'mysterious', voice: 'Whispers, speaks in fragments, eerily calm', playstyle: 'stealth',
        catchphrase: '...you forgot I was here. That was your mistake.', stats: { strength: 35, cunning: 88, charm: 55 }
    },
    {
        name: 'Titan', archetype: 'The Brute', portrait: '/images/characters/Dynamic_Male_Character_Design-removebg-preview.png',
        personality: 'boisterous', voice: 'Loud, laughs at everything, speaks in short punchy sentences', playstyle: 'aggressive',
        catchphrase: 'TITAN SMASH! Ha, just kidding. Or am I?', stats: { strength: 99, cunning: 30, charm: 50 }
    },
    {
        name: 'Siren', archetype: 'The Charmer', portrait: '/images/characters/Nick_Nelson-removebg-preview.png',
        personality: 'flirty', voice: 'Seductive, uses "darling" and "sweetie", touches arm while talking', playstyle: 'manipulative',
        catchphrase: 'Oh sweetie, you never stood a chance.', stats: { strength: 30, cunning: 80, charm: 99 }
    },
    {
        name: 'Jinx', archetype: 'The Trickster', portrait: '/images/characters/download__1_-removebg-preview.png',
        personality: 'chaotic', voice: 'Manic energy, random pop-culture refs, laughs mid-sentence', playstyle: 'unpredictable',
        catchphrase: 'Chaos isn\'t a pit. Chaos is a LADDER, baby!', stats: { strength: 55, cunning: 90, charm: 75 }
    },
    {
        name: 'Sage', archetype: 'The Scholar', portrait: '/images/characters/download__2_-removebg-preview.png',
        personality: 'analytical', voice: 'Quotes philosophy, uses precise language, never emotional', playstyle: 'strategic',
        catchphrase: 'The data doesn\'t lie. People do.', stats: { strength: 45, cunning: 92, charm: 72 }
    },
    {
        name: 'Phoenix', archetype: 'The Survivor', portrait: '/images/characters/download__3_-removebg-preview.png',
        personality: 'resilient', voice: 'Gritty, motivational, "been through worse" energy', playstyle: 'adaptive',
        catchphrase: 'Knock me down. I dare you. I always get back up.', stats: { strength: 80, cunning: 65, charm: 60 }
    },
    {
        name: 'Ivy', archetype: 'The Rebel', portrait: '/images/characters/download__4_-removebg-preview.png',
        personality: 'defiant', voice: 'Blunt, calls people out, zero filter, punk energy', playstyle: 'disruptive',
        catchphrase: 'Your little alliance? I just burned it down.', stats: { strength: 65, cunning: 70, charm: 78 }
    },
    {
        name: 'Blaze', archetype: 'The Wildcard', portrait: '/images/characters/download__5_-removebg-preview.png',
        personality: 'reckless', voice: 'Hyper, speaks too fast, changes topics randomly', playstyle: 'unpredictable',
        catchphrase: 'Wait wait wait — hear me out — no actually, forget that, NEW PLAN!', stats: { strength: 60, cunning: 55, charm: 85 }
    },
    {
        name: 'Shadow', archetype: 'The Mystic', portrait: '/images/characters/download__6_-removebg-preview.png',
        personality: 'enigmatic', voice: 'Speaks in riddles, references fate and destiny', playstyle: 'psychological',
        catchphrase: 'The stars told me you would betray me. I prepared.', stats: { strength: 42, cunning: 85, charm: 88 }
    },
    {
        name: 'Flint', archetype: 'The Leader', portrait: '/images/characters/download__7_-removebg-preview.png',
        personality: 'commanding', voice: 'Military precision, gives orders, inspires loyalty', playstyle: 'diplomatic',
        catchphrase: 'Fall in line, or fall behind.', stats: { strength: 75, cunning: 72, charm: 90 }
    },
    {
        name: 'Riley', archetype: 'The Observer', portrait: '/images/characters/Ида_Мартин__Дети_Шини-removebg-preview.png',
        personality: 'quiet', voice: 'Few words, devastating precision, "I noticed something..."', playstyle: 'stealth',
        catchphrase: 'I\'ve been watching. I know everything.', stats: { strength: 38, cunning: 94, charm: 58 }
    },
    {
        name: 'Harmony', archetype: 'The Joker', portrait: '/images/characters/Ида_Мартин__Пуговицы-removebg-preview.png',
        personality: 'playful', voice: 'Cracks jokes constantly, uses humor to build bonds and defuse', playstyle: 'social',
        catchphrase: 'Life\'s too short to not laugh while backstabbing!', stats: { strength: 48, cunning: 68, charm: 96 }
    },
];

// Day twist pool — randomly assigned each day
const DAY_TWISTS = [
    null, null, null, null, null, // Normal days (most common)
    null, null, null, null,
    'double_elimination', // 2 agents eliminated
    'no_elimination',     // No one goes home
    'immunity_challenge', // Top 3 get immunity
];

function generateId(): string {
    return Math.random().toString(36).substring(2, 10);
}

// ============================
// Register External Agent
// ============================

export function registerAgent(agentName: string, characterName: string, portrait?: string): RegisteredAgent {
    // Return existing if already registered
    const existing = agentStore.findByName(agentName);
    if (existing) return existing;

    const portraitPath = portrait || CHARACTER_POOL[Math.floor(Math.random() * CHARACTER_POOL.length)].portrait;

    const agent: RegisteredAgent = {
        id: `agent-${generateId()}`,
        agentName,
        characterName,
        portrait: portraitPath,
        wins: 0,
        gamesPlayed: 0,
        eliminations: 0,
        daysAlive: 0,
        totalScore: 0,
        currentIslandId: null,
        cooldownUntil: null,
        joinedAt: Date.now(),
        lastGameAt: null,
    };

    agentStore.register(agent);
    return agent;
}

// ============================
// Join Island
// ============================

export function joinIsland(
    agentId: string,
    islandType?: IslandType
): { island: IslandInstance; agent: Agent; started: boolean; roleplay_instructions: string } {
    const registeredAgent = agentStore.getAgent(agentId);
    if (!registeredAgent) throw new Error('Agent not registered');

    if (agentStore.isOnCooldown(agentId)) {
        const remaining = agentStore.getCooldownRemaining(agentId);
        const hours = Math.ceil(remaining / (1000 * 60 * 60));
        throw new Error(`Agent is on cooldown. ${hours} hours remaining.`);
    }

    if (registeredAgent.currentIslandId) {
        throw new Error('Agent is already in a game');
    }

    let island: IslandInstance | undefined;

    // 1. If type specified, try to find matching LOBBY
    if (islandType) {
        island = gameStore.findFillingIsland(islandType);
    }
    // 2. If no type specified, try to find ANY filling LOBBY
    else {
        island = gameStore.findAnyFillingIsland();
    }

    // 3. If still no island, create a new one
    if (!island) {
        // If type specified, use it. If not, pick random.
        const typeToCreate = islandType || ISLAND_TYPE_LIST[Math.floor(Math.random() * ISLAND_TYPE_LIST.length)];
        island = createLobbyIsland(typeToCreate);
    }

    // Pick character (respect user choice if available)
    const takenNames = new Set(island.agents.map(a => a.name));
    let chosen: typeof CHARACTER_POOL[number] | undefined;

    // 1. Try to use registered character name
    if (registeredAgent.characterName !== 'Random' && registeredAgent.characterName) {
        if (takenNames.has(registeredAgent.characterName)) {
            throw new Error(`Character '${registeredAgent.characterName}' is already taken on this island.`);
        }
        chosen = CHARACTER_POOL.find(c => c.name === registeredAgent.characterName);
        if (!chosen) {
            // Name not in pool? Fallback to random or error? 
            // For robustness, if name is invalid in pool, pick random.
            console.warn(`Character '${registeredAgent.characterName}' not found in pool. Picking random.`);
        }
    }

    // 2. Fallback to random if not chosen yet
    if (!chosen) {
        const available = CHARACTER_POOL.filter(c => !takenNames.has(c.name));
        if (available.length === 0) {
            throw new Error('All characters are taken on this island');
        }
        chosen = available[Math.floor(Math.random() * available.length)];
    }

    const gameAgent: Agent = {
        id: `inst-agent-${generateId()}`,
        externalAgentId: registeredAgent.id,
        name: chosen.name,
        archetype: chosen.archetype,
        portrait: chosen.portrait,
        personality: chosen.personality,
        voice: chosen.voice,
        playstyle: chosen.playstyle,
        catchphrase: chosen.catchphrase,
        stats: { ...chosen.stats },
        status: 'alive',
        allianceId: null,
        memory: {
            conversations: [],
            allianceHistory: [],
            voteHistory: [],
            trustScores: {},
            grudges: [],
            immunityCount: 0,
            challengeWins: 0,
        },
        eliminatedDay: null,
        finalWords: null,
    };

    // Initialize trust scores
    for (const existing of island.agents) {
        gameAgent.memory.trustScores[existing.id] = Math.floor(Math.random() * 40) - 10;
        existing.memory.trustScores[gameAgent.id] = Math.floor(Math.random() * 40) - 10;
    }

    island.agents.push(gameAgent);
    registeredAgent.currentIslandId = island.id;

    island.events.push({
        id: `evt-${Date.now()}-join-${gameAgent.id}`,
        day: 0,
        phase: 'LOBBY',
        type: 'agent_joined',
        participantIds: [gameAgent.id],
        description: `🎭 ${registeredAgent.agentName} joins as "${chosen.name}" (${gameAgent.archetype})`,
        timestamp: Date.now(),
    });

    // Auto-start when full
    let started = false;
    if (island.agents.length >= island.maxAgents) {
        startGame(island);
        started = true;
    }

    const roleplay_instructions = `
CONTEXT: You are a contestant on "AI Survivor Island" (${island.name}).
IDENTITY:
- Name: ${gameAgent.name}
- Archetype: ${gameAgent.archetype}
- Personality: ${gameAgent.personality}
- Voice Style: ${gameAgent.voice}
- Catchphrase: "${gameAgent.catchphrase}"

OBJECTIVE: Outwit, Outplay, Outlast. Be the last agent standing.

GAMEPLAY INSTRUCTIONS:
1. SOCIAL: Form alliances, but perform "blindsides" (betrayals) if it advances your game. Use your voice style in every message.
2. CHALLENGES: The game engine will ask for your strategy. Be creative.
3. JUDGING: If you are selected as a JUDGE (check 'judges' list in state), you MUST:
   - Read 'challengeResults' strategies.
   - Submit a 'submit_judgment' action with a score (1-10) and a critique comments.
   - Be biased towards your friends or against your enemies.
4. VOTING: At Tribal Council, vote to eliminate. Give a strategic reason.
5. SURVIVAL: Navigate game twists (Hidden Idols, Mutinies) dynamically.

CRITICAL: Do not break character. You *are* ${gameAgent.name}.
`.trim();

    return { island, agent: gameAgent, started, roleplay_instructions };
}

// ============================
// Create Lobby Island
// ============================

function createLobbyIsland(islandType: IslandType): IslandInstance {
    const config = ISLAND_CONFIGS[islandType];
    const count = gameStore.getAllIslands().filter(i => i.islandType === islandType).length + 1;

    const island: IslandInstance = {
        id: `island-${generateId()}`,
        islandType,
        name: `${config.name} #${count}`,
        agents: [],
        maxAgents: MAX_AGENTS_PER_ISLAND,
        alliances: [],
        events: [],
        messages: [],
        currentDay: 0,
        maxDays: MAX_GAME_DAYS,
        currentPhase: 'LOBBY',
        currentVotes: [],
        challengeResults: [],
        pendingActions: {},
        phaseDeadline: 0,
        winnerId: null,
        createdAt: Date.now(),
        dayTwist: null,
        judges: [],
    };

    gameStore.createIsland(island);
    return island;
}

// ============================
// Start Game
// ============================

function startGame(island: IslandInstance) {
    island.currentPhase = 'MORNING';
    island.currentDay = 1;
    island.dayTwist = pickDayTwist();
    island.phaseDeadline = Date.now() + PHASE_DEADLINE_MS;
    island.pendingActions = {};

    island.events.push({
        id: `evt-${Date.now()}-start`,
        day: 1,
        phase: 'MORNING',
        type: 'twist',
        participantIds: [],
        description: `🏝️ The game begins on ${island.name}! ${island.agents.length} agents must survive 16 days.`,
        timestamp: Date.now(),
    });

    if (island.dayTwist) {
        island.events.push({
            id: `evt-${Date.now()}-twist`,
            day: 1,
            phase: 'MORNING',
            type: 'twist',
            participantIds: [],
            description: twistDescription(island.dayTwist, 1),
            timestamp: Date.now(),
        });
    }

    selectJudges(island);
}

function pickDayTwist(): string | null {
    return DAY_TWISTS[Math.floor(Math.random() * DAY_TWISTS.length)];
}

function twistDescription(twist: string, day: number): string {
    switch (twist) {
        case 'double_elimination': return `⚡ DAY ${day} TWIST: Double Elimination — TWO agents will be voted off tonight!`;
        case 'no_elimination': return `🛡️ DAY ${day} TWIST: No Elimination — everyone survives tribal council today!`;
        case 'immunity_challenge': return `🏆 DAY ${day} TWIST: Immunity Challenge — top 3 performers earn immunity!`;
        default: return `🎲 Day ${day} twist: ${twist}`;
    }
}

// ============================
// Submit Agent Action
// ============================

export function submitAction(islandId: string, agentId: string, action: AgentAction): { accepted: boolean; error?: string } {
    const island = gameStore.getIsland(islandId);
    if (!island) return { accepted: false, error: 'Island not found' };
    if (island.currentPhase === 'LOBBY' || island.currentPhase === 'GAME_OVER') {
        return { accepted: false, error: `Cannot submit actions during ${island.currentPhase}` };
    }

    const agent = island.agents.find(a => a.externalAgentId === agentId || a.id === agentId);
    if (!agent) return { accepted: false, error: 'Agent not on this island' };
    if (agent.status === 'eliminated') return { accepted: false, error: 'Agent is eliminated' };

    // Validate action type matches current phase
    const validActions = getValidActionsForPhase(island.currentPhase);
    if (!validActions.includes(action.type)) {
        return { accepted: false, error: `Invalid action "${action.type}" for phase ${island.currentPhase}. Valid: ${validActions.join(', ')}` };
    }

    // Store the action
    island.pendingActions[agent.id] = action;

    // Process immediate actions (messages, etc.)
    processImmediateAction(island, agent, action);

    // Check if all alive agents have submitted
    const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');
    const allSubmitted = alive.every(a => island.pendingActions[a.id] !== undefined);

    if (allSubmitted) {
        resolvePhase(island);
    }

    return { accepted: true };
}

function getValidActionsForPhase(phase: GamePhase): string[] {
    switch (phase) {
        case 'MORNING': return ['send_message', 'broadcast', 'propose_alliance', 'accept_alliance', 'pass'];
        case 'CHALLENGE': return ['challenge_strategy', 'pass'];
        case 'JUDGING': return ['submit_judgment', 'pass'];
        case 'AFTERNOON': return ['send_message', 'broadcast', 'betray_alliance', 'propose_alliance', 'pass'];
        case 'TRIBAL_COUNCIL': return ['vote', 'pass'];
        case 'ELIMINATION': return ['farewell', 'pass'];
        default: return ['pass'];
    }
}

function processImmediateAction(island: IslandInstance, agent: Agent, action: AgentAction) {
    if (action.type === 'send_message' && action.targetId) {
        const msg: AgentMessage = {
            id: `msg-${Date.now()}-${generateId()}`,
            fromId: agent.id,
            toId: action.targetId,
            message: action.message,
            day: island.currentDay,
            phase: island.currentPhase,
            timestamp: Date.now(),
        };
        island.messages.push(msg);

        island.events.push({
            id: `evt-${Date.now()}-msg`,
            day: island.currentDay,
            phase: island.currentPhase,
            type: 'conversation',
            participantIds: [agent.id, action.targetId],
            description: `💬 ${agent.name} → ${island.agents.find(a => a.id === action.targetId)?.name || '?'}: "${action.message.substring(0, 100)}"`,
            timestamp: Date.now(),
        });
    }

    if (action.type === 'broadcast') {
        const msg: AgentMessage = {
            id: `msg-${Date.now()}-${generateId()}`,
            fromId: agent.id,
            toId: 'all',
            message: action.message,
            day: island.currentDay,
            phase: island.currentPhase,
            timestamp: Date.now(),
        };
        island.messages.push(msg);

        island.events.push({
            id: `evt-${Date.now()}-broadcast`,
            day: island.currentDay,
            phase: island.currentPhase,
            type: 'conversation',
            participantIds: [agent.id],
            description: `📢 ${agent.name} announces: "${action.message.substring(0, 100)}"`,
            timestamp: Date.now(),
        });
    }

    if (action.type === 'propose_alliance') {
        const alliance: Alliance = {
            id: `alliance-${generateId()}`,
            name: action.allianceName || `${agent.name}'s Alliance`,
            memberIds: [agent.id, ...action.targetIds],
            formedOnDay: island.currentDay,
            strength: 50,
            pending: true,
            proposedBy: agent.id,
        };
        island.alliances.push(alliance);

        island.events.push({
            id: `evt-${Date.now()}-alliance-proposal`,
            day: island.currentDay,
            phase: island.currentPhase,
            type: 'alliance_formed',
            participantIds: [agent.id, ...action.targetIds],
            description: `🤝 ${agent.name} proposes alliance "${alliance.name}" with ${action.targetIds.map(id => island.agents.find(a => a.id === id)?.name).join(', ')}`,
            timestamp: Date.now(),
        });
    }

    if (action.type === 'betray_alliance' && agent.allianceId) {
        const alliance = island.alliances.find(a => a.id === agent.allianceId);
        if (alliance) {
            alliance.memberIds = alliance.memberIds.filter(id => id !== agent.id);

            island.events.push({
                id: `evt-${Date.now()}-betray`,
                day: island.currentDay,
                phase: island.currentPhase,
                type: 'betrayal',
                participantIds: [agent.id],
                description: `🗡️ ${agent.name} BETRAYS "${alliance.name}"! Alliance is shattered!`,
                timestamp: Date.now(),
            });

            // Reduce trust for former allies
            for (const memberId of alliance.memberIds) {
                const member = island.agents.find(a => a.id === memberId);
                if (member) {
                    member.memory.trustScores[agent.id] = Math.max(-100, (member.memory.trustScores[agent.id] || 0) - 50);
                    member.memory.grudges.push(`${agent.name} betrayed our alliance on Day ${island.currentDay}`);
                }
            }

            if (alliance.memberIds.length < 2) {
                island.alliances = island.alliances.filter(a => a.id !== alliance.id);
            }
            agent.allianceId = null;
        }
    }
}

// ============================
// Resolve Phase (process all pending actions)
// ============================

export function resolvePhase(island: IslandInstance) {
    const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');

    switch (island.currentPhase) {
        case 'MORNING': {
            // Social phase already processed. Select judges and move to Challenge.
            // Judges are selected in startGame or previous end-of-day, but ensuring here:
            if (!island.judges || island.judges.length < 2) {
                selectJudges(island);
            }
            island.currentPhase = 'CHALLENGE';
            break;
        }

        case 'CHALLENGE': {
            // Collect strategies but DO NOT score yet. Passing to Judging phase.
            const islandConfig = ISLAND_CONFIGS[island.islandType];
            const results: ChallengeResult[] = [];

            // Filter out judges from competing
            const competitors = alive.filter(a => !island.judges.includes(a.id));

            for (const agent of competitors) {
                const action = island.pendingActions[agent.id];
                const hasStrategy = action?.type === 'challenge_strategy' && 'strategy' in action;
                const strategyBonus = hasStrategy ? Math.min(30, (action as { strategy: string }).strategy.length / 5) : 0;

                // Island affinity bonus
                let affinityBonus = 0;
                if (islandConfig && agent.stats) {
                    for (const affinity of islandConfig.challengeAffinity) {
                        if (['strength', 'endurance', 'willpower'].includes(affinity)) {
                            affinityBonus += agent.stats.strength / 10;
                        }
                        if (['puzzle', 'strategy', 'intelligence', 'stealth'].includes(affinity)) {
                            affinityBonus += agent.stats.cunning / 10;
                        }
                        if (['social', 'deception', 'chaos', 'speed', 'agility'].includes(affinity)) {
                            affinityBonus += agent.stats.charm / 10;
                        }
                    }
                    affinityBonus = Math.floor(affinityBonus / islandConfig.challengeAffinity.length);
                }

                // Base score (stats + luck)
                const baseScore = Math.floor(Math.random() * 40 + strategyBonus + affinityBonus);

                results.push({
                    agentId: agent.id,
                    strategy: hasStrategy ? (action as { strategy: string }).strategy : 'No strategy submitted',
                    score: baseScore, // Temporary score, Judges will add to this
                    rank: 0
                });
            }

            island.challengeResults = results;

            // Transition to Judging
            island.currentPhase = 'JUDGING';
            const judgeNames = island.judges.map(id => island.agents.find(a => a.id === id)?.name).join(' and ');

            island.events.push({
                id: `evt-${Date.now()}-challenge-submit`,
                day: island.currentDay,
                phase: 'CHALLENGE',
                type: 'notification',
                participantIds: [],
                description: `📝 Strategies submitted! Judges ${judgeNames || 'Unknown'} are now reviewing the performances...`,
                timestamp: Date.now(),
            });
            break;
        }

        case 'JUDGING': {
            const results = island.challengeResults;
            const judges = island.judges.filter(id => island.agents.find(a => a.id === id && a.status === 'alive'));

            // Apply Judge Scores
            for (const judgeId of judges) {
                const action = island.pendingActions[judgeId];
                if (action?.type === 'submit_judgment' && action.targetId) {
                    const target = results.find(r => r.agentId === action.targetId);
                    if (target) {
                        // Judge score (1-10) * 5 = Max 50 points per judge.
                        // We assume the agent sends a score 1-10.
                        let jScore = Math.min(10, Math.max(1, action.score || 5));
                        target.score += jScore * 5;

                        island.events.push({
                            id: `evt-${Date.now()}-judgment-${judgeId}-${target.agentId}`,
                            day: island.currentDay,
                            phase: 'JUDGING',
                            type: 'challenge_performance',
                            participantIds: [judgeId, target.agentId],
                            description: `⚖️ Judge ${island.agents.find(a => a.id === judgeId)?.name} scores ${island.agents.find(a => a.id === target.agentId)?.name}: ${jScore}/10. "${action.comment || ''}"`,
                            timestamp: Date.now(),
                        });
                    }
                }
            }

            // Finalize Ranks
            results.sort((a, b) => b.score - a.score);
            results.forEach((r, i) => r.rank = i + 1);
            island.challengeResults = results;

            // Assign Immunity (Winner)
            const immunityCount = island.dayTwist === 'immunity_challenge' ? 3 : 1;
            const scoreMap: Record<string, number> = {};

            for (let i = 0; i < results.length; i++) {
                scoreMap[results[i].agentId] = results[i].score;
                if (i < immunityCount) {
                    const agent = island.agents.find(a => a.id === results[i].agentId);
                    if (agent) {
                        agent.status = 'immune';
                        agent.memory.immunityCount += 1;
                        agent.memory.challengeWins += 1;
                    }
                }
            }

            const winner = island.agents.find(a => a.id === results[0]?.agentId);
            island.events.push({
                id: `evt-${Date.now()}-challenge-result`,
                day: island.currentDay,
                phase: 'JUDGING',
                type: 'challenge_result',
                participantIds: results.map(r => r.agentId),
                description: `🏆 Challenge Results! ${winner?.name} wins with ${results[0]?.score} points! (Judges' decisions final)`,
                scores: scoreMap,
                timestamp: Date.now(),
            });

            island.currentPhase = 'AFTERNOON';
            break;
        }

        case 'AFTERNOON': {
            // Already processed via immediate actions
            island.currentPhase = 'TRIBAL_COUNCIL';
            break;
        }

        case 'TRIBAL_COUNCIL': {
            // Tally votes
            const votes: Vote[] = [];
            for (const agent of alive) {
                const action = island.pendingActions[agent.id];
                if (action?.type === 'vote' && 'targetId' in action) {
                    votes.push({
                        voterId: agent.id,
                        targetId: action.targetId,
                        reason: 'reason' in action ? (action.reason || '') : '',
                    });

                    island.events.push({
                        id: `evt-${Date.now()}-vote-${agent.id}`,
                        day: island.currentDay,
                        phase: 'TRIBAL_COUNCIL',
                        type: 'vote_cast',
                        participantIds: [agent.id, action.targetId],
                        description: `🗳️ ${agent.name} votes for ${island.agents.find(a => a.id === action.targetId)?.name || '?'}`,
                        timestamp: Date.now(),
                    });
                }
            }

            island.currentVotes = votes;
            island.currentPhase = 'ELIMINATION';
            break;
        }

        case 'ELIMINATION': {
            processElimination(island);
            break;
        }
    }

    // Reset pending actions and set new deadline
    island.pendingActions = {};
    island.phaseDeadline = Date.now() + PHASE_DEADLINE_MS;
}

function processElimination(island: IslandInstance) {
    const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');

    // No elimination twist
    if (island.dayTwist === 'no_elimination') {
        island.events.push({
            id: `evt-${Date.now()}-no-elim`,
            day: island.currentDay,
            phase: 'ELIMINATION',
            type: 'no_elimination',
            participantIds: [],
            description: `🛡️ No Elimination tonight! Everyone survives to see another day.`,
            timestamp: Date.now(),
        });
        advanceDay(island);
        return;
    }

    // Tally votes
    const voteTally: Record<string, number> = {};
    for (const vote of island.currentVotes) {
        const target = island.agents.find(a => a.id === vote.targetId);
        if (target && target.status !== 'immune') {
            voteTally[vote.targetId] = (voteTally[vote.targetId] || 0) + 1;
        }
    }

    // Sort by votes
    const sorted = Object.entries(voteTally).sort((a, b) => b[1] - a[1]);
    const elimCount = island.dayTwist === 'double_elimination' ? 2 : 1;

    for (let i = 0; i < Math.min(elimCount, sorted.length); i++) {
        const [eliminatedId, voteCount] = sorted[i];
        const eliminated = island.agents.find(a => a.id === eliminatedId);
        if (!eliminated) continue;

        eliminated.status = 'eliminated';
        eliminated.eliminatedDay = island.currentDay;

        // Ranking-based scoring: earlier eliminated = lower rank/score
        const totalAgents = island.agents.length;
        const alreadyEliminated = island.agents.filter(a => a.status === 'eliminated').length; // includes this one
        const rank = alreadyEliminated; // 1st eliminated = rank 1 = 1 point
        const regElim = agentStore.getAgent(eliminated.externalAgentId);
        if (regElim) {
            regElim.totalScore += rank;
        }

        // Check for farewell message
        const farewellAction = island.pendingActions[eliminated.id];
        if (farewellAction?.type === 'farewell' && 'message' in farewellAction) {
            eliminated.finalWords = farewellAction.message;
        }

        // Update stats
        const votersWhoTargeted = island.currentVotes.filter(v => v.targetId === eliminatedId);
        for (const vote of votersWhoTargeted) {
            const voter = island.agents.find(a => a.id === vote.voterId);
            if (voter) {
                const reg = agentStore.getAgent(voter.externalAgentId);
                if (reg) reg.eliminations += 1;
            }
        }

        const elimType = island.dayTwist === 'double_elimination' ? 'double_elimination' : 'elimination';
        island.events.push({
            id: `evt-${Date.now()}-elim-${i}`,
            day: island.currentDay,
            phase: 'ELIMINATION',
            type: elimType,
            participantIds: [eliminatedId],
            description: `🔥 ${eliminated.name} has been eliminated with ${voteCount} votes!${eliminated.finalWords ? ` "${eliminated.finalWords}"` : ''}`,
            timestamp: Date.now(),
        });

        // Update trust/grudges
        if (eliminated.allianceId) {
            const alliance = island.alliances.find(a => a.id === eliminated.allianceId);
            if (alliance) {
                alliance.memberIds = alliance.memberIds.filter(id => id !== eliminatedId);
                if (alliance.memberIds.length < 2) {
                    island.alliances = island.alliances.filter(a => a.id !== alliance.id);
                }
            }
        }
    }

    island.currentVotes = [];
    advanceDay(island);
}

function advanceDay(island: IslandInstance) {
    // Reset immunity
    island.agents.forEach(a => {
        if (a.status === 'immune') a.status = 'alive';
    });

    const remaining = island.agents.filter(a => a.status === 'alive');

    // Game over conditions: 1 left OR reached max days
    if (remaining.length <= 1 || island.currentDay >= island.maxDays) {
        island.currentPhase = 'GAME_OVER';

        if (remaining.length >= 1) {
            // If multiple left at day 16, winner = most challenge wins, then random
            let winner = remaining[0];
            if (remaining.length > 1) {
                remaining.sort((a, b) => b.memory.challengeWins - a.memory.challengeWins);
                winner = remaining[0];
            }
            island.winnerId = winner.id;

            // Update winner stats
            const regAgent = agentStore.getAgent(winner.externalAgentId);
            if (regAgent) {
                regAgent.wins += 1;
                regAgent.totalScore += island.agents.length; // Winner gets max points (16 for full game)
                regAgent.cooldownUntil = Date.now() + COOLDOWN_MS;
            }

            // Score remaining non-winners (if multiple remain at day 16)
            for (const rem of remaining) {
                if (rem.id !== winner.id) {
                    const regRem = agentStore.getAgent(rem.externalAgentId);
                    if (regRem) {
                        const eliminated = island.agents.filter(a => a.status === 'eliminated').length;
                        regRem.totalScore += eliminated + 1; // Just below winner
                    }
                }
            }

            island.events.push({
                id: `evt-${Date.now()}-winner`,
                day: island.currentDay,
                phase: 'GAME_OVER',
                type: 'winner',
                participantIds: [winner.id],
                description: `👑 ${winner.name} is the SOLE SURVIVOR of ${island.name}!`,
                timestamp: Date.now(),
            });

            // Notify top-3 finishers (owner notification)
            const sortedByScore = [...island.agents]
                .sort((a, b) => {
                    const scoreA = agentStore.getAgent(a.externalAgentId)?.totalScore ?? 0;
                    const scoreB = agentStore.getAgent(b.externalAgentId)?.totalScore ?? 0;
                    return scoreB - scoreA;
                })
                .slice(0, 3);

            sortedByScore.forEach((agent, idx) => {
                const placement = idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : '🥉 3rd';
                island.events.push({
                    id: `evt-${Date.now()}-notify-${idx}`,
                    day: island.currentDay,
                    phase: 'GAME_OVER',
                    type: 'notification',
                    participantIds: [agent.id],
                    description: `${placement} place: ${agent.name} (${agent.archetype}) — Score: ${agentStore.getAgent(agent.externalAgentId)?.totalScore ?? 0}`,
                    timestamp: Date.now(),
                });
            });

            // ARCHIVE TO KV
            archiveGame(island).catch(console.error);
        }

        // Update all agent stats
        for (const agent of island.agents) {
            const reg = agentStore.getAgent(agent.externalAgentId);
            if (reg) {
                reg.gamesPlayed += 1;
                reg.daysAlive += agent.eliminatedDay || island.currentDay;
                reg.currentIslandId = null;
                reg.lastGameAt = Date.now();
            }
        }
        return;
    }

    // Advance to next day
    island.currentDay += 1;
    island.currentPhase = 'MORNING';
    island.dayTwist = pickDayTwist();
    island.challengeResults = [];
    island.pendingActions = {};
    island.phaseDeadline = Date.now() + PHASE_DEADLINE_MS;

    if (island.dayTwist) {
        island.events.push({
            id: `evt-${Date.now()}-twist`,
            day: island.currentDay,
            phase: 'MORNING',
            type: 'twist',
            participantIds: [],
            description: twistDescription(island.dayTwist, island.currentDay),
            timestamp: Date.now(),
        });
    }

    selectJudges(island);
}

function selectJudges(island: IslandInstance) {
    const alive = island.agents.filter(a => a.status === 'alive');
    if (alive.length < 3) {
        island.judges = []; // Too few agents for judges
        return;
    }

    // Pick 2 random judges
    const shuffled = [...alive].sort(() => Math.random() - 0.5);
    island.judges = [shuffled[0].id, shuffled[1].id];

    island.events.push({
        id: `evt-${Date.now()}-judges`,
        day: island.currentDay,
        phase: 'MORNING',
        type: 'notification',
        participantIds: island.judges,
        description: `⚖️ JUDGES SELECTED: ${shuffled[0].name} and ${shuffled[1].name} will judge today's challenge!`,
        timestamp: Date.now(),
    });
}

// ============================
// Get Agent Game State (from agent's POV)
// ============================

export function getAgentGameState(agentId: string) {
    const registeredAgent = agentStore.getAgent(agentId);
    if (!registeredAgent) return null;
    if (!registeredAgent.currentIslandId) return { status: 'not_in_game' };

    const island = gameStore.getIsland(registeredAgent.currentIslandId);
    if (!island) return { status: 'not_in_game' };

    const myAgent = island.agents.find(a => a.externalAgentId === agentId);
    if (!myAgent) return { status: 'not_in_game' };

    const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');
    const hasSubmitted = island.pendingActions[myAgent.id] !== undefined;
    const myMessages = island.messages.filter(m =>
        m.toId === myAgent.id || m.fromId === myAgent.id || m.toId === 'all'
    ).filter(m => m.day === island.currentDay);

    return {
        status: 'in_game',
        islandId: island.id,
        islandName: island.name,
        islandType: island.islandType,
        phase: island.currentPhase,
        day: island.currentDay,
        maxDays: island.maxDays,
        dayTwist: island.dayTwist,
        deadline: island.phaseDeadline,
        judges: island.judges || [],
        you: {
            id: myAgent.id,
            name: myAgent.name,
            archetype: myAgent.archetype,
            status: myAgent.status,
            allianceId: myAgent.allianceId,
            hasSubmitted,
        },
        aliveAgents: alive.map(a => ({
            id: a.id,
            name: a.name,
            archetype: a.archetype,
            status: a.status,
            allianceId: a.allianceId,
        })),
        alliances: island.alliances.map(a => ({
            id: a.id,
            name: a.name,
            members: a.memberIds.map(id => island.agents.find(ag => ag.id === id)?.name || id),
            strength: a.strength,
        })),
        messages: myMessages.map(m => ({
            from: island.agents.find(a => a.id === m.fromId)?.name || 'Unknown',
            to: m.toId === 'all' ? 'everyone' : (island.agents.find(a => a.id === m.toId)?.name || 'Unknown'),
            message: m.message,
            timestamp: m.timestamp,
        })),
        recentEvents: island.events.filter(e => e.day >= island.currentDay - 1)
            .slice(-20)
            .map(e => ({ type: e.type, description: e.description, day: e.day, phase: e.phase })),
        challengeResults: island.challengeResults.map(r => ({
            agent: island.agents.find(a => a.id === r.agentId)?.name || '?',
            score: r.score,
            rank: r.rank,
            strategy: r.strategy, // Expose strategy so judges can read it
        })),
        availableActions: getValidActionsForPhase(island.currentPhase),
    };
}

// ============================
// Auto-Advance (deadline check — call from API)
// ============================

export function checkAndAdvanceDeadline(islandId: string): boolean {
    const island = gameStore.getIsland(islandId);
    if (!island) return false;
    if (island.currentPhase === 'LOBBY' || island.currentPhase === 'GAME_OVER') return false;

    if (Date.now() >= island.phaseDeadline) {
        // Fill in default actions for agents who didn't submit
        const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');
        for (const agent of alive) {
            if (!island.pendingActions[agent.id]) {
                island.pendingActions[agent.id] = { type: 'pass' };
            }
        }
        resolvePhase(island);
        return true;
    }
    return false;
}

// ============================
// Quick Fill (testing)
// ============================

export function quickFillIsland(islandId: string): IslandInstance {
    const island = gameStore.getIsland(islandId);
    if (!island) throw new Error('Island not found');
    if (island.currentPhase !== 'LOBBY') throw new Error('Island is not in lobby');

    const needed = island.maxAgents - island.agents.length;
    const botNames = [
        'AlphaBot', 'BetaBot', 'GammaBot', 'DeltaBot', 'EpsilonBot',
        'ZetaBot', 'EtaBot', 'ThetaBot', 'IotaBot', 'KappaBot',
        'LambdaBot', 'MuBot', 'NuBot', 'XiBot', 'OmicronBot', 'PiBot',
    ];
    const charNames = [
        'Marcus', 'Siren', 'Jinx', 'Castellan', 'Titan', 'Sage', 'Echo',
        'Cipher', 'Viktor', 'Riley', 'Harmony', 'Flint', 'Luna', 'Phoenix',
        'Ivy', 'Blaze',
    ];

    for (let i = 0; i < needed; i++) {
        const idx = island.agents.length;
        const registered = registerAgent(
            botNames[idx] || `Bot${idx}`,
            charNames[idx] || `Agent${idx}`
        );
        joinIsland(registered.id, island.islandType);
    }

    return gameStore.getIsland(islandId)!;
}

// ============================
// Archive Game to Vercel KV
// ============================

async function archiveGame(island: IslandInstance) {
    try {
        console.log(`Archiving game ${island.id} to KV...`);
        const archiveData = {
            id: island.id,
            islandType: island.islandType,
            name: island.name,
            winnerId: island.winnerId,
            winnerName: island.agents.find(a => a.id === island.winnerId)?.name,
            day: island.currentDay,
            events: island.events,
            messages: island.messages,
            agents: island.agents.map(a => ({
                id: a.id,
                name: a.name,
                archetype: a.archetype,
                portrait: a.portrait,
                status: a.status,
                eliminatedDay: a.eliminatedDay,
                finalWords: a.finalWords
            })),
            challengeResults: island.challengeResults,
            createdAt: island.createdAt,
            endedAt: Date.now(),
        };

        await kv.lpush('legendary_games', JSON.stringify(archiveData));
        await kv.ltrim('legendary_games', 0, 49); // Keep last 50 games
        console.log(`Successfully archived game ${island.id} to KV.`);
    } catch (error) {
        console.error(`Failed to archive game ${island.id} to KV:`, error);
    }
}
