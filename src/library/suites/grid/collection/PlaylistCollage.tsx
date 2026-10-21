import { useCallback, useMemo } from 'react';
import { Play, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SongResult } from '../../../../types';
import { isSongUnavailable } from '../../../../services/onlineMusic/songAvailability';
import PosterWall from '../../../../components/app/lattice/PosterWall';
import type { LatticeSongTile, LatticeTile } from '../../../../components/app/lattice/latticeModel';
import { buildPlaylistCollageTiles } from './playlistCollageModel';
import '../../../../components/wall/wall.css';
import '../../../../components/app/lattice/Lattice.css';
import '../../../../components/app/lattice/LatticeChrome.css';

// The playlist's own tracks in the queue wall's layout; browsing never writes to playback state.
type PlaylistCollageProps = {
    tracks: SongResult[];
    matchIndexes: number[] | null;
    contextTracks: SongResult[];
    isDaylight: boolean;
    pageKey?: string;
    onPlay?: (song: SongResult, tracks: SongResult[]) => void;
    onEnqueue?: (song: SongResult) => void;
    onBack: () => void;
};

const ignore = () => {};

export default function PlaylistCollage({ tracks, matchIndexes, contextTracks, isDaylight, pageKey, onPlay, onEnqueue, onBack }: PlaylistCollageProps) {
    const { t } = useTranslation();
    const tiles = useMemo(() => buildPlaylistCollageTiles(matchIndexes ? matchIndexes.map(index => tracks[index]) : tracks), [matchIndexes, tracks]);
    const play = useCallback((tile: LatticeTile) => {
        if (tile.kind === 'song' && !isSongUnavailable(tile.song)) onPlay?.(tile.song, contextTracks);
    }, [contextTracks, onPlay]);
    const renderControls = useCallback((tile: LatticeSongTile) => (
        <div className="lattice-chrome is-revealed" role="group" aria-label={t('home.latticePlaybackControls')}>
            <div className="lattice-chrome-transport">
                <button type="button" disabled={!onPlay || isSongUnavailable(tile.song)} onClick={() => play(tile)}
                    aria-label={t('player.play')} title={t('player.play')}>
                    <Play fill="currentColor" />
                </button>
                <button type="button" disabled={!onEnqueue || isSongUnavailable(tile.song)} onClick={() => onEnqueue?.(tile.song)}
                    aria-label={t('playlist.addToQueue')} title={t('playlist.addToQueue')}>
                    <Plus />
                </button>
            </div>
        </div>
    ), [onEnqueue, onPlay, play, t]);

    return (
        <div data-playlist-collage className={`lattice-root lattice-playlist-root ${isDaylight ? 'is-daylight' : ''}`}>
            <PosterWall tiles={tiles} currentSong={null} pageKey={pageKey} onPlay={play}
                onTogglePlayback={ignore} onSeek={ignore} onOpenPlayer={ignore} onBack={onBack}
                renderSongControls={renderControls} />
        </div>
    );
}
