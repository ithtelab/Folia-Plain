import { create } from 'zustand';

// src/components/app/backgroundThrottling/backgroundLyricHoldStore.ts
// Whether the lyric animation is held: 后台节流 is in force and the window is in the background.
// The playback bridge reads it every frame and stops moving the lyric clock and the audio bands;
// the visualizer model reads it to draw as if playback were paused.

type BackgroundLyricHoldState = {
    held: boolean;
};

export const useBackgroundLyricHoldStore = create<BackgroundLyricHoldState>(() => ({
    held: false,
}));

/** For the frame loop, which must not subscribe through React. */
export const isBackgroundLyricHeld = () => useBackgroundLyricHoldStore.getState().held;
