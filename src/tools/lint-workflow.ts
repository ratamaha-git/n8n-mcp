import { z } from "zod";
import {
	CREDENTIAL_REQUIRED_TYPES,
	DEPRECATED_NODE_TYPES,
} from "../schemas/node-catalog.js";

export const lintWorkflowInputSchema = {
	type: "object",
	properties: {
		workflow: {
			description:
				"n8n workflow as either a parsed object or a JSON string.",
			oneOf: [{ type: "object" }, { type: "string" }],
		},
	},
	required: ["workflow"],
} as const;

const inputZod = z.object({
	workflow: z.union([z.record(z.unknown()), z.string()]),
});

interface Issue {
	severity: "error" | "warning";
	node?: string;
	message: string;
}

export async function lintWorkflow(rawArgs: unknown) {
	const args = inputZod.parse(rawArgs);
	const workflow =
		typeof args.workflow === "string"
			? safeParse(args.workflow)
			: args.workflow;
	const issues: Issue[] = [];

	if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
		issues.push({
			severity: "error",
			message: "Workflow is not a JSON object.",
		});
		return formatResult(issues);
	}

	const wf = workflow as Record<string, unknown>;
	const nodes = wf.nodes;
	if (!Array.isArray(nodes)) {
		issues.push({
			severity: "error",
			message: "Workflow has no `nodes` array.",
		});
		return formatResult(issues);
	}

	const connections =
		wf.connections && typeof wf.connections === "object"
			? (wf.connections as Record<string, unknown>)
			: {};

	const nodeNames = new Set<string>();
	const seenIds = new Set<string>();

	for (const raw of nodes) {
		if (!raw || typeof raw !== "object") {
			issues.push({ severity: "error", message: "Node is not an object." });
			continue;
		}
		const n = raw as Record<string, unknown>;
		const nodeName = typeof n.name === "string" ? n.name : undefined;

		if (!nodeName) {
			issues.push({ severity: "error", message: "Node missing string `name`." });
		} else {
			if (nodeNames.has(nodeName)) {
				issues.push({
					severity: "error",
					node: nodeName,
					message: "Duplicate node name.",
				});
			}
			nodeNames.add(nodeName);
		}

		if (typeof n.id !== "string") {
			issues.push({
				severity: "error",
				node: nodeName,
				message: "Node missing string `id`.",
			});
		} else {
			if (seenIds.has(n.id)) {
				issues.push({
					severity: "error",
					node: nodeName,
					message: `Duplicate node id ${n.id}.`,
				});
			}
			seenIds.add(n.id);
		}

		const nodeType = typeof n.type === "string" ? n.type : undefined;
		if (!nodeType) {
			issues.push({
				severity: "error",
				node: nodeName,
				message: "Node missing string `type`.",
			});
		} else if (DEPRECATED_NODE_TYPES[nodeType]) {
			issues.push({
				severity: "warning",
				node: nodeName,
				message: `Node type "${nodeType}" is deprecated. Use "${DEPRECATED_NODE_TYPES[nodeType]}".`,
			});
		}

		if (n.typeVersion === undefined || n.typeVersion === null) {
			issues.push({
				severity: "error",
				node: nodeName,
				message: "Missing `typeVersion`.",
			});
		} else if (typeof n.typeVersion !== "number") {
			issues.push({
				severity: "error",
				node: nodeName,
				message: "`typeVersion` must be a number.",
			});
		}

		if (
			!Array.isArray(n.position) ||
			n.position.length !== 2 ||
			n.position.some((v) => typeof v !== "number")
		) {
			issues.push({
				severity: "warning",
				node: nodeName,
				message: "`position` should be a [x, y] array of numbers.",
			});
		}

		if (nodeType && CREDENTIAL_REQUIRED_TYPES.has(nodeType) && !n.credentials) {
			issues.push({
				severity: "warning",
				node: nodeName,
				message: `Node type "${nodeType}" usually needs a credential. None set.`,
			});
		}
	}

	for (const [src, conf] of Object.entries(connections)) {
		if (!nodeNames.has(src)) {
			issues.push({
				severity: "error",
				message: `Connection from unknown node "${src}".`,
			});
			continue;
		}
		const main = (conf as { main?: unknown })?.main;
		if (!Array.isArray(main)) continue;
		for (const branch of main) {
			if (!Array.isArray(branch)) continue;
			for (const conn of branch) {
				if (
					!conn ||
					typeof conn !== "object" ||
					typeof (conn as Record<string, unknown>).node !== "string"
				) {
					issues.push({
						severity: "error",
						message: `Malformed connection from "${src}".`,
					});
					continue;
				}
				const target = (conn as { node: string }).node;
				if (!nodeNames.has(target)) {
					issues.push({
						severity: "error",
						message: `Connection from "${src}" points to missing node "${target}".`,
					});
				}
			}
		}
	}

	return formatResult(issues);
}

function safeParse(s: string): unknown {
	try {
		return JSON.parse(s);
	} catch {
		return null;
	}
}

function formatResult(issues: Issue[]) {
	if (issues.length === 0) {
		return {
			content: [{ type: "text" as const, text: "no issues found" }],
		};
	}
	const lines = issues.map((i) => {
		const tag = i.severity.toUpperCase();
		const where = i.node ? `[${i.node}] ` : "";
		return `${tag} ${where}${i.message}`;
	});
	return {
		content: [{ type: "text" as const, text: lines.join("\n") }],
	};
}
