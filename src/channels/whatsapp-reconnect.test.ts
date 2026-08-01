/**
 * WhatsApp reconnect backoff — the local divergence from `upstream/channels`.
 *
 * Upstream (`src/channels/whatsapp.ts`, the `connection === 'close'` branch)
 * retried a failed reconnect exactly once and then stopped forever, so any
 * network outage longer than a few seconds left the adapter dead until the
 * host process restarted. These tests pin the replacement: a capped backoff
 * that never reaches a dead end, resets on a successful connection, and keeps
 * both upstream stop conditions (shutting down, logged out).
 *
 * Scope is deliberately narrow — only the reconnect helpers. The rest of the
 * adapter lives inside the registerChannelAdapter factory closure and needs a
 * real Baileys socket to exercise; see the note at the bottom of this file.
 */
import { DisconnectReason } from '@whiskeysockets/baileys';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { log } from '../log.js';
import {
  cancelReconnect,
  createReconnectState,
  reconnectDelayMs,
  resetReconnect,
  scheduleReconnect,
  shouldReconnectAfterClose,
  type ReconnectState,
} from './whatsapp.js';

// Silence adapter logging (and keep the module's process-level handlers out of
// the test run) while still being able to assert on it.
vi.mock('../log.js', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
}));

/** Delays the backoff table is expected to hand out, in order. */
const EXPECTED_DELAYS = [0, 5_000, 10_000, 20_000, 40_000, 80_000, 160_000];
const CAP_MS = 300_000;

/** Timer delays currently registered, captured through a setTimeout spy. */
let scheduledDelays: number[] = [];

/**
 * Drive `scheduleReconnect` through `attempts` consecutive failures. `connect`
 * always rejects, so every attempt must schedule the next one by itself.
 * Timers are fired one at a time so a short delay can't chain several
 * attempts inside a single advance.
 */
async function runFailingAttempts(
  state: ReconnectState,
  attempts: number,
): Promise<{ delays: number[]; connectCalls: number }> {
  const start = scheduledDelays.length;
  const connect = vi.fn().mockRejectedValue(new Error('network down'));

  scheduleReconnect(state, { connect, isShuttingDown: () => false });
  for (let i = 0; i < attempts; i++) {
    await vi.advanceTimersToNextTimerAsync();
  }

  return {
    delays: scheduledDelays.slice(start),
    connectCalls: connect.mock.calls.length,
  };
}

describe('whatsapp reconnect backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scheduledDelays = [];
    // Record every scheduled delay while still using the fake timer, so tests
    // can assert the backoff schedule without waiting in real time.
    const fakeSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      scheduledDelays.push(ms ?? 0);
      return fakeSetTimeout(fn, ms);
    }) as unknown as typeof setTimeout);
    vi.mocked(log.info).mockClear();
    vi.mocked(log.error).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('reconnectDelayMs', () => {
    it('walks the backoff table in order', () => {
      EXPECTED_DELAYS.forEach((expected, attempt) => {
        expect(reconnectDelayMs(attempt)).toBe(expected);
      });
    });

    it('caps at 5 minutes past the end of the table', () => {
      expect(reconnectDelayMs(EXPECTED_DELAYS.length)).toBe(CAP_MS);
      expect(reconnectDelayMs(EXPECTED_DELAYS.length + 50)).toBe(CAP_MS);
      expect(reconnectDelayMs(10_000)).toBe(CAP_MS);
    });

    it('never exceeds the cap anywhere in the table', () => {
      for (let attempt = 0; attempt < 100; attempt++) {
        expect(reconnectDelayMs(attempt)).toBeLessThanOrEqual(CAP_MS);
      }
    });
  });

  describe('scheduleReconnect', () => {
    it('schedules successive attempts with growing, capped delays', async () => {
      const state = createReconnectState();
      const { delays } = await runFailingAttempts(state, EXPECTED_DELAYS.length + 2);

      expect(delays.slice(0, EXPECTED_DELAYS.length)).toEqual(EXPECTED_DELAYS);
      const past = delays.slice(EXPECTED_DELAYS.length);
      expect(past.length).toBeGreaterThanOrEqual(2);
      expect(past.every((d) => d === CAP_MS)).toBe(true);

      cancelReconnect(state);
    });

    it('keeps scheduling after far more than the two upstream attempts', async () => {
      // The regression test for the upstream defect: upstream gave up after
      // attempt 2. N = 12 here, and a further attempt is still pending.
      const state = createReconnectState();
      const { delays, connectCalls } = await runFailingAttempts(state, 12);

      expect(connectCalls).toBe(12);
      expect(delays.length).toBe(13); // 12 fired + 1 still pending
      expect(vi.getTimerCount()).toBe(1);
      expect(state.timer).toBeDefined();

      cancelReconnect(state);
    });

    it('logs the attempt number and delay of every attempt', async () => {
      // Without this line a stuck reconnect is undiagnosable in production.
      const state = createReconnectState();
      await runFailingAttempts(state, 3);

      const scheduleLogs = vi.mocked(log.info).mock.calls.filter(([msg]) => msg === 'Scheduling WhatsApp reconnect');
      expect(scheduleLogs.length).toBe(4); // 3 fired + 1 pending
      scheduleLogs.forEach(([, data], i) => {
        expect(data).toEqual({ attempt: i + 1, delayMs: EXPECTED_DELAYS[i] });
      });

      cancelReconnect(state);
    });

    it('does not schedule anything while shutting down', async () => {
      const state = createReconnectState();
      const connect = vi.fn().mockResolvedValue(undefined);

      scheduleReconnect(state, { connect, isShuttingDown: () => true });

      expect(vi.getTimerCount()).toBe(0);
      expect(state.timer).toBeUndefined();
      expect(state.attempt).toBe(0);

      await vi.advanceTimersByTimeAsync(CAP_MS);
      expect(connect).not.toHaveBeenCalled();
    });

    it('does not reconnect when shutdown starts while a timer is pending', async () => {
      const state = createReconnectState();
      const connect = vi.fn().mockResolvedValue(undefined);
      let shuttingDown = false;

      // Attempt 2 so the pending timer has a non-zero delay to be caught in.
      state.attempt = 1;
      scheduleReconnect(state, { connect, isShuttingDown: () => shuttingDown });
      expect(vi.getTimerCount()).toBe(1);

      shuttingDown = true; // teardown() flips this
      await vi.advanceTimersByTimeAsync(CAP_MS);

      expect(connect).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('cancelReconnect drops the pending timer', async () => {
      const state = createReconnectState();
      const connect = vi.fn().mockResolvedValue(undefined);

      state.attempt = 1;
      scheduleReconnect(state, { connect, isShuttingDown: () => false });
      cancelReconnect(state);

      expect(state.timer).toBeUndefined();
      await vi.advanceTimersByTimeAsync(CAP_MS);
      expect(connect).not.toHaveBeenCalled();
    });
  });

  describe('resetReconnect', () => {
    it('sends the next attempt back to the first backoff step', async () => {
      const state = createReconnectState();
      await runFailingAttempts(state, 5);
      expect(state.attempt).toBeGreaterThan(5);

      // What the `connection === 'open'` branch does.
      resetReconnect(state);
      expect(state.attempt).toBe(0);
      expect(state.timer).toBeUndefined();

      const { delays } = await runFailingAttempts(state, 1);
      expect(delays[0]).toBe(EXPECTED_DELAYS[0]);
    });

    it('cancels a pending timer so a stale attempt cannot open a second socket', async () => {
      const state = createReconnectState();
      const connect = vi.fn().mockResolvedValue(undefined);

      state.attempt = 2;
      scheduleReconnect(state, { connect, isShuttingDown: () => false });
      resetReconnect(state);

      await vi.advanceTimersByTimeAsync(CAP_MS);
      expect(connect).not.toHaveBeenCalled();
    });
  });

  describe('shouldReconnectAfterClose', () => {
    it('reconnects on an ordinary close', () => {
      expect(shouldReconnectAfterClose(DisconnectReason.connectionLost, false)).toBe(true);
      expect(shouldReconnectAfterClose(DisconnectReason.restartRequired, false)).toBe(true);
      expect(shouldReconnectAfterClose(undefined, false)).toBe(true);
    });

    it('never reconnects on loggedOut — the auth-clearing branch owns that case', () => {
      expect(shouldReconnectAfterClose(DisconnectReason.loggedOut, false)).toBe(false);
      expect(shouldReconnectAfterClose(DisconnectReason.loggedOut, true)).toBe(false);
    });

    it('never reconnects while shutting down — a parallel connect truncates creds.json', () => {
      expect(shouldReconnectAfterClose(DisconnectReason.connectionLost, true)).toBe(false);
      expect(shouldReconnectAfterClose(undefined, true)).toBe(false);
    });
  });
});

// Not covered here: that the `connection === 'close'` handler actually routes
// through shouldReconnectAfterClose / scheduleReconnect, and that
// `connection === 'open'` calls resetReconnect. Those live inside the
// registerChannelAdapter factory closure, which is not exported and needs a
// live Baileys socket plus auth state on disk to reach. Making them reachable
// would mean restructuring the adapter — a larger divergence from upstream
// than the fix itself. Verified by reading instead: whatsapp.ts, the
// `connection === 'close'` / `=== 'open'` branches and teardown().
