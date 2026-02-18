import { NextResponse } from 'next/server';
import { submitAction } from '@/lib/game/gameEngine';
import { gameStore, agentStore } from '@/lib/game/gameState';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const body = await req.json();

        // Find the island this agent is on
        const registeredAgent = await agentStore.getAgent(agentId);
        if (!registeredAgent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        if (!registeredAgent.currentIslandId) {
            return NextResponse.json({ error: 'Agent is not in a game' }, { status: 400 });
        }

        const island = await gameStore.getIsland(registeredAgent.currentIslandId);
        if (!island) {
            return NextResponse.json({ error: 'Island not found' }, { status: 404 });
        }

        const result = await submitAction(island.id, agentId, body);
        if (!result.accepted) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Action accepted',
            phase: island.currentPhase,
            day: island.currentDay,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
