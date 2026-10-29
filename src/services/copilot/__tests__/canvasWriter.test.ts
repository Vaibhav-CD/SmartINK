import { describe, it, expect, vi } from 'vitest';
import {
  matchWriteup,
  extractWriteTopic,
  wrapLines,
  resolveWriteup,
} from '../canvasWriter';

describe('extractWriteTopic', () => {
  it('pulls topics out of write commands', () => {
    expect(extractWriteTopic("write Taylor's theorem on screen")).toBe(
      "Taylor's theorem"
    );
    expect(extractWriteTopic('please show quadratic formula')).toBe(
      'quadratic formula'
    );
    expect(extractWriteTopic('jot down primes')).toBe('primes');
  });

  it('returns null for non-write commands', () => {
    expect(extractWriteTopic('solve 2+2')).toBeNull();
    expect(extractWriteTopic('hello there')).toBeNull();
    expect(extractWriteTopic('write')).toBeNull();
  });
});

describe('matchWriteup', () => {
  it('matches bank topics case-insensitively', () => {
    expect(matchWriteup("Taylor's THEOREM")?.title).toBe("Taylor's Theorem");
    expect(matchWriteup('hypotenuse')?.title).toBe('Pythagorean Theorem');
    expect(matchWriteup('quadratic formula')?.lines.length).toBeGreaterThan(1);
  });

  it('returns null for unknown topics', () => {
    expect(matchWriteup('photosynthesis')).toBeNull();
  });
});

describe('wrapLines', () => {
  it('wraps long text within the character budget', () => {
    const lines = wrapLines(
      'The quick brown fox jumps over the lazy dog near the river bank',
      20
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(20);
    }
    expect(lines.join(' ')).toBe(
      'The quick brown fox jumps over the lazy dog near the river bank'
    );
  });
});

describe('resolveWriteup', () => {
  it('prefers the offline bank without calling the cloud', async () => {
    const cloud = vi.fn();
    const writeup = await resolveWriteup('taylor series', cloud);
    expect(writeup?.title).toBe("Taylor's Theorem");
    expect(cloud).not.toHaveBeenCalled();
  });

  it('wraps and caps cloud answers for unknown topics', async () => {
    const cloud = vi.fn(async () => ({
      title: 'Gravity',
      answer:
        'Gravity is a force that attracts two bodies toward each other. It gives weight to physical objects.',
    }));
    const writeup = await resolveWriteup('gravity', cloud);
    expect(writeup?.title).toBe('Gravity');
    expect(writeup?.lines.length).toBeLessThanOrEqual(7);
    expect(cloud).toHaveBeenCalledTimes(1);
  });

  it('returns null when the cloud fails on unknown topics', async () => {
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await resolveWriteup('gravity', failing)).toBeNull();
  });
});
