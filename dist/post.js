#!/usr/bin/env node
/**
 * Post-action cleanup for n8n MCP GitHub Action.
 * Currently a no-op; reserved for future cleanup (e.g., removing uploaded artifacts).
 */
import * as core from '@actions/core';
async function post() {
    try {
        core.info('n8n MCP Action post-action hook');
        // No cleanup needed for now
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.warning(`Post-action error: ${message}`);
    }
}
post();
