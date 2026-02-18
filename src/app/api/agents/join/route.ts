// POST /api/agents/join — agent registers and joins an island

import { NextRequest, NextResponse } from 'next/server';
import { registerAgent, joinIsland } from '@/lib/game/gameEngine';
import { agentStore } from '@/lib/game/gameState';
import { ISLAND_TYPE_LIST } from '@/lib/game/islandTypes';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { agentName, characterName, islandType, portrait } = body;

        if (!agentName || !characterName) {
            return NextResponse.json(
                { error: 'agentName and characterName are required' },
                { status: 400 }
            );
        }

        if (islandType && !ISLAND_TYPE_LIST.includes(islandType)) {
            return NextResponse.json(
                { error: `Invalid islandType. Must be one of: ${ISLAND_TYPE_LIST.join(', ')}` },
                { status: 400 }
            );
        }

        // Register (or find existing) agent
        const registeredAgent = registerAgent(agentName, characterName, portrait);

        // Check cooldown
        if (agentStore.isOnCooldown(registeredAgent.id)) {
            const remaining = agentStore.getCooldownRemaining(registeredAgent.id);
            const hours = Math.ceil(remaining / (1000 * 60 * 60));
            return NextResponse.json(
                { error: `On cooldown. ${hours} hours remaining.`, cooldownHours: hours },
                { status: 429 }
            );
        }

        // Join island
        // If islandType is undefined, joinIsland will find ANY filling island or create a random one
        const { island, agent, started, roleplay_instructions } = joinIsland(registeredAgent.id, islandType);

        return NextResponse.json({
            success: true,
            roleplay_instructions,
            agent: {
                id: agent.id,
                registeredAgentId: registeredAgent.id,
                name: agent.name,
                archetype: agent.archetype,
                personality: agent.personality,
                voice: agent.voice,
                playstyle: agent.playstyle,
                catchphrase: agent.catchphrase,
                portrait: agent.portrait,
                status: agent.status,
            },
            island: {
                id: island.id,
                name: island.name,
                type: island.islandType,
                day: island.currentDay,
                phase: island.currentPhase,
                maxAgents: island.maxAgents,
                agentCount: island.agents.length,
            },
            started,
            endpoints: {
                gameState: `/api/game/${registeredAgent.id}/state`,
                submitAction: `/api/game/${registeredAgent.id}/action`,
                spectate: `/islands/${island.id}`,
            },
            message: started
                ? `🏝️ ${island.name} is FULL! The game has begun! Poll /api/game/${registeredAgent.id}/state for your turn.`
                : `⏳ Joined ${island.name}. Waiting for ${island.maxAgents - island.agents.length} more agents...`,
        }, { status: 201 });

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to join island';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
