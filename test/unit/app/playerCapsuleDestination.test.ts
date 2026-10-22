import { describe, expect, it, vi } from 'vitest';
import { buildAppOverlaysModel } from '../../../src/components/app/overlays/buildAppOverlaysModel';
import type { SongResult } from '../../../src/types';

// The explicit bottom-bar shortcut must not reuse the configurable play-entry destination.
describe('bottom player destination', () => {
    it.each(['home', 'lattice', 'player'] as const)('opens lyrics from %s regardless of the entry preference', currentView => {
        const song: SongResult = { id: 1, name: 'Song', artists: [], album: { id: 1, name: 'Album' }, durationMs: 180000 };
        const openPlayer = vi.fn();
        const openPreferredView = vi.fn();
        const model = buildAppOverlaysModel({ currentView, currentSong: song, playQueue: [song], theme: {},
            navigateToPlayer: openPlayer, navigateFromPlayerCapsule: openPreferredView,
        } as unknown as Parameters<typeof buildAppOverlaysModel>[0]);
        model.floatingControls!.onNavigateToPlayer();
        expect(openPlayer).toHaveBeenCalledOnce();
        expect(openPreferredView).not.toHaveBeenCalled();
    });
});
