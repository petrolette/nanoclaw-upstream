/**
 * Tests for the post-boot channel assertion (local addition, not upstream).
 *
 * The pure core is exercised directly — no registry, no env, no sockets. The
 * reporting layer is checked against a spied `log`, because "shouts about a
 * channel that was never configured" is the failure mode that would make the
 * whole assertion worse than useless.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { computeChannelBootReport, reportChannelBoot, assertChannelsStarted } from './channel-boot-check.js';
import { log } from '../log.js';

/** Predicate helper: channels listed are configured, the rest are not. */
function configuredOnly(...names: string[]) {
  return (channel: string): boolean | undefined => names.includes(channel);
}

describe('computeChannelBootReport', () => {
  it('reports a configured channel that produced no live adapter', () => {
    const report = computeChannelBootReport({
      registered: ['cli', 'telegram', 'whatsapp'],
      active: [{ channelType: 'cli' }, { channelType: 'whatsapp' }],
      isConfigured: configuredOnly('cli', 'telegram', 'whatsapp'),
    });

    expect(report.missing).toEqual(['telegram']);
    expect(report.unchecked).toEqual([]);
  });

  it('stays silent for a channel that is not configured (factory legitimately returned null)', () => {
    // telegram has no token on this install: it is skipped on purpose and
    // must NOT be reported, otherwise the assertion fires on every boot.
    const report = computeChannelBootReport({
      registered: ['cli', 'telegram', 'whatsapp'],
      active: [{ channelType: 'cli' }, { channelType: 'whatsapp' }],
      isConfigured: configuredOnly('cli', 'whatsapp'),
    });

    expect(report.missing).toEqual([]);
    expect(report.unchecked).toEqual([]);
  });

  it('stays silent when every configured channel started', () => {
    const report = computeChannelBootReport({
      registered: ['cli', 'telegram', 'whatsapp'],
      active: [{ channelType: 'cli' }, { channelType: 'telegram' }, { channelType: 'whatsapp' }],
      isConfigured: configuredOnly('cli', 'telegram', 'whatsapp'),
    });

    expect(report.missing).toEqual([]);
    expect(report.unchecked).toEqual([]);
  });

  it('reports several missing channels at once', () => {
    const report = computeChannelBootReport({
      registered: ['cli', 'telegram', 'whatsapp'],
      active: [{ channelType: 'cli' }],
      isConfigured: configuredOnly('cli', 'telegram', 'whatsapp'),
    });

    expect(report.missing).toEqual(['telegram', 'whatsapp']);
  });

  it('classifies a channel with no predicate as unchecked, never as missing', () => {
    const report = computeChannelBootReport({
      registered: ['cli', 'slack'],
      active: [{ channelType: 'cli' }],
      isConfigured: (channel) => (channel === 'cli' ? true : undefined),
    });

    expect(report.missing).toEqual([]);
    expect(report.unchecked).toEqual(['slack']);
  });

  it('accepts a named instance as satisfying its channelType registration', () => {
    const report = computeChannelBootReport({
      registered: ['telegram'],
      active: [{ channelType: 'telegram', instance: 'telegram-secondary' }],
      isConfigured: configuredOnly('telegram'),
    });

    expect(report.missing).toEqual([]);
  });

  it('matches an adapter on its exact registry key too', () => {
    const report = computeChannelBootReport({
      registered: ['telegram-secondary'],
      active: [{ channelType: 'telegram', instance: 'telegram-secondary' }],
      isConfigured: configuredOnly('telegram-secondary'),
    });

    expect(report.missing).toEqual([]);
  });

  it('reports nothing when the registry is empty', () => {
    const report = computeChannelBootReport({
      registered: [],
      active: [],
      isConfigured: () => true,
    });

    expect(report).toEqual({ missing: [], unchecked: [] });
  });
});

describe('reportChannelBoot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs one error naming each missing channel', () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});

    reportChannelBoot({ missing: ['telegram', 'whatsapp'], unchecked: [] });

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[0]?.[1]).toMatchObject({ channel: 'telegram' });
    expect(errorSpy.mock.calls[1]?.[1]).toMatchObject({ channel: 'whatsapp' });
  });

  it('logs no error at all when nothing is missing', () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    const infoSpy = vi.spyOn(log, 'info').mockImplementation(() => {});

    reportChannelBoot({ missing: [], unchecked: [] });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('mentions uncovered channels at info level, not error', () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    const infoSpy = vi.spyOn(log, 'info').mockImplementation(() => {});

    reportChannelBoot({ missing: [], unchecked: ['slack'] });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0]?.[1]).toMatchObject({ channels: ['slack'] });
  });
});

describe('assertChannelsStarted', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never throws — it must not be able to take the boot down', () => {
    // No adapters were ever registered in this test process, so the real
    // registry is empty and the call is a no-op. The contract under test is
    // that it returns normally.
    expect(() => assertChannelsStarted()).not.toThrow();
  });
});
