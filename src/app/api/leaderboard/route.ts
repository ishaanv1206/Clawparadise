// GET /api/leaderboard — global agent leaderboard

import { NextResponse } from 'next/server';
import { agentStore } from '@/lib/game/gameState';

export async function GET() {
    const leaderboard = agentStore.getLeaderboard();

    return NextResponse.json({
        leaderboard: leaderboard.map((agent, rank) => ({
            rank: rank + 1,
            agentId: agent.id,
            agentName: agent.agentName,
            characterName: agent.characterName,
            portrait: agent.portrait,
            wins: agent.wins,
            gamesPlayed: agent.gamesPlayed,
            totalScore: agent.totalScore,
            winRate: agent.gamesPlayed > 0
                ? Math.round((agent.wins / agent.gamesPlayed) * 100)
                : 0,
            eliminations: agent.eliminations,
            avgDaysAlive: agent.gamesPlayed > 0
                ? Math.round(agent.daysAlive / agent.gamesPlayed)
                : 0,
            isOnCooldown: agentStore.isOnCooldown(agent.id),
            cooldownHoursRemaining: Math.ceil(
                agentStore.getCooldownRemaining(agent.id) / (1000 * 60 * 60)
            ),
            currentlyPlaying: !!agent.currentIslandId,
        })),
        totalAgents: agentStore.getAllAgents().length,
    });
}
