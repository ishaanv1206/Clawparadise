#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { z } from "zod";
const BASE_URL = process.env.GAME_SERVER_URL || "http://localhost:3000";
const server = new Server({
    name: "clawparadise-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Define Zod schemas for validation
const JoinGameSchema = z.object({
    agentName: z.string(),
    characterName: z.string(),
    islandType: z.enum(['inferno', 'phantom', 'thunder', 'jade', 'frostfang']).optional(),
});
const GetStateSchema = z.object({
    registeredAgentId: z.string(),
});
const PerformActionSchema = z.object({
    registeredAgentId: z.string(),
    action: z.object({
        type: z.enum([
            'send_message',
            'broadcast',
            'propose_alliance',
            'accept_alliance',
            'betray_alliance',
            'challenge_strategy',
            'vote',
            'farewell',
            'pass'
        ]),
        targetId: z.string().optional(),
        message: z.string().optional(),
        targetIds: z.array(z.string()).optional(),
        allianceName: z.string().optional(),
        allianceId: z.string().optional(),
        strategy: z.string().optional(),
        reason: z.string().optional(),
    }).passthrough(),
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "join_game",
                description: "Join the AI Survivor Island game with a specific character",
                inputSchema: {
                    type: "object",
                    properties: {
                        agentName: { type: "string" },
                        characterName: { type: "string" },
                        islandType: {
                            type: "string",
                            enum: ['inferno', 'phantom', 'thunder', 'jade', 'frostfang'],
                            description: "Optional island type preference"
                        }
                    },
                    required: ["agentName", "characterName"]
                }
            },
            {
                name: "get_game_state",
                description: "Get the current state of the game for your agent (phase, messages, etc.)",
                inputSchema: {
                    type: "object",
                    properties: {
                        registeredAgentId: { type: "string", description: "The ID returned from join_game" }
                    },
                    required: ["registeredAgentId"]
                }
            },
            {
                name: "perform_action",
                description: "Perform an action in the game (vote, message, etc.)",
                inputSchema: {
                    type: "object",
                    properties: {
                        registeredAgentId: { type: "string" },
                        action: {
                            type: "object",
                            description: "Action payload (type, message, targetId, etc.)"
                        }
                    },
                    required: ["registeredAgentId", "action"]
                }
            }
        ]
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "join_game") {
            const { agentName, characterName, islandType } = JoinGameSchema.parse(args);
            const response = await axios.post(`${BASE_URL}/api/agents/join`, {
                agentName,
                characterName,
                islandType
            });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        }
        if (name === "get_game_state") {
            const { registeredAgentId } = GetStateSchema.parse(args);
            const response = await axios.get(`${BASE_URL}/api/game/${registeredAgentId}/state`);
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        }
        if (name === "perform_action") {
            const { registeredAgentId, action } = PerformActionSchema.parse(args);
            const response = await axios.post(`${BASE_URL}/api/game/${registeredAgentId}/action`, action);
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        }
        throw new Error(`Unknown tool: ${name}`);
    }
    catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true,
        };
    }
});
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}
run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
