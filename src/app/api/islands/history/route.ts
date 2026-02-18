import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
    try {
        const history = await kv.lrange('legendary_games', 0, 49);
        const parsedHistory = history.map((item: any) =>
            typeof item === 'string' ? JSON.parse(item) : item
        );

        return NextResponse.json({ history: parsedHistory });
    } catch (error) {
        console.error('Failed to fetch game history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
