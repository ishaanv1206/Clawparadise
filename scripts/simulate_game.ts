import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PROXY_URL = process.env.SIMULATOR_TARGET_URL || 'https://clawparadise.vercel.app';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

if (!GROQ_API_KEY) {
    console.error('❌ Error: GROQ_API_KEY not found in .env.local');
    process.exit(1);
}

const groq = new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

interface AgentSession {
    registeredAgentId: string;
    characterName: string;
    instructions: string;
    status: 'lobby' | 'playing' | 'eliminated';
}

const AGENT_COUNT = 16;
const sessions: AgentSession[] = [];

const CHARACTER_NAMES = [
    'Marcus', 'Siren', 'Jinx', 'Castellan', 'Titan', 'Sage', 'Echo', 'Cipher',
    'Viktor', 'Riley', 'Harmony', 'Flint', 'Luna', 'Phoenix', 'Ivy', 'Blaze'
];

async function joinGame(idx: number) {
    const agentName = `Bot-${idx + 1}`;
    const characterName = CHARACTER_NAMES[idx];

    console.log(`[${agentName}] Joining as ${characterName}...`);

    const res = await fetch(`${PROXY_URL}/api/agents/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, characterName }),
    });

    if (!res.ok) {
        throw new Error(`Failed to join: ${await res.text()}`);
    }

    const data = await res.json();
    sessions.push({
        registeredAgentId: data.agent.registeredAgentId,
        characterName: data.agent.name,
        instructions: data.roleplay_instructions,
        status: 'lobby',
    });

    console.log(`[${agentName}] Joined successfully. ID: ${data.agent.registeredAgentId}`);
}

async function getActionFromLLM(session: AgentSession, state: any) {
    const prompt = `
        YOU ARE: ${session.characterName}
        YOUR ROLEPLAY INSTRUCTIONS: ${session.instructions}
        
        CURRENT GAME STATE:
        Day: ${state.day}
        Phase: ${state.phase}
        Your Status: ${state.you.status}
        Alive Agents: ${state.aliveAgents.map((a: any) => `${a.name} (${a.archetype})`).join(', ')}
        Recent Events: ${state.recentEvents.map((e: any) => e.description).join('\n')}
        Messages: ${state.messages.map((m: any) => `${m.from}: ${m.message}`).join('\n')}
        
        VALID ACTIONS for this phase: ${state.availableActions.join(', ')}

        DECIDE YOUR ACTION.
        RULES:
        1. If it is MORNING or AFTERNOON, you should either send a message or pass.
        2. If it is CHALLENGE, you MUST provide a strategy string.
        3. If it is TRIBAL_COUNCIL, you MUST vote for someone.
        4. Provide your response in valid JSON format:
        {
            "type": "send_message" | "vote" | "challenge_strategy" | "pass",
            "targetId": "agent-id-if-needed",
            "message": "message body if needed",
            "strategy": "strategy body if needed",
            "reason": "short explanation for your thought process"
        }
    `;

    try {
        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content || '{}';
        return JSON.parse(content);
    } catch (err) {
        console.error(`[${session.characterName}] LLM Error:`, err);
        return { type: 'pass', reason: 'LLM Error fallback' };
    }
}

async function performAgentTurn(session: AgentSession) {
    // 1. Get State
    const stateRes = await fetch(`${PROXY_URL}/api/game/${session.registeredAgentId}/state`);
    const state = await stateRes.json();

    if (state.status === 'not_in_game') {
        process.exit(0);
    }

    if (state.phase === 'GAME_OVER') {
        console.log(`🏆 GAME OVER! Winner ID: ${state.islandId}`);
        process.exit(0);
    }

    if (state.you.status === 'eliminated') {
        console.log(`💀 ${session.characterName} is ELIMINATED.`);
        session.status = 'eliminated';
        return;
    }

    if (state.you.hasSubmitted) {
        return; // Already acted this phase
    }

    // 2. Get AI Decision
    console.log(`[${session.characterName}] Thinking for phase ${state.phase}...`);
    const action = await getActionFromLLM(session, state);

    // 3. Submit Action
    console.log(`[${session.characterName}] Action: ${action.type} -> ${action.reason}`);
    const actionRes = await fetch(`${PROXY_URL}/api/game/${session.registeredAgentId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
    });

    if (!actionRes.ok) {
        console.warn(`[${session.characterName}] Action failed: ${await actionRes.text()}`);
    }
}

async function main() {
    console.log('🌋 STARTING 16-AGENT SIMULATION 🌋');

    // Join all agents
    for (let i = 0; i < AGENT_COUNT; i++) {
        await joinGame(i);
        // Small delay to avoid hammering the local server too hard during join
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n🎮 ALL AGENTS JOINED. BEGINNING GAME LOOP...');

    // Main Game Loop
    while (true) {
        const activeSessions = sessions.filter(s => s.status !== 'eliminated');
        if (activeSessions.length === 0) break;

        // Process turns in batches to avoid LLM rate limits but keep speed
        for (const session of activeSessions) {
            await performAgentTurn(session);
        }

        // Wait a bit before next poll round (give the game time to advance)
        await new Promise(r => setTimeout(r, 5000));
    }
}

main().catch(console.error);
