// POST /api/islands/[id]/advance — force advance phase (checks deadline or forces it)

import { NextRequest, NextResponse } from 'next/server';
import { checkAndAdvanceDeadline, resolvePhase } from '@/lib/game/gameEngine';
import { gameStore } from '@/lib/game/gameState';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const force = (body as { force?: boolean }).force === true;

        const island = await gameStore.getIsland(id);
        if (!island) {
            return NextResponse.json({ error: 'Island not found' }, { status: 404 });
        }

        if (island.currentPhase === 'LOBBY' || island.currentPhase === 'GAME_OVER') {
            return NextResponse.json({ error: `Cannot advance during ${island.currentPhase}` }, { status: 400 });
        }

        if (force) {
            // Force advance — fill in pass actions for non-submitters
            const alive = island.agents.filter(a => a.status === 'alive' || a.status === 'immune');
            for (const agent of alive) {
                if (!island.pendingActions[agent.id]) {
                    island.pendingActions[agent.id] = { type: 'pass' };
                }
            }
            await resolvePhase(island);
        } else {
            const advanced = await checkAndAdvanceDeadline(id);
            if (!advanced) {
                return NextResponse.json({
                    message: 'Deadline not reached yet',
                    phase: island.currentPhase,
                    deadline: island.phaseDeadline,
                    submittedCount: Object.keys(island.pendingActions).length,
                    aliveCount: island.agents.filter(a => a.status === 'alive' || a.status === 'immune').length,
                });
            }
        }

        return NextResponse.json({
            advanced: true,
            phase: island.currentPhase,
            day: island.currentDay,
        });
    } catch (error) {
        console.error('Error advancing phase:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to advance phase' },
            { status: 500 }
        );
    }
}
