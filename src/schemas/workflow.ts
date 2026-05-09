import { z } from "zod";

/**
 * Loose validation schema for an n8n workflow JSON.
 *
 * "Loose" because n8n's workflow format is open-ended (each node type has its
 * own parameters shape). We only enforce the structural invariants the linter
 * relies on. Per-node parameter validation is out of scope for v1.
 */
export const n8nNodeSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	typeVersion: z.number(),
	position: z.tuple([z.number(), z.number()]).or(z.array(z.number()).length(2)),
	parameters: z.record(z.unknown()).optional(),
	credentials: z.record(z.unknown()).optional(),
	disabled: z.boolean().optional(),
	notes: z.string().optional(),
});

export const n8nConnectionSchema = z.object({
	node: z.string().min(1),
	type: z.literal("main"),
	index: z.number().int().nonnegative(),
});

export const n8nConnectionsSchema = z.record(
	z.object({
		main: z.array(z.array(n8nConnectionSchema)),
	}),
);

export const n8nWorkflowSchema = z.object({
	name: z.string().optional(),
	nodes: z.array(n8nNodeSchema),
	connections: n8nConnectionsSchema.optional(),
	active: z.boolean().optional(),
	settings: z.record(z.unknown()).optional(),
	pinData: z.record(z.unknown()).optional(),
});

export type N8nWorkflow = z.infer<typeof n8nWorkflowSchema>;
export type N8nNode = z.infer<typeof n8nNodeSchema>;
