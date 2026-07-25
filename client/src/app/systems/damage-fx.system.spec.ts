import { describe, expect, it } from 'vitest';
import { DamageFxSystem } from './damage-fx.system';
import type { ShipState } from './types';

function ship(partial: Partial<ShipState> = {}): ShipState {
  return {
    position: { x: 0, y: 0, z: 0 },
    heading: 0,
    speed: 0,
    heel: 0,
    pitch: 0,
    hullIntegrity: 1,
    sailIntegrity: 1,
    sinkProgress: 0,
    ...partial,
  };
}

describe('DamageFxSystem', () => {
  it('spawns explosion flash, blast, smoke, and debris shards', () => {
    const fx = new DamageFxSystem();
    const visuals = fx.spawnExplosion({ x: 1, y: 2, z: 3 }, 1.2, 'player');
    expect(visuals.some((v) => v.kind === 'explosion')).toBe(true);
    expect(visuals.some((v) => v.kind === 'smoke')).toBe(true);
    expect(visuals.filter((v) => v.kind === 'debris').length).toBeGreaterThan(3);
  });

  it('emits rupture when hull crosses integrity bands', () => {
    const fx = new DamageFxSystem();
    fx.syncShipStructure('ai-1', ship({ hullIntegrity: 1 }));
    const mid = fx.syncShipStructure('ai-1', ship({ hullIntegrity: 0.55 }));
    expect(mid.some((v) => v.kind === 'rupture')).toBe(true);

    const kill = fx.syncShipStructure('ai-1', ship({ hullIntegrity: 0, sinkProgress: 0.2 }));
    expect(kill.some((v) => v.kind === 'explosion')).toBe(true);
    expect(kill.some((v) => v.kind === 'rupture')).toBe(true);
  });

  it('integrates debris under gravity', () => {
    const fx = new DamageFxSystem();
    const [shard] = fx.spawnExplosion({ x: 0, y: 2, z: 0 }, 1).filter((v) => v.kind === 'debris');
    expect(shard).toBeTruthy();
    const next = fx.tickDebris([shard!], 0.16);
    expect(next[0]!.target.y).not.toBe(shard!.target.y);
    expect(next[0]!.velocity!.y).toBeLessThan(shard!.velocity!.y);
  });
});
