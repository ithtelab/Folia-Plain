import { useMemo, useState } from 'react';
import GridCollectionSurface from '../../src/library/suites/grid/collection/GridCollectionSurface';
import { createCollectionResourceState } from '../../src/library/core/collection/resource/collectionResourceState.service';
import type { CollectionResource } from '../../src/library/core/shared/resource.contract';
import type { SongResult } from '../../src/types';
import { useHomeLayoutSettingsStore } from '../../src/stores/useHomeLayoutSettingsStore';
import { useAppViewStore } from '../../src/stores/useAppViewStore';
import type { ProbeDefinition } from './definition';

// Real collection adapter with isolated tracks: switch views, filter, play and enqueue without an account.
const ignore = () => {};
const tracks: SongResult[] = Array.from({ length: 48 }, (_, index) => ({
    id: index, name: `Song ${String(index).padStart(2, '0')}`, durationMs: 180000,
    artists: [{ id: 1, name: 'Artist' }],
    sourceRef: { kind: 'online', providerId: 'netease', mediaId: String(index) },
    album: { id: index, name: 'Album', coverUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl(${index * 37},40%,40%)"/><circle cx="200" cy="165" r="95" fill="hsl(${index * 37 + 45},60%,65%)"/><text x="25" y="360" fill="white" font-size="48">Song ${String(index).padStart(2, '0')}</text></svg>`)}` },
}));

function Probe() {
    const [isDaylight, setIsDaylight] = useState(false);
    const [type, setType] = useState<'playlist' | 'album'>('playlist');
    const [action, setAction] = useState('none');
    const resource = useMemo((): CollectionResource => {
        const state = createCollectionResourceState('probe:playlist-collage', 'static', { status: 'ready', tracks });
        return {
            key: 'probe:playlist-collage', kind: 'static', getSnapshot: state.get, subscribe: state.subscribe,
            ensure: ignore, reload: ignore, resumeSync: ignore, pause: ignore, dispose: ignore,
            canReuse: () => true, removeTracks: async () => {}, removeAt: () => false,
            replaceTrackAt: () => false, replaceAll: async () => false,
        };
    }, []);
    return (
        <div style={{ position: 'absolute', inset: 0, background: isDaylight ? '#ede7df' : '#201d1b', color: isDaylight ? '#201d1b' : '#ede7df' }}>
            <div className="absolute left-20 top-3 z-[999] flex gap-3 bg-black/70 p-2 text-xs text-white">
                <button data-probe-collage onClick={() => useHomeLayoutSettingsStore.getState().setPlaylistViewStyle('lattice')}>Collage</button>
                <button data-probe-grid onClick={() => useHomeLayoutSettingsStore.getState().setPlaylistViewStyle('grid')}>Grid</button>
                <button data-probe-album onClick={() => setType(type === 'playlist' ? 'album' : 'playlist')}>{type}</button>
                <button data-probe-theme onClick={() => setIsDaylight(value => !value)}>Theme</button>
                <button data-probe-filter onClick={() => useAppViewStore.getState().commandFilter?.setQuery('Song 03')}>Filter 03</button>
                <button data-probe-unfilter onClick={() => useAppViewStore.getState().commandFilter?.setQuery('')}>Clear</button>
                <output data-probe-action>{action}</output>
            </div>
            <GridCollectionSurface collection={{ source: 'online', providerId: 'netease', type, id: 'collage', name: 'Playlist collage', trackCount: tracks.length }}
                resource={resource} mutations={null} localSongs={[]} isDaylight={isDaylight} isInteractive
                theme={{ primaryColor: '#cf8c60', secondaryColor: '#9a8fbb', accentColor: '#cf8c60' } as never}
                declaredActions={{ actions: ['play', 'enqueue', 'play-scope', 'enqueue-scope', 'filter'], extraActions: ['toggle-track-list'] }}
                playback={{ playTrack: (song, queue) => setAction(`play:${song.id}:${queue.length}`), playAll: ignore,
                    enqueueTrack: song => setAction(`enqueue:${song.id}`), enqueueAll: ignore }}
                onBack={() => setAction('back')} onDone={() => setAction('done')} onOpenAlbum={ignore} onOpenArtist={ignore} />
        </div>
    );
}

export default { id: 'playlistCollage', title: 'Playlist collage', description: 'Playlist view preference, filtering and independent play/enqueue actions.', Component: Probe } satisfies ProbeDefinition;
