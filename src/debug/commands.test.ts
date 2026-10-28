import { describe, expect, it } from 'vitest';
import { createDevCommands, runCommand } from './commands';
import type { DevSettings } from './devSettings';

const setup = () => {
  const settings: DevSettings = { floorTimeScale: 1 };
  return { settings, commands: createDevCommands(settings) };
};

describe('runCommand', () => {
  it('ignores empty input', () => {
    const { commands } = setup();
    expect(runCommand(commands, '   ')).toBe('');
  });

  it('reports unknown commands', () => {
    const { commands } = setup();
    expect(runCommand(commands, 'fly')).toMatch(/Unknown command 'fly'/);
  });

  it('is case-insensitive and tolerates extra spaces', () => {
    const { commands, settings } = setup();
    runCommand(commands, '  SPEED    3 ');
    expect(settings.floorTimeScale).toBe(3);
  });

  it('help lists every command', () => {
    const { commands } = setup();
    const text = runCommand(commands, 'help');
    for (const name of Object.keys(commands)) expect(text).toContain(name);
  });
});

describe('speed', () => {
  it('sets the floor time scale', () => {
    const { commands, settings } = setup();
    expect(runCommand(commands, 'speed 5')).toBe('Floor speed set to x5');
    expect(settings.floorTimeScale).toBe(5);
  });

  it('accepts decimals, e.g. slow motion', () => {
    const { commands, settings } = setup();
    runCommand(commands, 'speed 0.5');
    expect(settings.floorTimeScale).toBe(0.5);
  });

  it('shows the current speed with no argument', () => {
    const { commands } = setup();
    expect(runCommand(commands, 'speed')).toBe('Floor speed is x1');
  });

  it('rejects bad values and leaves the speed unchanged', () => {
    const { commands, settings } = setup();
    for (const bad of ['abc', '0', '-2', '50']) {
      expect(runCommand(commands, `speed ${bad}`)).toMatch(/must be a number/);
    }
    expect(settings.floorTimeScale).toBe(1);
  });
});
