import { create } from 'zustand';
import i18n from '../i18n/config';
import { setStatusMessage } from './useStatusMessageStore';

// Main-process settings own the saved GPU preference; this store mirrors acknowledged IPC results.
type GraphicsSettings = {
    gpuHardwareAcceleration: boolean;
    gpuAtStart: boolean;
    gpuReady: boolean;
    gpuSaving: boolean;
    refreshGpuSettings: () => Promise<void>;
    setGpuHardwareAcceleration: (enabled: boolean) => Promise<boolean>;
};

export const useGraphicsSettingsStore = create<GraphicsSettings>((set) => ({
    gpuHardwareAcceleration: true,
    gpuAtStart: true,
    gpuReady: false,
    gpuSaving: false,
    refreshGpuSettings: async () => {
        if (!window.electron?.getSettings) return;
        try {
            const settings = await window.electron.getSettings();
            set({ gpuHardwareAcceleration: settings.GPU_HARDWARE_ACCELERATION !== false,
                gpuAtStart: settings.GPU_HARDWARE_ACCELERATION_AT_START !== false, gpuReady: true });
        } catch (error) {
            console.warn('[Graphics] Could not read GPU preference', error);
        }
    },
    setGpuHardwareAcceleration: async enabled => {
        if (!window.electron?.saveSettings) return false;
        set({ gpuSaving: true });
        try {
            const settings = await window.electron.saveSettings('GPU_HARDWARE_ACCELERATION', enabled);
            if (settings?.GPU_HARDWARE_ACCELERATION !== enabled) throw new Error('GPU preference was not acknowledged');
            set({ gpuHardwareAcceleration: enabled, gpuAtStart: settings.GPU_HARDWARE_ACCELERATION_AT_START !== false, gpuReady: true });
            setStatusMessage({ type: 'info', text: i18n.t('notifications.gpuRestartRequired') });
            return true;
        } catch (error) {
            console.warn('[Graphics] Could not save GPU preference', error);
            setStatusMessage({ type: 'error', text: i18n.t('notifications.gpuSettingFailed') });
            return false;
        } finally {
            set({ gpuSaving: false });
        }
    },
}));
