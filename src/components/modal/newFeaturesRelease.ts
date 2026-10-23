import { Cpu, Headphones, Layers, Monitor } from 'lucide-react';
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
    i18nKey: 'releaseNotes.v0_7_25',
    // Only what this release actually changed. v0.7.25 shipped five commits after v0.7.24 - the
    // Windows GPU choice, background throttling, the sign-in persistence fix and the still home
    // navigation - and an earlier draft of this list repeated four cards from v0.7.24 and named a
    // macOS download feature that landed after the tag. `test/unit/newFeaturesRelease.test.ts`
    // now refuses a card id that another release already used.
    features: [
        { id: 'gpuPreference', icon: Cpu },
        { id: 'backgroundThrottling', icon: Monitor },
        { id: 'loginKept', icon: Headphones },
        { id: 'navStill', icon: Layers },
    ],
};
