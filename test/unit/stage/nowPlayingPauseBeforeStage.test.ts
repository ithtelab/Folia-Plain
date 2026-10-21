// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStagePlaybackController } from '@/components/app/playback/useStagePlaybackController';
import { usePlaybackStore } from '@/stores/usePlaybackStore';
import { useStageSettingsStore } from '@/stores/useStageSettingsStore';

// Real hook and stores retain provider events while the stage UI has not been entered.
const provider = vi.hoisted(() => ({ pause: null as null | ((paused: boolean) => void), t: (key: string) => key }));
vi.mock('@/services/nowPlayingProvider', () => ({
    NowPlayingProvider: class {
        constructor(options: { onPauseState: (paused: boolean) => void }) { provider.pause = options.onPauseState; }
        start() {}
        stop() {}
    },
}));
vi.mock('@/services/db', () => ({
    getFromCache: vi.fn(async () => null),
    saveToCache: vi.fn(async () => {}),
    removeFromCache: vi.fn(async () => {}),
}));
vi.mock('react-i18next', async (importOriginal) => ({
    ...await importOriginal<typeof import('react-i18next')>(),
    useTranslation: () => ({ t: provider.t }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let controller: ReturnType<typeof useStagePlaybackController>;
let playback: ReturnType<typeof usePlaybackStore.getState>;
let settings: ReturnType<typeof useStageSettingsStore.getState>;
const args = {
    isDev: false,
    isElectronWindow: false,
    audioRef: { current: null },
    shouldAutoPlayRef: { current: false },
    pendingResumeTimeRef: { current: null },
    lastAudioRecoverySourceRef: { current: null },
    currentOnlineAudioUrlFetchedAtRef: { current: null },
    setLyrics() {},
    setIsLyricsLoading() {},
    navigateToPlayer() {},
};
const Probe = (_props: { revision: number }) => {
    controller = useStagePlaybackController(args);
    return null;
};

beforeEach(() => {
    playback = usePlaybackStore.getState();
    settings = useStageSettingsStore.getState();
    provider.pause = null;
    usePlaybackStore.setState({ activePlaybackContext: 'main', currentSong: null, playQueue: [] });
    useStageSettingsStore.setState({ enableNowPlayingStage: true, enablePlayerCapStage: false });
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
    act(() => root.render(createElement(Probe, { revision: 0 })));
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    usePlaybackStore.setState(playback, true);
    useStageSettingsStore.setState(settings, true);
    vi.restoreAllMocks();
});

describe('Now Playing pause state before stage entry', () => {
    it.each([false, true])('publishes the latest provider pause state (%s) after unrelated renders', async paused => {
        expect(provider.pause).not.toBeNull();
        act(() => { provider.pause!(false); provider.pause!(paused); });
        act(() => root.render(createElement(Probe, { revision: 1 })));
        await act(async () => { usePlaybackStore.setState({ activePlaybackContext: 'stage' }); });
        expect(controller.nowPlayingPaused).toBe(paused);
        expect(controller.isNowPlayingStageActive).toBe(true);
    });
});
