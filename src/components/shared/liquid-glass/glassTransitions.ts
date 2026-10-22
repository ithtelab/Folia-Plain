import { useGlassSettingsStore } from '../../../stores/useGlassSettingsStore';
import { kitTransition, useKitReducedMotion } from '../../modal/settings/kit/motion';

// A damped arrival and selection spring in glass mode; classic and reduced motion keep the kit policy.
export function useGlassTransition(kind: 'move' | 'unfold' = 'move') {
    const enabled = useGlassSettingsStore(state => state.liquidGlassEnabled);
    const reduced = useKitReducedMotion();
    return enabled && !reduced
        ? { type: 'spring' as const, stiffness: kind === 'unfold' ? 340 : 440, damping: 36, mass: 0.9 }
        : kitTransition(kind, reduced);
}
