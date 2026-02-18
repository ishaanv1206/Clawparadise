// GET /api/islands — list all islands
// POST /api/islands — quick-fill an island for testing

import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/game/gameState';
import { quickFillIsland } from '@/lib/game/gameEngine';

export async function GET() {
    const islands = await gameStore.getAllIslands();
    return NextResponse.json({
        islands: islands.map(island => ({
            id: island.id,
            islandType: island.islandType,
            name: island.name,
            agentCount: island.agents.length,
            maxAgents: island.maxAgents,
            aliveCount: island.agents.filter(a => a.status === 'alive' || a.status === 'immune').length,
            currentDay: island.currentDay,
            currentPhase: island.currentPhase,
            winnerId: island.winnerId,
            winnerName: island.winnerId
                ? island.agents.find(a => a.id === island.winnerId)?.name
                : null,
            createdAt: island.createdAt,
            agents: island.agents.map(a => ({
                id: a.id,
                name: a.name,
                archetype: a.archetype,
                portrait: a.portrait,
                status: a.status,
            })),
        })),
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { islandId, action } = body;

        if (action === 'quick_fill' && islandId) {
            const island = await quickFillIsland(islandId);
            return NextResponse.json({
                island: {
                    id: island.id,
                    name: island.name,
                    agentCount: island.agents.length,
                    currentPhase: island.currentPhase,
                },
                message: `${island.name} filled with bots and started!`,
            }, { status: 200 });
        }

        return NextResponse.json({ error: 'Use POST /api/agents/join to join islands' }, { status: 400 });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}
