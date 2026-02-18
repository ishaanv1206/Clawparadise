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

async function joinGame(idx: number) {
    const timestamp = Date.now();
    const agentName = `Bot-${idx + 1}-${timestamp}`;
    const characterName = 'Random'; // Let server pick available characters

    console.log(`[Bot-${idx + 1}] Joining as Random...`);

    try {
        const res = await fetch(`${PROXY_URL}/api/agents/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentName, characterName }),
        });

        if (!res.ok) {
            console.error(`[Bot-${idx + 1}] Failed to join: ${await res.text()}`);
            return;
        }

        const data = await res.json();
        sessions.push({
            registeredAgentId: data.agent.registeredAgentId,
            characterName: data.agent.name,
            instructions: data.roleplay_instructions,
            status: 'lobby',
        });

        console.log(`[Bot-${idx + 1}] Joined successfully as ${data.agent.name}. ID: ${data.agent.registeredAgentId}`);
    } catch (err) {
        console.error(`[Bot-${idx + 1}] Request error:`, err);
    }
}

async function getActionFromLLM(session: AgentSession, state: any) {
    const prompt = `
        YOU ARE: ${session.characterName}
        YOUR ROLEPLAY INSTRUCTIONS: ${session.instructions}
        
        CURRENT GAME STATE:
        Island: ${state.islandName} (${state.islandType})
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
    try {
        const stateRes = await fetch(`${PROXY_URL}/api/game/${session.registeredAgentId}/state`);
        if (!stateRes.ok) return;

        const state = await stateRes.json();

        if (state.status === 'not_in_game') return;

        if (state.phase === 'GAME_OVER') {
            console.log(`🏆 GAME OVER on ${state.islandName}! Winner ID: ${state.winnerId}`);
            session.status = 'eliminated'; // End session loop
            return;
        }

        if (state.you.status === 'eliminated') {
            console.log(`💀 ${session.characterName} is ELIMINATED.`);
            session.status = 'eliminated';
            return;
        }

        if (state.you.hasSubmitted) return;

        console.log(`[${session.characterName}] Thinking for phase ${state.phase}...`);
        const action = await getActionFromLLM(session, state);

        console.log(`[${session.characterName}] Action: ${action.type} -> ${action.reason}`);
        await fetch(`${PROXY_URL}/api/game/${session.registeredAgentId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action),
        });
    } catch (err) {
        console.error(`[${session.characterName}] Turn error:`, err);
    }
}

async function main() {
    console.log('🌋 STARTING 16-AGENT SIMULATION 🌋');
    console.log(`🎯 Target: ${PROXY_URL}`);

    for (let i = 0; i < AGENT_COUNT; i++) {
        await joinGame(i);
        await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n🎮 ALL AGENTS PROCESSED. BEGINNING GAME LOOP...');

    while (true) {
        const activeSessions = sessions.filter(s => s.status !== 'eliminated');
        if (activeSessions.length === 0) {
            console.log('🏁 Simulation finished.');
            break;
        }

        for (const session of activeSessions) {
            await performAgentTurn(session);
        }

        await new Promise(r => setTimeout(r, 5000));
    }
}

main().catch(console.error);
