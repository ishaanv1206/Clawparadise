import { NextResponse } from 'next/server';
import { getAgentGameState } from '@/lib/game/gameEngine';

export const dynamic = 'force-dynamic';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const state = await getAgentGameState(agentId);
        if (!state) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        return NextResponse.json(state);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
