import { describe, expect, it } from 'vitest';
import type { SongResult } from '../../../src/types';
import { buildPlaylistCollageTiles } from '../../../src/library/suites/grid/collection/playlistCollageModel';

// Repeated songs must remain separate playlist entries, without changing playback order or inputs.
const song = (id: number): SongResult => ({
    id, name: `Song ${id}`, artists: [{ id: 1, name: 'Artist' }],
    album: { id: 2, name: 'Album' }, durationMs: 180000,
});

describe('playlist collage entries', () => {
    it('keeps repeats in order with independent seats and never marks a queue playhead', () => {
        const first = song(1);
        const second = song(2);
        const tracks = [first, second, first, first];
        const tiles = buildPlaylistCollageTiles(tracks);
        expect(new Set(tiles.map(tile => tile.id)).size).toBe(4);
        expect(tiles.map(tile => tile.kind === 'song' ? tile.song : null)).toEqual(tracks);
        expect(tiles.map(tile => tile.queueIndex)).toEqual([0, 1, 2, 3]);
        expect(tiles.every(tile => tile.section === 'upcoming')).toBe(true);
        expect(tracks).toEqual([first, second, first, first]);
        expect(buildPlaylistCollageTiles(tracks).map(tile => tile.id)).toEqual(tiles.map(tile => tile.id));
    });
    it('accepts an empty playlist', () => {
        expect(buildPlaylistCollageTiles([])).toEqual([]);
    });
});
