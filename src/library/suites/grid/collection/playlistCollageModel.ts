import type { SongResult } from '../../../../types';
import { buildLatticeTiles, type LatticeTile } from '../../../../components/app/lattice/latticeModel';

// Give repeated playlist entries their own seats without changing the playlist or the play queue.
export const buildPlaylistCollageTiles = (tracks: SongResult[]): LatticeTile[] => {
    const seen = new Map<string, number>();
    return buildLatticeTiles({ queue: tracks, currentSong: null }).map(tile => {
        const occurrence = seen.get(tile.id) ?? 0;
        seen.set(tile.id, occurrence + 1);
        return occurrence === 0 ? tile : { ...tile, id: `${tile.id}:occurrence:${occurrence}` };
    });
};
