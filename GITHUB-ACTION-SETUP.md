# Setting Up the n8n MCP GitHub Action

This guide walks you through publishing and using the n8n MCP GitHub Action on the GitHub Marketplace.

## Publication checklist

Before publishing the action:

1. **Tag the release** in the n8n-mcp repo:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Create a GitHub Release** at https://github.com/ratamaha-git/n8n-mcp/releases
   - Tag: `v1.0.0`
   - Title: `n8n MCP v1.0.0`
   - Body: Release notes (added GitHub Action support, etc.)
   - Check "Publish as a release" to make it public

3. **GitHub will automatically list the action** on the Marketplace within a few minutes.

## Using the action in your repo

Once published, you can reference the action from any repo:

### Pull request workflow: lint on change

```yaml
name: Lint n8n Workflows on PR

on:
  pull_request:
    paths:
      - 'workflows/**/*.json'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get changed workflow files
        id: files
        uses: tj-actions/changed-files@v41
        with:
          files: 'workflows/**/*.json'

      - name: Lint workflows
        if: steps.files.outputs.any_changed == 'true'
        uses: ratamaha-git/n8n-mcp@v1
        with:
          command: 'lint'
          workflow-json: ${{ steps.files.outputs.all_changed_files[0] }}
          post-comment: 'true'
```

### Workflow dispatch: diagnose execution on demand

```yaml
name: Diagnose n8n Execution

on:
  workflow_dispatch:
    inputs:
      execution-json:
        description: 'Failed execution JSON from n8n'
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

### With live n8n instance integration

If you have a live n8n instance and want to list/fetch workflows:

```yaml
- uses: ratamaha-git/n8n-mcp@v1
  with:
    command: 'list-workflows'
    n8n-api-url: ${{ secrets.N8N_API_URL }}
    n8n-api-key: ${{ secrets.N8N_API_KEY }}
```

Store credentials as repository secrets in **Settings > Secrets and variables > Actions**.

## Troubleshooting

### Action not found on Marketplace

- Wait 5-10 minutes for GitHub to index the release
- Check that `action.yml` is at the repo root
- Verify the release is published (not a draft)

### Multiple files in lint

For multiple files, you may need to lint each separately:

```yaml
- name: Lint each workflow
  run: |
    for file in ${{ steps.files.outputs.all_changed_files }}; do
      echo "Linting $file"
      # Call the action or run n8n-mcp directly
    done
```

Or use the n8n MCP CLI directly in your workflow:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'

- run: npm install -g @automatelab/n8n-mcp
- run: n8n-mcp --smoke  # Sanity check
```

## Advanced: using the CLI directly

If you prefer to call the n8n MCP tools without the action wrapper:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g @automatelab/n8n-mcp

      - name: Lint workflow
        run: |
          cat workflow.json | node -e "
            const { lintWorkflow } = require('@automatelab/n8n-mcp');
            let data = '';
            process.stdin.on('data', c => data += c);
            process.stdin.on('end', async () => {
              const result = await lintWorkflow({ workflow: JSON.parse(data) });
              console.log(result.content[0].text);
            });
          "
```

## See also

- [Action README](./ACTION.md) — full input/output reference
- [Main README](./README.md) — tool details
- [SKILL.md](./SKILL.md) — AI agent integration guide
