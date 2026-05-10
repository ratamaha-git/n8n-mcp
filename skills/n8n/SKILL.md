---
name: n8n
description: Use when the user wants to build, debug, or extend an n8n workflow - generating workflow JSON from a description, scaffolding a custom TypeScript node, or linting an existing workflow for missing credentials, deprecated node types, and broken connections.
---

# n8n

This skill pairs with the `@automatelab/n8n-mcp` server. It gives you three tools and a small amount of context so you produce n8n output that imports cleanly and runs.

## When to use which tool

- **`n8n_generate_workflow`** - the user describes a flow in plain English ("Stripe webhook to Slack and a Google Sheets row"). Returns a workflow JSON ready for n8n's "Import from File" dialog.
- **`n8n_scaffold_node`** - the user wants a *custom* node (one not in n8n's library, or a thin wrapper around an internal API). Returns a single `INodeType` TypeScript file to drop into a custom n8n package.
- **`n8n_lint_workflow`** - the user pastes an existing workflow JSON, OR you just generated one and want to verify before handing it back. Catches missing `typeVersion`, deprecated node types (`Function` -> `Code`), missing credentials, broken connections, duplicate IDs.

Default chain: `generate_workflow` -> `lint_workflow` on the result. Hand back the JSON only if lint reports no issues, or call out the warnings explicitly.

## n8n workflow JSON conventions

Every node MUST have:
- `id` - unique UUID per workflow
- `name` - unique display name
- `type` - e.g. `n8n-nodes-base.slack`, `n8n-nodes-base.webhook`
- `typeVersion` - integer or float; n8n refuses to load a node without one
- `position` - `[x, y]` array (canvas coordinates, usually 220px apart horizontally)
- `parameters` - object, can be empty `{}`

`connections` is an object keyed by source node *name* (not id). Each entry: `{ "main": [[{ "node": "<target name>", "type": "main", "index": 0 }]] }`. The double-array is real - first level is output index, second is fan-out.

Credentials: nodes like `slack`, `gmail`, `googleSheets`, `notion`, `discord`, `stripe`, `httpRequest` (with auth) need a `credentials` block referencing a credential by name. The user creates the credential in n8n's UI; the workflow JSON only references it.

## Custom node skeleton

A scaffolded node implements `INodeType`:
- `description: INodeTypeDescription` block - displayName, name, group, version, description, defaults, inputs/outputs, credentials, properties
- `async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>` - read inputs via `this.getInputData()`, return `[outputs]` (note the outer array is per-output-index)

Drop the file into `nodes/<NodeName>/<nodeName>.node.ts` of a custom n8n package, register it in the package's `package.json` `n8n.nodes` array, and rebuild.

## Common deprecations to flag

- `n8n-nodes-base.function` -> `n8n-nodes-base.code` (Function node was removed)
- Missing `typeVersion` on any node - n8n will refuse to import
- `httpRequest` without `authentication: 'none'` and no credential - silently runs unauthenticated

When in doubt, run `n8n_lint_workflow` against the JSON before returning it.
