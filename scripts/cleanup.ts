import { kv } from '@vercel/kv';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function cleanup() {
    console.log('🧹 Starting cleanup...');

    // 1. Get all active islands
    const activeIslands = await kv.smembers('active_islands');
    console.log(`Found ${activeIslands.length} active islands.`);

    // 2. Delete islands
    for (const id of activeIslands) {
        console.log(`Deleting island:${id}...`);
        await kv.del(`island:${id}`);
    }

    // 3. Clear active_islands set
    await kv.del('active_islands');
    console.log('Cleared active_islands set.');

    // 4. Optional: Clear registered agents currentIslandId
    const registeredAgents = await kv.smembers('registered_agents_list');
    for (const id of registeredAgents) {
        const agent: any = await kv.get(`reg_agent:${id}`);
        if (agent && agent.currentIslandId) {
            agent.currentIslandId = null;
            await kv.set(`reg_agent:${id}`, agent);
            console.log(`Reset agent ${agent.agentName} island status.`);
        }
    }

    console.log('✅ Cleanup complete!');
    process.exit(0);
}

cleanup().catch(err => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
});
