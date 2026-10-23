import { BarChart3, Clapperboard, Mic2, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// src/components/modal/newFeaturesRelease.ts

type NewFeatureCard = {
    id: string;
    icon: LucideIcon;
};

type NewFeaturesRelease = {
    i18nKey: string;
    /** 重大更新：介绍上方显示「<代号> Update · 重大更新」标签；代号不翻译，文案在 help.majorUpdateLabel。 */
    majorUpdate?: { codename: string };
    features: NewFeatureCard[];
};

// Defines the current Folia Plain release and its localized feature cards.
export const NEW_FEATURES_RELEASE: NewFeaturesRelease = {
    i18nKey: 'releaseNotes.v0_8_0',
    // What v0.8.0 changed. The cards are the things a listener can notice without being told where
    // to look; the release notes carry the rest (playback races, lyric clocks, the macOS wallpaper
    // guard, the remote window's text backing). `test/unit/newFeaturesRelease.test.ts` refuses a
    // card id another release already used, and requires this list to match the v0_8_0 block in
    // every locale exactly.
    features: [
        { id: 'sodaPlatform', icon: Mic2 },
        { id: 'hanabi', icon: Clapperboard },
        { id: 'listeningReport', icon: BarChart3 },
        { id: 'exploreOwn', icon: Sparkles },
    ],
};
