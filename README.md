# n8n-mcp

An [MCP](https://modelcontextprotocol.io) server that gives [Cursor](https://cursor.sh) three tools for working with [n8n](https://n8n.io): scaffold a custom node, generate a workflow JSON from a description, and lint an existing workflow. Background and design notes are in the [long-form post on automatelab.tech](https://automatelab.tech).

## TL;DR

Install once, paste four lines into `~/.cursor/mcp.json`, and Cursor can scaffold n8n nodes, generate workflow JSON, and catch deprecated node types in your workflows.

## What it does

Three tools, exposed over MCP stdio transport:

- **`n8n_scaffold_node`** - takes a one-line description and returns a TypeScript skeleton for an `INodeType`: `description` block, credential reference, `execute` method stub returning `INodeExecutionData[][]`.
- **`n8n_generate_workflow`** - takes a description like "Stripe webhook to Slack and Google Sheets" and returns valid n8n workflow JSON: unique node `id`s, correct `connections`, `position` arrays, `typeVersion` on every node.
- **`n8n_lint_workflow`** - takes a workflow JSON and returns concrete validation errors: missing credentials, deprecated node names (`Function` -> `Code`), broken connections, missing `typeVersion`.

## Install

Requires Node 20 or later.

```bash
npm install -g @automatelab/n8n-mcp
```

## Configure Cursor

Add this block to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "@automatelab/n8n-mcp"]
    }
  }
}
```

Restart Cursor. The three `n8n_*` tools appear in the MCP panel.

## Tool examples

### `n8n_scaffold_node`

Prompt in Cursor:

> Use n8n_scaffold_node to scaffold a node that posts a message to Discord with rate limiting.

Returns a complete `discordRateLimited.node.ts` ready to drop into a custom n8n package.

### `n8n_generate_workflow`

Prompt in Cursor:

> Use n8n_generate_workflow to build: Stripe webhook -> Slack message + new row in Google Sheets.

Returns a workflow JSON you can paste straight into n8n's import dialog.

### `n8n_lint_workflow`

Prompt in Cursor:

> Lint this workflow JSON.
> [paste JSON]

Returns a list like:

```
ERROR [Webhook] Missing `typeVersion`.
WARNING [Slack] Node type "n8n-nodes-base.slack" usually needs a credential. None set.
WARNING [LegacyFunction] Node type "n8n-nodes-base.function" is deprecated. Use "n8n-nodes-base.code".
```

Or `no issues found`.

## Examples

The `examples/` directory ships with two ready-to-import workflows:

- `workflow-stripe-to-slack.json` - Stripe webhook fans out to Slack and Google Sheets.
- `workflow-rss-to-discord.json` - RSS feed trigger posts new items to a Discord channel.

Import either via n8n's "Import from File" dialog.

## Development

```bash
git clone https://github.com/ratamaha-git/n8n-mcp
cd n8n-mcp
npm install
npm run build
npm run smoke
```

`npm run smoke` boots the server with a `--smoke` flag that lists registered tools and exits without binding stdio. Useful for CI or first-run sanity checks.

## More

Build notes, design tradeoffs, and the n8n cluster on automatelab: [https://automatelab.tech](https://automatelab.tech).

## License

MIT. See [LICENSE](./LICENSE).
