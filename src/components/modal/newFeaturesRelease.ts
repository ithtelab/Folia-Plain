import { ArrowUpRight, Cpu, Headphones, Layers, Monitor, Sparkles } from 'lucide-react';
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
    i18nKey: 'releaseNotes.v0_7_23',
    features: [
        { id: 'glassChoice', icon: Layers },
        { id: 'staticGlass', icon: Sparkles },
        { id: 'playerDestination', icon: ArrowUpRight },
        { id: 'gpuAcceleration', icon: Cpu },
        { id: 'platformPackages', icon: Monitor },
        { id: 'musicAccount', icon: Headphones },
    ],
};
