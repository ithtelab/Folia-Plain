import React from 'react';
import { useSettingsKitTheme } from '../../modal/settings/kit/kitTheme';
import LiquidGlassSurface from './LiquidGlassSurface';

// Shared windows and control groups keep their original host fill when the material switch is off.
export default function AdaptiveGlassSurface({ isDaylight, radius = 16 }: { isDaylight?: boolean; radius?: number }) {
    const inherited = useSettingsKitTheme();
    return <LiquidGlassSurface isDaylight={isDaylight ?? inherited.isDaylight} radius={radius} legacy="surface" interactive={false} flow="none" />;
}
