#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
	scaffoldNode,
	scaffoldNodeInputSchema,
} from "./tools/scaffold-node.js";
import {
	generateWorkflow,
	generateWorkflowInputSchema,
} from "./tools/generate-workflow.js";
import {
	lintWorkflow,
	lintWorkflowInputSchema,
} from "./tools/lint-workflow.js";

const tools = [
	{
		name: "n8n_scaffold_node",
		description:
			"Scaffold a TypeScript skeleton for an n8n custom node from a plain-English description. Returns a single TypeScript file implementing INodeType with description, credentials reference, and an execute method stub.",
		inputSchema: scaffoldNodeInputSchema,
	},
	{
		name: "n8n_generate_workflow",
		description:
			"Generate a valid n8n workflow JSON from a plain-English description. Handles webhook/schedule/RSS triggers, common action nodes (Slack, Google Sheets, Discord, Gmail, Notion, HTTP), and AI Agent setups (LangChain root agent + chat model + memory + optional HTTP tool, wired with ai_languageModel / ai_memory / ai_tool connections). Returns workflow JSON with unique node IDs, connections, positions, and typeVersion on every node.",
		inputSchema: generateWorkflowInputSchema,
	},
	{
		name: "n8n_lint_workflow",
		description:
			"Lint an n8n workflow JSON. Returns concrete errors and warnings: missing credentials, deprecated node types (Function -> Code, spreadsheetFile -> convertToFile/extractFromFile), broken connections, missing or non-numeric typeVersion, duplicate node names or IDs, AI Agent missing ai_languageModel sub-node, Webhook missing webhookId, IF node still on v1 condition schema.",
		inputSchema: lintWorkflowInputSchema,
	},
];

const server = new Server(
	{
		name: "n8n-mcp",
		version: "0.2.1",
	},
	{
		capabilities: { tools: {} },
	},
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
	const { name, arguments: args } = req.params;
	switch (name) {
		case "n8n_scaffold_node":
			return scaffoldNode(args ?? {});
		case "n8n_generate_workflow":
			return generateWorkflow(args ?? {});
		case "n8n_lint_workflow":
			return lintWorkflow(args ?? {});
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
});

async function main() {
	if (process.argv.includes("--smoke")) {
		const summary = {
			server: "n8n-mcp",
			version: "0.2.1",
			tools: tools.map((t) => t.name),
		};
		process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
		return;
	}
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((err) => {
	process.stderr.write(`n8n-mcp fatal: ${(err as Error).message}\n`);
	process.exit(1);
});
