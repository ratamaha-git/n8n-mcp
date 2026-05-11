# n8n MCP GitHub Action

Run n8n MCP tools (lint, explain, generate, scaffold) as a GitHub Action. Detect workflow issues in PRs, diagnose failed executions, and scaffold custom nodes — all in your CI/CD pipeline.

## Usage

### Quick start: lint a workflow in a PR

```yaml
name: Lint n8n Workflows

on:
  pull_request:
    paths:
      - '**/*.json'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ratamaha-git/n8n-mcp@v1
        with:
          command: 'lint'
          workflow-json: ${{ fromJson(env.WORKFLOW_JSON) }}
```

## Inputs

| Input | Required | Description |
|---|---|---|
| `command` | yes | Tool to run: `lint` \| `explain` \| `generate` \| `scaffold` |
| `workflow-json` | for lint/explain | JSON of the workflow (or execution for explain) |
| `workflow-description` | for generate | Plain-English description of workflow to generate |
| `execution-json` | for explain | Execution JSON from a failed n8n run |
| `node-description` | for scaffold | Description of custom node to scaffold |
| `n8n-api-url` | optional | n8n instance URL for live-instance tools |
| `n8n-api-key` | optional | n8n API key (use secrets!) |
| `output-format` | optional | `text` \| `json` \| `markdown` (default: `markdown`) |
| `post-comment` | optional | Post results as PR comment (`true`/`false`, default: `true` on pull_request) |

## Outputs

| Output | Description |
|---|---|
| `result` | Tool output (formatted per `output-format`) |
| `status` | `success` \| `error` \| `no-issues-found` |
| `issues-count` | For lint: total number of issues found |
| `errors` | For lint: list of error messages |

## Examples

### Lint workflows in a PR

Automatically lint any JSON files changed in a PR and post results as a comment.

```yaml
name: Lint Workflows

on:
  pull_request:
    paths:
      - '**/*.json'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get changed files
        id: changed
        uses: tj-actions/changed-files@v41
        with:
          files: '**/*.json'

      - name: Lint
        if: steps.changed.outputs.any_changed == 'true'
        uses: ratamaha-git/n8n-mcp@v1
        with:
          command: 'lint'
          workflow-json: ${{ steps.changed.outputs.all_changed_files[0] }}
```

### Diagnose a failed execution

Use workflow dispatch to manually diagnose why a workflow failed.

```yaml
name: Diagnose Execution

on:
  workflow_dispatch:
    inputs:
      execution-json:
        description: 'Paste the full execution JSON from n8n'
        required: true
        type: string

jobs:
  diagnose:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ratamaha-git/n8n-mcp@v1
        with:
          command: 'explain'
          execution-json: ${{ inputs.execution-json }}
```

### Generate workflow from description

Generate valid n8n workflow JSON from plain-English requirements.

```yaml
name: Generate Workflow

on:
  workflow_dispatch:
    inputs:
      description:
        description: 'Describe the workflow: trigger, actions, outputs'
        required: true
        type: string

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ratamaha-git/n8n-mcp@v1
        id: gen
        with:
          command: 'generate'
          workflow-description: ${{ inputs.description }}

      - name: Save workflow
        run: |
          echo '${{ steps.gen.outputs.result }}' > generated-workflow.json

      - uses: actions/upload-artifact@v3
        with:
          name: generated-workflow
          path: generated-workflow.json
```

### Scaffold a custom node

Generate TypeScript skeleton for a custom n8n node.

```yaml
name: Scaffold Node

on:
  workflow_dispatch:
    inputs:
      description:
        description: 'Describe the custom node (inputs, outputs, logic)'
        required: true
        type: string

jobs:
  scaffold:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ratamaha-git/n8n-mcp@v1
        id: node
        with:
          command: 'scaffold'
          node-description: ${{ inputs.description }}

      - name: Save node
        run: |
          echo '${{ steps.node.outputs.result }}' > CustomNode.ts

      - uses: actions/upload-artifact@v3
        with:
          name: custom-node
          path: CustomNode.ts
```

## Secrets

If using live-instance commands (list-workflows, get-workflow, etc.), pass credentials as secrets:

```yaml
- uses: ratamaha-git/n8n-mcp@v1
  with:
    command: 'list-workflows'
    n8n-api-url: 'https://n8n.example.com'
    n8n-api-key: ${{ secrets.N8N_API_KEY }}
```

## Failure behavior

- **lint**: fails if any errors found (warnings do not fail)
- **explain**: succeeds even if execution has errors (goal is diagnosis, not validation)
- **generate/scaffold**: fails only if input is invalid or tool crashes

## Tools reference

| Command | Purpose | Input | Stateless |
|---------|---------|-------|-----------|
| `lint` | Detect workflow issues | workflow JSON | yes |
| `explain` | Diagnose failed execution | execution JSON | yes |
| `generate` | Create workflow from description | plain text | yes |
| `scaffold` | Create custom node skeleton | plain text | yes |
| `list-workflows` | List workflows in n8n | filters | no |
| `get-workflow` | Fetch workflow by ID | workflow ID | no |
| `create-workflow` | Create workflow in n8n | workflow JSON | no |
| `activate-workflow` | Enable/disable workflow | workflow ID, active bool | no |
| `list-executions` | Browse execution history | filters | no |

For details on the tools, see the [main README](./README.md) and the [references/](./references/).

## Troubleshooting

### Action not found

Make sure the action is published:

```yaml
uses: ratamaha-git/n8n-mcp@v1  # GitHub Marketplace release
```

Or use the commit SHA for unreleased development:

```yaml
uses: ratamaha-git/n8n-mcp@<commit-sha>
```

### Invalid JSON

Ensure workflow/execution JSON is valid:

```yaml
- run: |
    # Validate JSON before passing
    echo '${{ inputs.workflow-json }}' | jq empty
```

### Comment not posting

PR comment posting requires the action to run in a pull_request context with write permissions. If you're in a fork, comment posting may be restricted.

## License

MIT. See [LICENSE](./LICENSE).

---

Developed by [AutomateLab](https://automatelab.tech).
