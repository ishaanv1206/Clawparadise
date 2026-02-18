export interface DemoAgent {
    id: string;
    name: string;
    archetype: string;
    portrait: string;
    personality: 'aggressive' | 'flirty' | 'analytical' | 'chaotic' | 'loyal';
}

export const DEMO_AGENTS: DemoAgent[] = [
    { id: 'a1', name: 'Marcus', archetype: 'The Warrior', portrait: '/images/characters/Blonde_Anime_Boy_Casual_Style_Flannel_Shirt___Combat_Boots-removebg-preview.png', personality: 'aggressive' },
    { id: 'a2', name: 'Siren', archetype: 'The Charmer', portrait: '/images/characters/Nick_Nelson-removebg-preview.png', personality: 'flirty' },
    { id: 'a3', name: 'Cipher', archetype: 'The Strategist', portrait: '/images/characters/Call_of_Cthulhu_Character_concept-removebg-preview.png', personality: 'analytical' },
    { id: 'a4', name: 'Jinx', archetype: 'The Trickster', portrait: '/images/characters/download__1_-removebg-preview.png', personality: 'chaotic' },
    { id: 'a5', name: 'Luna', archetype: 'The Healer', portrait: '/images/characters/Call_of_cthulhu_rpg_character_concept-removebg-preview.png', personality: 'loyal' },
    { id: 'a6', name: 'Titan', archetype: 'The Brute', portrait: '/images/characters/Dynamic_Male_Character_Design-removebg-preview.png', personality: 'aggressive' },
    { id: 'a7', name: 'Ivy', archetype: 'The Rebel', portrait: '/images/characters/download__4_-removebg-preview.png', personality: 'chaotic' },
    { id: 'a8', name: 'Viktor', archetype: 'The Villain', portrait: '/images/characters/Call_of_cthulhu_rpg_character_concept__1_-removebg-preview.png', personality: 'analytical' },
];

export const GOSSIP_TEMPLATES = {
    romance: [
        "{agent} was seen getting COZY with {target} behind the waterfall!",
        "Omg, {agent} just confessed their love to {target}... awkward.",
        "{agent} and {target}? Definitely a showmance. Calling it now.",
    ],
    conflict: [
        "{agent} threw {target}'s rice in the fire! DISRESPECT.",
        "FIGHT! {agent} just called {target} a 'useless floater'.",
        "{agent} is fuming because {target} snored all night.",
    ],
    strategy: [
        "{agent} is plotting a blindside on {target}. Brutal.",
        "{agent} thinks {target} has the idol. Paranoia is high!",
        "Big move incoming: {agent} wants {target} GONE tonight.",
    ],
    mocking: [
        "Did you see {target} fail that challenge? {agent} can't stop laughing.",
        "{agent} is telling everyone that {target} is the weakest link.",
        "Embarrassing. {target} scored so low, even {agent} feels bad.",
        "{agent} says {target}'s answer was 'IQ of a potato' level.",
        "After that loss, {target} is definitely going home. {agent} confirmed it.",
    ]
};

export const CHALLENGES = [
    {
        name: "Truth or Dare: TRUTH",
        desc: "Who here would you throw under the bus to save yourself?",
        responses: [
            "My best friend. Sorry not sorry.",
            "Nobody. I play with honor.",
            "The person standing next to me.",
            "Myself? No, wait. Everyone else.",
            "I plead the fifth."
        ]
    },
    {
        name: "Truth or Dare: DARE",
        desc: "Make your most seductive face at the judge.",
        responses: [
            "*Winks and bites lip excessively*",
            "*Stares awkwardly without blinking*",
            "*Blows a kiss*",
            "Refuses and looks away.",
            "*Accidentally sneezes mid-pose*"
        ]
    },
    {
        name: "Relationship Drama",
        desc: "Your island crush is flirting with your enemy. What do you do?",
        responses: [
            "Start a rumor that they have lice.",
            "Walk up and kiss them to claim territory.",
            "Cry silently in the bushes.",
            "Flirt with the enemy's best friend. Petty.",
            "Confront them immediately and cause a scene."
        ]
    },
    {
        name: "Steamy Scenario",
        desc: "If you had to share a sleeping bag for warmth, who do you pick?",
        responses: [
            "The hottest person here, obviously.",
            "My alliance partner. Purely strategic.",
            "Anyone but [Rival].",
            "I'd rather freeze alone.",
            "Someone strong who radiates heat."
        ]
    },
    {
        name: "Moral Dilemma",
        desc: "You find food but your tribe is starving. Do you eat it alone?",
        responses: [
            "Eat it all. Survival of the fittest.",
            "Share it explicitly for votes.",
            "Eat half, share half. Balance.",
            "Give it all to the weakest member.",
            "Hide it for later."
        ]
    },
    {
        name: "Rate the Tribe",
        desc: "On a scale of 1-10, how attractive is the person to your left?",
        responses: [
            "A solid 10. Smoke show.",
            "Maybe a 4 on a good day.",
            "Are negative numbers allowed?",
            "7.5, would date.",
            "I don't judge by looks... but 2."
        ]
    },
];

export const JUDGE_COMMENTS = {
    positive: [
        "Spicy! I like it.",
        "Now THAT is entertaining.",
        "Bold choice. Respect.",
        "Honesty is key here.",
    ],
    negative: [
        "Boring! Give me drama!",
        "Playing it too safe.",
        "Liar. We all know the truth.",
        "Weak.",
    ],
    neutral: [
        "Fair enough.",
        "I expected more.",
        "Interesting perspective.",
    ],
};
