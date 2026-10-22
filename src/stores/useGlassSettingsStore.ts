import { create } from 'zustand';
import { getStoredBoolean, setStoredBoolean } from './storagePrimitives';

// Shared material preference; disabling it restores classic surfaces and releases optical resources.
const LIQUID_GLASS_ENABLED_KEY = 'liquid_glass_enabled';

export const useGlassSettingsStore = create<{
    liquidGlassEnabled: boolean;
    setLiquidGlassEnabled: (enabled: boolean) => void;
}>(set => ({
    liquidGlassEnabled: getStoredBoolean(LIQUID_GLASS_ENABLED_KEY, true),
    setLiquidGlassEnabled: enabled => {
        setStoredBoolean(LIQUID_GLASS_ENABLED_KEY, enabled);
        set({ liquidGlassEnabled: enabled });
    },
}));

const syncMaterial = () => {
    if (typeof document !== 'undefined') {
        document.documentElement.dataset.liquidGlass = useGlassSettingsStore.getState().liquidGlassEnabled ? 'on' : 'off';
    }
};
syncMaterial();
const unsubscribe = useGlassSettingsStore.subscribe(syncMaterial);
if (import.meta.hot) import.meta.hot.dispose(unsubscribe);
