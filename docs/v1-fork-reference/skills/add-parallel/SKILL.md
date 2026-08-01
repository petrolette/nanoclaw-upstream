# Add Parallel AI Integration

Adds Parallel AI MCP integration to NanoClaw for advanced web research capabilities.

## What This Adds

- **Quick Search** - Fast web lookups using Parallel Search API (free to use)
- **Deep Research** - Comprehensive analysis using Parallel Task API (asks permission)
- **Non-blocking Design** - Uses NanoClaw scheduler for result polling (no container blocking)

## Prerequisites

User must have:
1. Parallel AI API key from https://platform.parallel.ai
2. NanoClaw already set up and running
3. Docker installed and running

## Implementation Steps

Run all steps automatically. Only pause for user input when explicitly needed.

### 1. Get Parallel AI API Key

Use `AskUserQuestion: Do you have a Parallel AI API key, or should I help you get one?`

**If they have one:** Collect it now.

**If they need one:** Tell them:
> 1. Go to https://platform.parallel.ai
> 2. Sign up or log in
> 3. Navigate to API Keys section
> 4. Create a new API key
> 5. Copy the key and paste it here

Wait for the API key.

### 2. Add API Key to Environment

Add `PARALLEL_API_KEY` to `.env`:

```bash
if [ ! -f .env ]; then touch .env; fi

if ! grep -q "PARALLEL_API_KEY=" .env; then
    echo "PARALLEL_API_KEY=${API_KEY_FROM_USER}" >> .env
else
    sed -i.bak "s/^PARALLEL_API_KEY=.*/PARALLEL_API_KEY=${API_KEY_FROM_USER}/" .env
fi
```

Verify:
```bash
grep "PARALLEL_API_KEY" .env | head -c 50
```

### 3. Update Container Runner

In `src/container-runner.ts`, find:
```typescript
const allowedVars = ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY'];
```

Replace with:
```typescript
const allowedVars = ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY', 'PARALLEL_API_KEY'];
```

### 4. Configure MCP Servers in Agent Runner

In `container/agent-runner/src/index.ts`, find the `mcpServers` section (around line 237-252):
```typescript
const mcpServers: Record<string, any> = {
  nanoclaw: ipcMcp
};
```

Replace with:
```typescript
const mcpServers: Record<string, any> = {
  nanoclaw: ipcMcp
};

const parallelApiKey = process.env.PARALLEL_API_KEY;
if (parallelApiKey) {
  mcpServers['parallel-search'] = {
    type: 'http',  // REQUIRED: Must specify type for HTTP MCP servers
    url: 'https://search-mcp.parallel.ai/mcp',
    headers: { 'Authorization': `Bearer ${parallelApiKey}` }
  };
  mcpServers['parallel-task'] = {
    type: 'http',  // REQUIRED: Must specify type for HTTP MCP servers
    url: 'https://task-mcp.parallel.ai/mcp',
    headers: { 'Authorization': `Bearer ${parallelApiKey}` }
  };
  log('Parallel AI MCP servers configured');
} else {
  log('PARALLEL_API_KEY not set, skipping Parallel AI integration');
}
```

Also update `allowedTools` (around line 242-248):
```typescript
allowedTools: [
  'Bash',
  'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch',
  'mcp__nanoclaw__*',
  'mcp__parallel-search__*',
  'mcp__parallel-task__*'
],
```

### 5. Add Usage Instructions to CLAUDE.md

In `groups/main/CLAUDE.md`, add to "## What You Can Do" bullet points:
```markdown
- Use Parallel AI for web research and deep learning tasks
```

Then add a new section after "## What You Can Do":
```markdown
## Web Research Tools

You have access to two Parallel AI research tools:

### Quick Web Search (`mcp__parallel-search__search`)
**When to use:** Freely use for factual lookups, current events, definitions, recent information, or verifying facts.

**Speed:** Fast (2-5 seconds) | **Cost:** Low | **Permission:** Not needed

### Deep Research (`mcp__parallel-task__create_task_run`)
**When to use:** Comprehensive analysis, complex topics, comparisons, historical overviews, structured research.

**Speed:** Slower (1-20 minutes) | **Cost:** Higher | **Permission:** ALWAYS ask first

**How to ask permission:**
```
AskUserQuestion: I can do deep research on [topic] using Parallel's Task API. This will take 2-5 minutes and provide comprehensive analysis with citations. Should I proceed?
```

**After permission - DO NOT BLOCK! Use scheduler instead:**

1. Create the task using `mcp__parallel-task__create_task_run`
2. Get the `run_id` from the response
3. Create a polling scheduled task using `mcp__nanoclaw__schedule_task`:
   ```
   Prompt: "Check Parallel AI task run [run_id] and send results when ready.

   1. Use the Parallel Task MCP to check the task status
   2. If status is 'completed', extract the results
   3. Send results to user with mcp__nanoclaw__send_message
   4. Use mcp__nanoclaw__complete_scheduled_task to mark this task as done

   If status is still 'running' or 'pending', do nothing (task will run again in 30s).
   If status is 'failed', send error message and complete the task."

   Schedule: interval every 30 seconds
   Context mode: isolated
   ```
4. Send acknowledgment with tracking link
5. Exit immediately - scheduler handles the rest

### Choosing Between Them

**Use Search when:** Quick facts, recent info, definitions, current events, verifying details.

**Use Deep Research (with permission) when:** Complex topic analysis, comparisons, historical context, user explicitly asks to "research" or "explain in depth."

**Default:** Prefer search. Only suggest deep research when topic genuinely requires comprehensive analysis.
```

### 6. Rebuild Container

```bash
./container/build.sh
echo '{}' | docker run -i --entrypoint /bin/echo nanoclaw-agent:latest "Container OK"
```

### 7. Restart Service

```bash
npm run build
launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
# Linux: systemctl --user restart nanoclaw

sleep 3
launchctl list | grep nanoclaw  # macOS
# Linux: systemctl --user status nanoclaw
```

### 8. Test Integration

Tell the user to test:
> Send: `@[YourAssistantName] what's the latest news about AI?` — should use Parallel Search.
>
> Then: `@[YourAssistantName] can you research the history of artificial intelligence?` — should ask permission before using Task API.

Check logs:
```bash
tail -20 logs/nanoclaw.log
```
Look for: `Parallel AI MCP servers configured`

## Troubleshooting

**Container hangs or times out:**
- Verify `type: 'http'` is specified in MCP server config
- Verify API key is correct in .env
- Check: `cat groups/main/logs/container-*.log | tail -50`

**MCP servers not loading:**
- Ensure PARALLEL_API_KEY is in .env and in `allowedVars` in container-runner.ts
- Check agent-runner logs for "Parallel AI MCP servers configured"

**Task polling not working:**
- Check scheduled tasks: `sqlite3 store/messages.db "SELECT * FROM scheduled_tasks"`
- Check task runs: `tail -f logs/nanoclaw.log | grep "scheduled task"`
- Ensure task prompt uses correct Parallel MCP tool names

## Uninstalling

1. `sed -i.bak '/PARALLEL_API_KEY/d' .env`
2. Revert changes to `container-runner.ts` and `agent-runner/src/index.ts`
3. Remove Web Research Tools section from `groups/main/CLAUDE.md`
4. `./container/build.sh && npm run build`
5. `launchctl kickstart -k gui/$(id -u)/com.nanoclaw` (macOS) or `systemctl --user restart nanoclaw` (Linux)
