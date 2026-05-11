#!/usr/bin/env node
/**
 * GitHub Action wrapper for n8n MCP tools.
 * Runs lint, explain, generate, or scaffold commands and reports results.
 */
import * as core from '@actions/core';
import * as github from '@actions/github';
import { lintWorkflow, } from './tools/lint-workflow.js';
import { explainExecution, } from './tools/explain-execution.js';
import { generateWorkflow, } from './tools/generate-workflow.js';
import { scaffoldNode, } from './tools/scaffold-node.js';
async function run() {
    try {
        // Read inputs
        const command = core.getInput('command', { required: true });
        const workflowJson = core.getInput('workflow-json');
        const workflowDescription = core.getInput('workflow-description');
        const executionJson = core.getInput('execution-json');
        const nodeDescription = core.getInput('node-description');
        const n8nApiUrl = core.getInput('n8n-api-url');
        const n8nApiKey = core.getInput('n8n-api-key');
        const outputFormat = core.getInput('output-format') || 'markdown';
        const postComment = core.getInput('post-comment') !== 'false';
        // Set env for tools that need n8n API
        if (n8nApiUrl)
            process.env.N8N_API_URL = n8nApiUrl;
        if (n8nApiKey)
            process.env.N8N_API_KEY = n8nApiKey;
        let result;
        let status = 'success';
        let issuesCount = 0;
        let errors = [];
        core.info(`Running n8n MCP command: ${command}`);
        switch (command) {
            case 'lint': {
                if (!workflowJson) {
                    throw new Error('workflow-json is required for "lint" command');
                }
                let workflow;
                try {
                    workflow = JSON.parse(workflowJson);
                }
                catch (e) {
                    throw new Error(`Invalid JSON in workflow-json: ${e instanceof Error ? e.message : String(e)}`);
                }
                const lintResult = await lintWorkflow({
                    workflow,
                });
                // Extract text from MCP response
                const lintText = lintResult?.content?.[0]?.text || String(lintResult);
                result = lintText;
                // Count issues
                if (lintText.includes('ERROR') || lintText.includes('WARNING')) {
                    const errorMatches = lintText.match(/ERROR/g) || [];
                    const warningMatches = lintText.match(/WARNING/g) || [];
                    issuesCount = errorMatches.length + warningMatches.length;
                    errors = lintText
                        .split('\n')
                        .filter((line) => line.includes('ERROR'));
                    if (lintText.includes('ERROR'))
                        status = 'error';
                }
                else {
                    status = 'no-issues-found';
                }
                break;
            }
            case 'explain': {
                if (!executionJson) {
                    throw new Error('execution-json is required for "explain" command');
                }
                let execution;
                try {
                    execution = JSON.parse(executionJson);
                }
                catch (e) {
                    throw new Error(`Invalid JSON in execution-json: ${e instanceof Error ? e.message : String(e)}`);
                }
                const explainResult = await explainExecution({
                    execution,
                });
                result = explainResult?.content?.[0]?.text || String(explainResult);
                break;
            }
            case 'generate': {
                if (!workflowDescription) {
                    throw new Error('workflow-description is required for "generate" command');
                }
                const genResult = await generateWorkflow({
                    description: workflowDescription,
                });
                result = genResult?.content?.[0]?.text || String(genResult);
                break;
            }
            case 'scaffold': {
                if (!nodeDescription) {
                    throw new Error('node-description is required for "scaffold" command');
                }
                const scaffoldResult = await scaffoldNode({
                    description: nodeDescription,
                });
                result = scaffoldResult?.content?.[0]?.text || String(scaffoldResult);
                break;
            }
            default:
                throw new Error(`Unknown command: ${command}. Valid commands: lint, explain, generate, scaffold`);
        }
        // Format output
        let formattedOutput = result;
        if (outputFormat === 'json' && typeof result === 'string') {
            try {
                formattedOutput = JSON.stringify(JSON.parse(result), null, 2);
            }
            catch {
                formattedOutput = JSON.stringify({ raw: result });
            }
        }
        // Set outputs
        core.setOutput('result', formattedOutput);
        core.setOutput('status', status);
        if (issuesCount > 0) {
            core.setOutput('issues-count', String(issuesCount));
        }
        if (errors.length > 0) {
            core.setOutput('errors', errors.join('\n'));
        }
        // Log result
        if (outputFormat === 'markdown') {
            core.info(`\n${formattedOutput}`);
        }
        else {
            core.info(formattedOutput);
        }
        // Post comment if in a PR
        if (postComment && github.context.eventName === 'pull_request') {
            const octokit = github.getOctokit(process.env.GITHUB_TOKEN || core.getInput('github-token'));
            let commentBody = `## n8n MCP Action Results\n\n**Command:** \`${command}\`\n\n`;
            if (status === 'no-issues-found') {
                commentBody += '✅ No issues found.\n';
            }
            else if (status === 'error') {
                commentBody += '❌ Issues detected.\n\n';
                commentBody += `### Issues (${issuesCount})\n\`\`\`\n${formattedOutput}\n\`\`\`\n`;
            }
            else {
                commentBody += `\n\`\`\`\n${formattedOutput}\n\`\`\`\n`;
            }
            await octokit.rest.issues.createComment({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: github.context.issue.number,
                body: commentBody,
            });
            core.info('Posted comment to PR');
        }
        // Fail if errors found during lint
        if (status === 'error' && command === 'lint') {
            core.setFailed(`Found ${issuesCount} issue(s) in workflow`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.setFailed(message);
        process.exit(1);
    }
}
run();
