// GET /api/islands/[id] — get full island state

import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/game/gameState';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const island = gameStore.getIsland(id);

    if (!island) {
        return NextResponse.json({ error: 'Island not found' }, { status: 404 });
    }

    return NextResponse.json({ island });
}
