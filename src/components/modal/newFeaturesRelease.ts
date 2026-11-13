import { AppWindow, Clapperboard, Shapes, Sparkles, SquareDashed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// src/components/modal/newFeaturesRelease.ts

type NewFeatureCard = {
    id: string;
    icon: LucideIcon;
};

type NewFeaturesRelease = {
    i18nKey: string;
    /** 重大更新：介绍上方显示「<代号> Update · 重大更新」标签；代号不翻译，文案在 help.majorUpdateLabel。
     *  servicePack：同一重大更新的热修复版，标签改成「<代号> Update SP<n> · 重大更新」，文案在 help.servicePackLabel。 */
    majorUpdate?: { codename: string; servicePack?: number };
    features: NewFeatureCard[];
};

// Defines the current Folia Plain release and its localized feature cards.
export const NEW_FEATURES_RELEASE: NewFeaturesRelease = {
    i18nKey: 'releaseNotes.v0_8_1',
    // 0.8.1 is the release in which upstream 0.7.28's work actually reached listeners: the auto-open
    // version still said 0.7.28, so the intro never opened. The cards are upstream's work up front,
    // with the repairs this fork needed to make it land (see the release notes for the rest).
    features: [
        { id: 'scenes', icon: Clapperboard },
        { id: 'newLook', icon: Shapes },
        { id: 'windowControls', icon: AppWindow },
        { id: 'styleOptions', icon: Sparkles },
        { id: 'glassFixes', icon: SquareDashed },
    ],
};
