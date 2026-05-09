/**
 * Catalog of n8n node behaviors used by the lint and generate tools.
 *
 * The lists here are intentionally narrow: they cover the most common nodes
 * a user is likely to ship in a workflow. Unknown node types are treated as
 * valid by the linter (no false positives).
 */

export const DEPRECATED_NODE_TYPES: Record<string, string> = {
	"n8n-nodes-base.function": "n8n-nodes-base.code",
	"n8n-nodes-base.functionItem": "n8n-nodes-base.code",
	"n8n-nodes-base.start": "n8n-nodes-base.manualTrigger",
};

export const CREDENTIAL_REQUIRED_TYPES = new Set<string>([
	"n8n-nodes-base.airtable",
	"n8n-nodes-base.discord",
	"n8n-nodes-base.gmail",
	"n8n-nodes-base.googleSheets",
	"n8n-nodes-base.notion",
	"n8n-nodes-base.openAi",
	"n8n-nodes-base.postgres",
	"n8n-nodes-base.slack",
	"n8n-nodes-base.stripe",
]);

export const KNOWN_TRIGGER_TYPES = new Set<string>([
	"n8n-nodes-base.manualTrigger",
	"n8n-nodes-base.webhook",
	"n8n-nodes-base.scheduleTrigger",
	"n8n-nodes-base.cron",
	"n8n-nodes-base.rssFeedReadTrigger",
	"n8n-nodes-base.emailReadImap",
]);
