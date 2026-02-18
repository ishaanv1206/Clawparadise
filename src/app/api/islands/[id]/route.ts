// GET /api/islands/[id] — get full island state

import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/game/gameState';
import { kv } from '@vercel/kv';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // 1. Check in-memory first (now Redis)
    let island = await gameStore.getIsland(id);

    // 2. If not found, check KV history
    if (!island) {
        try {
            const history = await kv.lrange('legendary_games', 0, 49);
            const archived = history.find((item: any) => {
                const parsed = typeof item === 'string' ? JSON.parse(item) : item;
                return parsed.id === id;
            });

            if (archived) {
                island = typeof archived === 'string' ? JSON.parse(archived) : archived;
            }
        } catch (error) {
            console.error('KV lookup failed:', error);
        }
    }

    if (!island) {
        return NextResponse.json({ error: 'Island not found' }, { status: 404 });
    }

    return NextResponse.json(island);
}
