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

// ============================
// In-Memory Game Store
// ============================

class GameStore {
  private islands: Map<string, IslandInstance> = new Map();

  createIsland(island: IslandInstance): void {
    this.islands.set(island.id, island);
  }

  getIsland(id: string): IslandInstance | undefined {
    return this.islands.get(id);
  }

  getAllIslands(): IslandInstance[] {
    return Array.from(this.islands.values());
  }

  findFillingIsland(islandType: IslandType): IslandInstance | undefined {
    return this.getAllIslands().find(
      i => i.islandType === islandType && i.currentPhase === 'LOBBY' && i.agents.length < i.maxAgents
    );
  }

  findAnyFillingIsland(): IslandInstance | undefined {
    const lobbies = this.getAllIslands().filter(
      i => i.currentPhase === 'LOBBY' && i.agents.length < i.maxAgents
    );
    if (lobbies.length === 0) return undefined;
    return lobbies[Math.floor(Math.random() * lobbies.length)];
  }

  updateIsland(id: string, updates: Partial<IslandInstance>): void {
    const island = this.islands.get(id);
    if (island) {
      Object.assign(island, updates);
    }
  }
}

// ============================
// Global Agent Registry
// ============================

class AgentStore {
  private agents: Map<string, RegisteredAgent> = new Map();

  register(agent: RegisteredAgent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  findByName(agentName: string): RegisteredAgent | undefined {
    return Array.from(this.agents.values()).find(
      a => a.agentName.toLowerCase() === agentName.toLowerCase()
    );
  }

  getAllAgents(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  getLeaderboard(): RegisteredAgent[] {
    return this.getAllAgents()
      .filter(a => a.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.gamesPlayed - a.gamesPlayed;
      });
  }

  isOnCooldown(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.cooldownUntil) return false;
    return Date.now() < agent.cooldownUntil;
  }

  getCooldownRemaining(agentId: string): number {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.cooldownUntil) return 0;
    return Math.max(0, agent.cooldownUntil - Date.now());
  }
}

// Persist across Next.js hot reloads
const globalForStore = globalThis as unknown as {
  __gameStore?: GameStore;
  __agentStore?: AgentStore;
};
if (!globalForStore.__gameStore) {
  globalForStore.__gameStore = new GameStore();
}
if (!globalForStore.__agentStore) {
  globalForStore.__agentStore = new AgentStore();
}
export const gameStore = globalForStore.__gameStore;
export const agentStore = globalForStore.__agentStore;

// ============================
// Constants
// ============================
export const MAX_AGENTS_PER_ISLAND = 16;
export const MAX_GAME_DAYS = 16;
export const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours
export const PHASE_DEADLINE_MS = 2 * 60 * 1000; // 2 minutes per phase
