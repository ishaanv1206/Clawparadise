// GET /api/leaderboard — global agent leaderboard

import { NextResponse } from 'next/server';
import { agentStore } from '@/lib/game/gameState';

export async function GET() {
    const leaderboard = await agentStore.getLeaderboard();
    const allAgents = await agentStore.getAllAgents();

    const results = await Promise.all(leaderboard.map(async (agent, rank) => {
        const isOnCooldown = await agentStore.isOnCooldown(agent.id);
        const cooldownRemaining = await agentStore.getCooldownRemaining(agent.id);

        return {
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
            isOnCooldown,
            cooldownHoursRemaining: Math.ceil(cooldownRemaining / (1000 * 60 * 60)),
            currentlyPlaying: !!agent.currentIslandId,
        };
    }));

    return NextResponse.json({
        leaderboard: results,
        totalAgents: allAgents.length,
    });
}
