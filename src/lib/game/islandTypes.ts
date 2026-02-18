// ============================
// 5 Island Type Configurations
// ============================

import { IslandType } from './gameState';

export interface IslandTypeConfig {
    type: IslandType;
    name: string;
    emoji: string;
    description: string;
    vibe: string;
    backgroundImage: string;
    mechanicName: string;
    mechanicDescription: string;
    cssVars: {
        accent: string;
        accentGlow: string;
        gradientStart: string;
        gradientMid: string;
        gradientEnd: string;
    };
    challengeAffinity: string[];
}

export const ISLAND_CONFIGS: Record<IslandType, IslandTypeConfig> = {
    inferno: {
        type: 'inferno',
        name: 'Inferno Atoll',
        emoji: '🌋',
        description: 'A volcanic island where rivers of lava carve through obsidian rock. The air shimmers with heat and the sky burns crimson.',
        vibe: 'Intense, aggressive, gladiator energy. Every moment feels like a fight for survival.',
        backgroundImage: '/images/islands/Volcano.jpg',
        mechanicName: 'Eruption',
        mechanicDescription: 'A random agent receives a disadvantage each round — their vote counts as half.',
        cssVars: {
            accent: '#ff4500',
            accentGlow: '#ff6b35',
            gradientStart: '#1a0000',
            gradientMid: '#2d0a00',
            gradientEnd: '#0d0000',
        },
        challengeAffinity: ['endurance', 'strength', 'willpower'],
    },
    phantom: {
        type: 'phantom',
        name: 'Phantom Reef',
        emoji: '👻',
        description: 'A sunken reef of shipwrecks and bioluminescent coral. Ghostly fog rolls across an endless dark ocean.',
        vibe: 'Eerie, mysterious, psychological. Trust no one — things are never what they seem.',
        backgroundImage: '/images/islands/Reef.jpg',
        mechanicName: 'Ghost Vote',
        mechanicDescription: 'One previously eliminated agent returns as a hidden voter — their vote counts but nobody knows who cast it.',
        cssVars: {
            accent: '#8b5cf6',
            accentGlow: '#06b6d4',
            gradientStart: '#0a0020',
            gradientMid: '#0d0030',
            gradientEnd: '#050015',
        },
        challengeAffinity: ['deception', 'puzzle', 'social'],
    },
    thunder: {
        type: 'thunder',
        name: 'Thunderpeak',
        emoji: '⛈️',
        description: 'Storm-battered mountain peaks where lightning strikes without warning. Jagged cliffs and howling winds rule.',
        vibe: 'Chaotic, unpredictable, adrenaline-fueled. Alliances shatter like glass here.',
        backgroundImage: '/images/islands/Beach.jpg',
        mechanicName: 'Lightning Strike',
        mechanicDescription: 'A random alliance is forcefully dissolved at the start of each round.',
        cssVars: {
            accent: '#3b82f6',
            accentGlow: '#60a5fa',
            gradientStart: '#0a0a1a',
            gradientMid: '#0d1025',
            gradientEnd: '#050510',
        },
        challengeAffinity: ['speed', 'agility', 'chaos'],
    },
    jade: {
        type: 'jade',
        name: 'Jade Wilds',
        emoji: '🌿',
        description: 'Ancient jungle ruins overgrown with emerald vines. Golden sunlight filters through the canopy of a forgotten civilization.',
        vibe: 'Strategic, cunning, temple-raider energy. The clever survive; the careless are consumed.',
        backgroundImage: '/images/islands/Jungle.jpg',
        mechanicName: 'Hidden Idol',
        mechanicDescription: 'One random agent finds a hidden immunity idol each round — they can play it to save themselves from elimination.',
        cssVars: {
            accent: '#10b981',
            accentGlow: '#fbbf24',
            gradientStart: '#001a0d',
            gradientMid: '#002a15',
            gradientEnd: '#000d05',
        },
        challengeAffinity: ['strategy', 'puzzle', 'stealth'],
    },
    frostfang: {
        type: 'frostfang',
        name: 'Frostfang',
        emoji: '🧊',
        description: 'An arctic tundra of ice caves and glaciers. The aurora borealis dances across a frozen sky.',
        vibe: 'Cold, calculated, survival-of-the-fittest. Only the most ruthlessly efficient will endure.',
        backgroundImage: '/images/islands/Snow.jpg',
        mechanicName: 'Freeze',
        mechanicDescription: 'The audience can vote to freeze one agent\'s vote — that agent cannot vote at tribal council.',
        cssVars: {
            accent: '#06b6d4',
            accentGlow: '#c084fc',
            gradientStart: '#000a14',
            gradientMid: '#001020',
            gradientEnd: '#00050a',
        },
        challengeAffinity: ['endurance', 'intelligence', 'willpower'],
    },
};

export const ISLAND_TYPE_LIST: IslandType[] = ['inferno', 'phantom', 'thunder', 'jade', 'frostfang'];

export function getRandomIslandType(): IslandType {
    return ISLAND_TYPE_LIST[Math.floor(Math.random() * ISLAND_TYPE_LIST.length)];
}
