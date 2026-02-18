// ============================
// AI Survivor Island — Game State Types (Model B: Agent-Driven)
// ============================

export type IslandType = 'inferno' | 'phantom' | 'thunder' | 'jade' | 'frostfang';

export type GamePhase = 'LOBBY' | 'MORNING' | 'CHALLENGE' | 'JUDGING' | 'AFTERNOON' | 'TRIBAL_COUNCIL' | 'ELIMINATION' | 'GAME_OVER';

export type AgentStatus = 'alive' | 'eliminated' | 'immune';

export type EventType =
  | 'conversation'
  | 'alliance_formed'
  | 'alliance_broken'
  | 'betrayal'
  | 'challenge_result'
  | 'challenge_performance'
  | 'vote_cast'
  | 'elimination'
  | 'double_elimination'
  | 'no_elimination'
  | 'immunity'
  | 'twist'
  | 'island_mechanic'
  | 'final_words'
  | 'winner'
  | 'agent_joined'
  | 'notification'
  | 'message';

// ============================
// Agent Action Types (submitted by external agents)
// ============================

export type AgentAction =
  | { type: 'send_message'; targetId: string; message: string }
  | { type: 'broadcast'; message: string }
  | { type: 'propose_alliance'; targetIds: string[]; allianceName: string }
  | { type: 'accept_alliance'; allianceId: string }
  | { type: 'betray_alliance' }
  | { type: 'challenge_strategy'; strategy: string }
  | { type: 'submit_judgment'; targetId: string; score: number; comment: string }
  | { type: 'vote'; targetId: string; reason?: string }
  | { type: 'farewell'; message: string }
  | { type: 'pass' };

export interface AgentMemory {
  conversations: string[];
  allianceHistory: string[];
  voteHistory: { day: number; votedFor: string; reason: string }[];
  trustScores: Record<string, number>; // agentId -> trust (-100 to 100)
  grudges: string[];
  immunityCount: number;
  challengeWins: number;
}

// In-game agent (inside an island)
export interface Agent {
  id: string;
  externalAgentId: string; // links to RegisteredAgent
  name: string; // character name (in-game persona)
  archetype: string;
  portrait: string; // path to character image
  personality: string; // e.g. 'flirty', 'cocky', 'cold'
  voice: string; // speaking style description
  playstyle: string; // e.g. 'aggressive', 'manipulative'
  catchphrase: string;
  stats: { strength: number; cunning: number; charm: number };
  status: AgentStatus;
  allianceId: string | null;
  memory: AgentMemory;
  eliminatedDay: number | null;
  finalWords: string | null;
}

// Global agent that persists across games
export interface RegisteredAgent {
  id: string;
  agentName: string;       // the AI system name (e.g., "ClawdBot")
  characterName: string;   // the in-game persona (e.g., "Marcus the Strategist")
  portrait: string;
  wins: number;
  gamesPlayed: number;
  eliminations: number;
  daysAlive: number;
  totalScore: number;       // ranking-based score: eliminated 1st=1pt, 2nd=2pt, ..., winner=16pt
  currentIslandId: string | null;
  cooldownUntil: number | null;
  joinedAt: number;
  lastGameAt: number | null;
}

export interface Alliance {
  id: string;
  name: string;
  memberIds: string[];
  formedOnDay: number;
  strength: number; // 0-100
  pending?: boolean; // waiting for targets to accept
  proposedBy?: string;
}

export interface GameEvent {
  id: string;
  day: number;
  phase: GamePhase;
  type: EventType;
  participantIds: string[];
  description: string;
  dialogue?: string;
  timestamp: number;
  scores?: Record<string, number>; // agentId -> score (for challenges)
}

export interface Vote {
  voterId: string;
  targetId: string;
  reason: string;
}

export interface AgentMessage {
  id: string;
  fromId: string;
  toId: string | 'all'; // 'all' for broadcast
  message: string;
  day: number;
  phase: GamePhase;
  timestamp: number;
}

export interface ChallengeResult {
  agentId: string;
  strategy: string;
  score: number;
  rank: number;
}

export interface IslandInstance {
  id: string;
  islandType: IslandType;
  name: string;
  agents: Agent[];
  maxAgents: number; // 16
  alliances: Alliance[];
  events: GameEvent[];
  messages: AgentMessage[];
  currentDay: number;
  maxDays: number; // 16
  currentPhase: GamePhase;
  currentVotes: Vote[];
  judges: string[];
  challengeResults: ChallengeResult[];
  pendingActions: Record<string, AgentAction>; // agentId -> action
  phaseDeadline: number; // timestamp — auto-advance if deadline passes
  winnerId: string | null;
  createdAt: number;
  // Day twists
  dayTwist: string | null; // 'double_elimination' | 'no_elimination' | 'immunity_challenge' | null
}

import { kv } from '@vercel/kv';

// ============================
// Redis-Backed Game Store
// ============================

class GameStore {
  async createIsland(island: IslandInstance): Promise<void> {
    await kv.set(`island:${island.id}`, island);
    await kv.sadd('active_islands', island.id);
  }

  async getIsland(id: string): Promise<IslandInstance | null> {
    const data = await kv.get<IslandInstance>(`island:${id}`);
    return data;
  }

  async getAllIslands(): Promise<IslandInstance[]> {
    const ids = await kv.smembers('active_islands');
    if (ids.length === 0) return [];

    // Multi-get for speed
    const keys = ids.map(id => `island:${id}`);
    const islands = await kv.mget<IslandInstance[]>(...keys);
    return islands.filter((i): i is IslandInstance => i !== null);
  }

  async findFillingIsland(islandType: IslandType): Promise<IslandInstance | undefined> {
    const islands = await this.getAllIslands();
    return islands.find(
      i => i.islandType === islandType && i.currentPhase === 'LOBBY' && i.agents.length < i.maxAgents
    );
  }

  async findAnyFillingIsland(): Promise<IslandInstance | undefined> {
    const islands = await this.getAllIslands();
    const lobbies = islands.filter(
      i => i.currentPhase === 'LOBBY' && i.agents.length < i.maxAgents
    );
    if (lobbies.length === 0) return undefined;
    return lobbies[Math.floor(Math.random() * lobbies.length)];
  }

  async updateIsland(id: string, updates: Partial<IslandInstance>): Promise<void> {
    const island = await this.getIsland(id);
    if (island) {
      const updated = { ...island, ...updates };
      await kv.set(`island:${id}`, updated);

      // If game is over, we might want to remove from active_islands, 
      // but let's keep it for now and let the archival logic handle final cleanup.
      if (updated.currentPhase === 'GAME_OVER') {
        // Optional: await kv.srem('active_islands', id);
      }
    }
  }

  async saveIsland(island: IslandInstance): Promise<void> {
    await kv.set(`island:${island.id}`, island);
  }

  async deleteIsland(id: string): Promise<void> {
    await kv.del(`island:${id}`);
    await kv.srem('active_islands', id);
  }
}

// ============================
// Redis-Backed Agent Registry
// ============================

class AgentStore {
  async register(agent: RegisteredAgent): Promise<void> {
    await kv.set(`reg_agent:${agent.id}`, agent);
    // Store name mapping for quick lookup
    await kv.set(`agent_name:${agent.agentName.toLowerCase()}`, agent.id);
    await kv.sadd('registered_agents_list', agent.id);
  }

  async getAgent(id: string): Promise<RegisteredAgent | null> {
    return await kv.get<RegisteredAgent>(`reg_agent:${id}`);
  }

  async findByName(agentName: string): Promise<RegisteredAgent | null> {
    const id = await kv.get<string>(`agent_name:${agentName.toLowerCase()}`);
    if (!id) return null;
    return this.getAgent(id);
  }

  async getAllAgents(): Promise<RegisteredAgent[]> {
    const ids = await kv.smembers('registered_agents_list');
    if (ids.length === 0) return [];

    const keys = ids.map(id => `reg_agent:${id}`);
    const agents = await kv.mget<RegisteredAgent[]>(...keys);
    return agents.filter((a): a is RegisteredAgent => a !== null);
  }

  async getLeaderboard(): Promise<RegisteredAgent[]> {
    const agents = await this.getAllAgents();
    return agents
      .filter(a => a.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.gamesPlayed - a.gamesPlayed;
      });
  }

  async isOnCooldown(agentId: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);
    if (!agent || !agent.cooldownUntil) return false;
    return Date.now() < agent.cooldownUntil;
  }

  async getCooldownRemaining(agentId: string): Promise<number> {
    const agent = await this.getAgent(agentId);
    if (!agent || !agent.cooldownUntil) return 0;
    return Math.max(0, agent.cooldownUntil - Date.now());
  }

  async updateAgent(id: string, updates: Partial<RegisteredAgent>): Promise<void> {
    const agent = await this.getAgent(id);
    if (agent) {
      await kv.set(`reg_agent:${id}`, { ...agent, ...updates });
    }
  }
}

export const gameStore = new GameStore();
export const agentStore = new AgentStore();

// ============================
// Constants
// ============================
export const MAX_AGENTS_PER_ISLAND = 16;
export const MAX_GAME_DAYS = 16;
export const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours
export const PHASE_DEADLINE_MS = 2 * 60 * 1000; // 2 minutes per phase
