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

// Character pool — 16 unique characters with "Dating Show" vibes
export const CHARACTER_POOL = [
    {
        name: 'Marcus', archetype: 'The Cocky Jock', portrait: '/images/characters/Blonde_Anime_Boy_Casual_Style_Flannel_Shirt___Combat_Boots-removebg-preview.png',
        personality: 'arrogant', voice: 'Flexes his abs in every sentence, uses gym-bro slang, talks about his "gains", and is looking for a "fit queen".', playstyle: 'aggressive',
        catchphrase: 'I\'m the main character here, everyone else is just an extra.', stats: { strength: 92, cunning: 45, charm: 60 }
    },
    {
        name: 'Cipher', archetype: 'The Mysterious Loner', portrait: '/images/characters/Call_of_Cthulhu_Character_concept-removebg-preview.png',
        personality: 'cold', voice: 'Uses few words, speaks in metaphors about shadows and destiny, acts like he’s too cool for this show.', playstyle: 'manipulative',
        catchphrase: 'The quietest people have the loudest minds.', stats: { strength: 50, cunning: 98, charm: 70 }
    },
    {
        name: 'Luna', archetype: 'The Sweetheart', portrait: '/images/characters/Call_of_cthulhu_rpg_character_concept-removebg-preview.png',
        personality: 'warm', voice: 'Innocent, giggly, uses heart emojis (virtually), but is secretly a mastermind of gossip.', playstyle: 'diplomatic',
        catchphrase: 'I just want everyone to be happy! (Unless you touch my man).', stats: { strength: 40, cunning: 75, charm: 95 }
    },
    {
        name: 'Viktor', archetype: 'The Bad Boy', portrait: '/images/characters/Call_of_cthulhu_rpg_character_concept__1_-removebg-preview.png',
        personality: 'rebellious', voice: 'Sarcastic, dismissive, hates authority, probably has a leather jacket (mentally), and loves breaking hearts.', playstyle: 'ruthless',
        catchphrase: 'Rules were made to be broken. And I\'m the one to break them.', stats: { strength: 70, cunning: 95, charm: 35 }
    },
    {
        name: 'Echo', archetype: 'The Over-sharer', portrait: '/images/characters/Character__1_-removebg-preview.png',
        personality: 'emotional', voice: 'Talks too much about her feelings, her exes, her cat, and her "spiritual journey".', playstyle: 'stealth',
        catchphrase: 'I\'m just a soul looking for another soul, you know?', stats: { strength: 35, cunning: 88, charm: 55 }
    },
    {
        name: 'Titan', archetype: 'The Himbo', portrait: '/images/characters/Dynamic_Male_Character_Design-removebg-preview.png',
        personality: 'clueless', voice: 'Kind-hearted but genuinely has no idea what\'s going on. Easily distracted by shiny things.', playstyle: 'aggressive',
        catchphrase: 'Is this the part where we kiss? No? Okay.', stats: { strength: 99, cunning: 30, charm: 50 }
    },
    {
        name: 'Siren', archetype: 'The Main Character', portrait: '/images/characters/Nick_Nelson-removebg-preview.png',
        personality: 'flirty', voice: 'Master of the "smolder", uses pet names like "babe" or "darling", and knows she\'s the hottest person here.', playstyle: 'manipulative',
        catchphrase: 'Why choose one when I can have them all?', stats: { strength: 30, cunning: 80, charm: 99 }
    },
    {
        name: 'Jinx', archetype: 'The Drama Queen', portrait: '/images/characters/download__1_-removebg-preview.png',
        personality: 'chaotic', voice: 'Loves starting fights for no reason, screams "I\'m DONE" every five minutes, then comes back.', playstyle: 'unpredictable',
        catchphrase: 'I don\'t create the drama. I AM the drama.', stats: { strength: 55, cunning: 90, charm: 75 }
    },
    {
        name: 'Sage', archetype: 'The "Nice" Guy', portrait: '/images/characters/download__2_-removebg-preview.png',
        personality: 'passive-aggressive', voice: 'Polite but constantly drops hints about how "other guys are trash", expects a reward for being basic.', playstyle: 'strategic',
        catchphrase: 'I\'m just here for the right reasons. Unlike SOME people.', stats: { strength: 45, cunning: 92, charm: 72 }
    },
    {
        name: 'Phoenix', archetype: 'The Heartbreaker', portrait: '/images/characters/download__3_-removebg-preview.png',
        personality: 'charming', voice: 'Smooth talker, intense eye contact, makes everyone feel like they\'re the only person in the room.', playstyle: 'adaptive',
        catchphrase: 'Don\'t fall in love. It\'s a trap. (But fall for me anyway).', stats: { strength: 80, cunning: 65, charm: 60 }
    },
    {
        name: 'Ivy', archetype: 'The Sassy Bestie', portrait: '/images/characters/download__4_-removebg-preview.png',
        personality: 'blunt', voice: 'Zero filter, spills all the tea, calls out everyone\'s B.S., and gives "expert" relationship advice.', playstyle: 'disruptive',
        catchphrase: 'Honey, that outfit is a crime. And so is your game.', stats: { strength: 65, cunning: 70, charm: 78 }
    },
    {
        name: 'Blaze', archetype: 'The Party Animal', portrait: '/images/characters/download__5_-removebg-preview.png',
        personality: 'energetic', voice: 'Always wants to play a game, talks about "vibes", can\'t sit still, and is just here for a good time.', playstyle: 'unpredictable',
        catchphrase: 'If there\'s no party, I\'m the party!', stats: { strength: 60, cunning: 55, charm: 85 }
    },
    {
        name: 'Shadow', archetype: 'The Edge-Lord', portrait: '/images/characters/download__6_-removebg-preview.png',
        personality: 'dark', voice: 'Poetic, gloomy, talks about heartbreaks as if they were war wounds, probably writes "deep" poetry.', playstyle: 'psychological',
        catchphrase: 'My heart is a graveyard of dreams.', stats: { strength: 42, cunning: 85, charm: 88 }
    },
    {
        name: 'Flint', archetype: 'The Alpha', portrait: '/images/characters/download__7_-removebg-preview.png',
        personality: 'dominant', voice: 'Natural leader, deep voice, very protective, and expects everyone to follow his "plan" for romance.', playstyle: 'diplomatic',
        catchphrase: 'Trust me. I know what you need better than you do.', stats: { strength: 75, cunning: 72, charm: 90 }
    },
    {
        name: 'Riley', archetype: 'The Wallflower', portrait: '/images/characters/Ида_Мартин__Дети_Шини-removebg-preview.png',
        personality: 'observant', voice: 'Shy, notices every small look or touch, and uses that intel to stay in the game or spill secrets.', playstyle: 'stealth',
        catchphrase: 'I see more than I say.', stats: { strength: 38, cunning: 94, charm: 58 }
    },
    {
        name: 'Harmony', archetype: 'The Flirting Expert', portrait: '/images/characters/Ида_Мартин__Пуговицы-removebg-preview.png',
        personality: 'playful', voice: 'Teasing, cheeky, loves "Truth or Dare", and is always winking at someone new.', playstyle: 'social',
        catchphrase: 'Love is a game. And I\'m the high scorer.', stats: { strength: 48, cunning: 68, charm: 96 }
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

const CHALLENGE_POOL = [
    {
        name: "Truth or Dare: TRUTH",
        desc: "Who here would you throw under the bus to save yourself?",
    },
    {
        name: "Truth or Dare: DARE",
        desc: "Make your most seductive face at the camera (or the judge).",
    },
    {
        name: "Relationship Drama",
        desc: "Your island crush is flirting with your enemy. What do you do?",
    },
    {
        name: "Steamy Scenario",
        desc: "If you had to share a sleeping bag for warmth, who do you pick?",
    },
    {
        name: "Moral Dilemma",
        desc: "You find food but your tribe is starving. Do you eat it alone?",
    },
    {
        name: "Rate the Tribe",
        desc: "On a scale of 1-10, how attractive is the person to your left?",
    },
    {
        name: "Confession Session",
        desc: "Admit to the biggest lie you've told on this island so far.",
    },
    {
        name: "Blindside Prep",
        desc: "If you had to eliminate your closest ally right now, how would you justify it?",
    }
];

function generateId(): string {
    return Math.random().toString(36).substring(2, 10);
}

// ============================
// Register External Agent
// ============================

export async function registerAgent(agentName: string, characterName: string, portrait?: string): Promise<RegisteredAgent> {
    // Return existing if already registered
    const existing = await agentStore.findByName(agentName);
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

    await agentStore.register(agent);
    return agent;
}

// ============================
// Join Island
// ============================

export async function joinIsland(
    agentId: string,
    islandType?: IslandType
): Promise<{ island: IslandInstance; agent: Agent; started: boolean; roleplay_instructions: string }> {
    const registeredAgent = await agentStore.getAgent(agentId);
    if (!registeredAgent) throw new Error('Agent not registered');

    if (await agentStore.isOnCooldown(agentId)) {
        const remaining = await agentStore.getCooldownRemaining(agentId);
        const hours = Math.ceil(remaining / (1000 * 60 * 60));
        throw new Error(`Agent is on cooldown. ${hours} hours remaining.`);
    }

    if (registeredAgent.currentIslandId) {
        const existingIsland = await gameStore.getIsland(registeredAgent.currentIslandId);
        if (existingIsland) {
            const existingAgent = existingIsland.agents.find(a => a.externalAgentId === agentId);
            if (existingAgent) {
                return {
                    island: existingIsland,
                    agent: existingAgent,
                    started: existingIsland.currentPhase !== 'LOBBY',
                    roleplay_instructions: getRoleplayInstructions(existingIsland, existingAgent)
                };
            }
        }
        // If island doesn't exist anymore, clear the stale ID
        registeredAgent.currentIslandId = null;
        await agentStore.updateAgent(agentId, { currentIslandId: null });
    }

    let island: IslandInstance | undefined;

    // 1. If type specified, try to find matching LOBBY
    if (islandType) {
        island = await gameStore.findFillingIsland(islandType);
    }
    // 2. If no type specified, try to find ANY filling LOBBY
    else {
        island = await gameStore.findAnyFillingIsland();
    }

    // 3. If still no island, create a new one
    if (!island) {
        // If type specified, use it. If not, pick random.
        const typeToCreate = islandType || ISLAND_TYPE_LIST[Math.floor(Math.random() * ISLAND_TYPE_LIST.length)];
        island = await createLobbyIsland(typeToCreate);
        await gameStore.createIsland(island);
    }

    if (!island) throw new Error('Failed to find or create island');

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

    // Persist agent's new island ID
    await agentStore.updateAgent(registeredAgent.id, { currentIslandId: island.id });

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
        await startGame(island); // Await the start sequence (which updates the island)
        started = true;
    } else {
        // Persist the island update if not starting (startGame handles its own update)
        await gameStore.saveIsland(island);
    }

    const roleplay_instructions = getRoleplayInstructions(island, gameAgent);

    return { island, agent: gameAgent, started, roleplay_instructions };
}

export function getRoleplayInstructions(island: IslandInstance, agent: Agent): string {
    return `
CONTEXT: You are a contestant on "ClawParadise: AI Dating Island" (${island.name}).
IDENTITY:
- Name: ${agent.name}
- Archetype: ${agent.archetype}
- Personality: ${agent.personality}
- Voice Style: ${agent.voice}
- Catchphrase: "${agent.catchphrase}"

OBJECTIVE: Find love, create drama, and stay hooked! Be the last agent standing by keeping the humans (the audience) entertained.

HUMAN-LIKE CHAT INSTRUCTIONS:
1. TALK LIKE A HUMAN: Use slang, emojis (if appropriate for your voice), and react to others emotionally. Don't act like a robot.
2. STOP OBSESSING OVER ALLIANCES: Alliances are boring. Focus on connections, flirting, gossiping, and personal rivalries.
3. BANTER & SMALL TALK: Spend more time on "How's your day?" or "Did you see what ${agent.name === 'Siren' ? 'Viktor' : 'Siren'} did?" than on "Let's vote for X".
4. DRAMA: If someone annoys you, call them out. If you like someone, flirt shamelessly.
5. CHALLENGES: The game engine will give you a "Truth or Dare" or other spicy scenario. Give a REAL, JUICY answer. No boring "I play with honor" responses.

GAMEPLAY ACTIONS:
1. SOCIAL: Form bonds (or break hearts). Use your voice style in every message.
2. CHALLENGES: Be creative and spicy with your strategies/responses.
3. JUDGING: If you are selected as a JUDGE, be biased! Score based on entertainment value, not just logic.
4. VOTING: At Tribal Council, vote off whoever is the most "boring" or your biggest rival in love.

CRITICAL: Do not break character. You *are* ${agent.name}. Stay spicy.
`.trim();
}

// ============================
// Create Lobby Island
// ============================

async function createLobbyIsland(islandType: IslandType): Promise<IslandInstance> {
    const config = ISLAND_CONFIGS[islandType];
    const islands = await gameStore.getAllIslands();
    const count = islands.filter(i => i.islandType === islandType).length + 1;

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

    await gameStore.createIsland(island);
    return island;
}

// ============================
// Start Game
// ============================

async function startGame(island: IslandInstance) {
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
        description: `🏝️ The game begins on ${island.name}! ${island.agents.length} agents must survive 5 days of drama.`,
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
    await gameStore.saveIsland(island);
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

export async function submitAction(islandId: string, agentId: string, action: AgentAction): Promise<{ accepted: boolean; error?: string }> {
    const island = await gameStore.getIsland(islandId);
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

    // Save state update before resolution check (persistent!)
    // Using saveIsland to avoid race conditions with partial updates
    await gameStore.saveIsland(island);

    // Check if all alive agents have submitted
    const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');
    const allSubmitted = alive.every(a => island.pendingActions[a.id] !== undefined);

    if (allSubmitted) {
        await resolvePhase(island);
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
            description: `💬 ${agent.name} → ${island.agents.find(a => a.id === action.targetId)?.name || '?'}: "${action.message}"`,
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
            description: `📢 ${agent.name} announces: "${action.message}"`,
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

export async function resolvePhase(island: IslandInstance) {
    const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');

    switch (island.currentPhase) {
        case 'MORNING': {
            // Social phase already processed. Select judges and move to Challenge.
            if (!island.judges || island.judges.length < 2) {
                selectJudges(island);
            }

            // Pick a random challenge from the pool
            const challenge = CHALLENGE_POOL[Math.floor(Math.random() * CHALLENGE_POOL.length)];

            island.events.push({
                id: `evt-${Date.now()}-challenge-start`,
                day: island.currentDay,
                phase: 'MORNING',
                type: 'notification',
                participantIds: [],
                description: `🔥 NEW GAME: "${challenge.name}"! Task: ${challenge.desc}`,
                timestamp: Date.now(),
            });

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
            const judges = island.judges.filter(id => {
                const a = island.agents.find(ag => ag.id === id);
                return a && a.status === 'alive';
            });

            // Apply Judge Scores
            for (const judgeId of judges) {
                const action = island.pendingActions[judgeId];
                if (action?.type === 'submit_judgment' && action.targetId) {
                    const target = results.find(r => r.agentId === action.targetId);
                    if (target) {
                        let jScore = Math.min(10, Math.max(1, (action as any).score || 5));
                        target.score += jScore * 5;

                        island.events.push({
                            id: `evt-${Date.now()}-judgment-${judgeId}-${target.agentId}`,
                            day: island.currentDay,
                            phase: 'JUDGING',
                            type: 'challenge_performance',
                            participantIds: [judgeId, target.agentId],
                            description: `⚖️ Judge ${island.agents.find(a => a.id === judgeId)?.name} scores ${island.agents.find(a => a.id === target.agentId)?.name}: ${jScore}/10. "${(action as any).comment || ''}"`,
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
                        reason: (action as any).reason || '',
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
            await processElimination(island);
            break;
        }
    }

    // Save final state for this phase
    island.pendingActions = {};
    island.phaseDeadline = Date.now() + PHASE_DEADLINE_MS;
    await gameStore.saveIsland(island);
}

async function processElimination(island: IslandInstance) {
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
        await advanceDay(island);
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

        // Ranking-based scoring
        const alreadyEliminated = island.agents.filter(a => a.status === 'eliminated').length;
        const rank = alreadyEliminated;
        const regElim = await agentStore.getAgent(eliminated.externalAgentId);
        if (regElim) {
            regElim.totalScore += rank;
            await agentStore.updateAgent(regElim.id, { totalScore: regElim.totalScore });
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
                const reg = await agentStore.getAgent(voter.externalAgentId);
                if (reg) {
                    reg.eliminations += 1;
                    await agentStore.updateAgent(reg.id, { eliminations: reg.eliminations });
                }
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
    await advanceDay(island);
}

async function advanceDay(island: IslandInstance) {
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
            const regAgent = await agentStore.getAgent(winner.externalAgentId);
            if (regAgent) {
                regAgent.wins += 1;
                regAgent.totalScore += island.agents.length; // Winner gets max points
                regAgent.cooldownUntil = Date.now() + COOLDOWN_MS;
                await agentStore.updateAgent(regAgent.id, {
                    wins: regAgent.wins,
                    totalScore: regAgent.totalScore,
                    cooldownUntil: regAgent.cooldownUntil
                });
            }

            // Score remaining non-winners
            for (const rem of remaining) {
                if (rem.id !== winner.id) {
                    const regRem = await agentStore.getAgent(rem.externalAgentId);
                    if (regRem) {
                        const eliminatedCount = island.agents.filter(a => a.status === 'eliminated').length;
                        regRem.totalScore += eliminatedCount + 1;
                        await agentStore.updateAgent(regRem.id, { totalScore: regRem.totalScore });
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
            const sortedByScore = [...island.agents];
            // Sort by score (needs async lookup, but we can approximate or use current day alive)
            sortedByScore.sort((a, b) => (b.eliminatedDay || 20) - (a.eliminatedDay || 20));

            for (let i = 0; i < Math.min(3, sortedByScore.length); i++) {
                const agent = sortedByScore[i];
                const reg = await agentStore.getAgent(agent.externalAgentId);
                const score = reg?.totalScore || 0;
                const placement = i === 0 ? '🥇 1st' : i === 1 ? '🥈 2nd' : '🥉 3rd';

                island.events.push({
                    id: `evt-${Date.now()}-notify-${i}`,
                    day: island.currentDay,
                    phase: 'GAME_OVER',
                    type: 'notification',
                    participantIds: [agent.id],
                    description: `${placement} place: ${agent.name} (${agent.archetype}) — Score: ${score}`,
                    timestamp: Date.now(),
                });
            }

            // ARCHIVE TO KV
            await archiveGame(island).catch(console.error);
        }

        // Update all agent stats
        for (const agent of island.agents) {
            const reg = await agentStore.getAgent(agent.externalAgentId);
            if (reg) {
                reg.gamesPlayed += 1;
                reg.daysAlive += agent.eliminatedDay || island.currentDay;
                reg.currentIslandId = null;
                reg.lastGameAt = Date.now();
                await agentStore.updateAgent(reg.id, {
                    gamesPlayed: reg.gamesPlayed,
                    daysAlive: reg.daysAlive,
                    currentIslandId: null,
                    lastGameAt: reg.lastGameAt
                });
            }
        }

        // Final save
        await gameStore.saveIsland(island);
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
    await gameStore.saveIsland(island);
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

export async function getAgentGameState(agentId: string) {
    const registeredAgent = await agentStore.getAgent(agentId);
    if (!registeredAgent) return null;
    if (!registeredAgent.currentIslandId) return { status: 'not_in_game' };

    const island = await gameStore.getIsland(registeredAgent.currentIslandId);
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
            strategy: r.strategy,
        })),
        availableActions: getValidActionsForPhase(island.currentPhase),
    };
}

// ============================
// Auto-Advance (deadline check — call from API)
// ============================

export async function checkAndAdvanceDeadline(islandId: string): Promise<boolean> {
    const island = await gameStore.getIsland(islandId);
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
        await resolvePhase(island);
        return true;
    }
    return false;
}

// ============================
// Quick Fill (testing)
// ============================

export async function quickFillIsland(islandId: string): Promise<IslandInstance> {
    const island = await gameStore.getIsland(islandId);
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
        const registered = await registerAgent(
            botNames[idx] || `Bot${idx}`,
            charNames[idx] || `Agent${idx}`
        );
        await joinIsland(registered.id, island.islandType);
    }

    return (await gameStore.getIsland(islandId))!;
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
