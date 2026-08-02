/**
 * Structural guard for the Gmail MCP package-install integration point (container image).
 *
 * `@gongrzhe/server-gmail-autoauth-mcp` is a CLI binary installed into the image — it is
 * not importable or typed from this tree, so the build leg can't catch its removal and
 * there's no runtime seam to behavior-test. This asserts the install manifest still
 * carries it, pinned. Drop it and this goes red, signalling the agent would boot without
 * the `gmail-mcp` binary on PATH.
 *
 * Note: /add-gmail-tool ships `gmail-dockerfile.test.ts`, written when global CLIs were a
 * hand-edited `RUN pnpm install -g` block in container/Dockerfile. Upstream since moved
 * them to container/cli-tools.json precisely so a skill adds one by json-merge instead of
 * editing the Dockerfile (see the comment above the COPY in container/Dockerfile). This
 * file is that test, retargeted at the manifest; the skill's version is intentionally not
 * copied in, since it would assert a Dockerfile shape that no longer exists.
 */
import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'bun:test';

interface CliTool {
  name: string;
  version: string;
  onlyBuilt?: boolean;
}

function cliTools(): CliTool[] {
  // container/agent-runner/src/providers/ -> ../../../cli-tools.json == container/cli-tools.json
  const p = path.join(import.meta.dir, '..', '..', '..', 'cli-tools.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')) as CliTool[];
}

describe('container/cli-tools.json installs the Gmail MCP server', () => {
  const tools = cliTools();
  const byName = (name: string) => tools.find((t) => t.name === name);

  it('lists @gongrzhe/server-gmail-autoauth-mcp', () => {
    expect(byName('@gongrzhe/server-gmail-autoauth-mcp')).toBeDefined();
  });

  it('pins it to an exact version, never a range or tag', () => {
    const version = byName('@gongrzhe/server-gmail-autoauth-mcp')?.version ?? '';
    expect(/^\d+\.\d+\.\d+$/.test(version)).toBe(true);
  });

  /**
   * @gongrzhe/server-gmail-autoauth-mcp@1.1.11 has loose deps (`zod-to-json-schema: ^3.22.1`,
   * `zod: ^3.22.4`). pnpm resolves zod-to-json-schema to 3.25.x, which imports `zod/v3` — a
   * subpath that only exists in zod>=3.25, while zod itself resolves to 3.24.x. The result is
   * ERR_PACKAGE_PATH_NOT_EXPORTED at import time. Pinning a pre-subpath version avoids it.
   * Re-check when bumping the MCP server.
   */
  it('carries the zod-to-json-schema pin that keeps it importable', () => {
    const version = byName('zod-to-json-schema')?.version ?? '';
    expect(version).toBe('3.22.5');
  });
});
