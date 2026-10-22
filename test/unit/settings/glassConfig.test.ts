import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressConfig, decompressConfig } from '../../../src/utils/appearanceCodec';
import { useGlassSettingsStore } from '../../../src/stores/useGlassSettingsStore';
import { useGraphicsSettingsStore } from '../../../src/stores/useGraphicsSettingsStore';

// Config codes preserve explicit false; GPU toggles only commit after the main process acknowledges them.
afterEach(() => {
    vi.unstubAllGlobals();
    useGlassSettingsStore.setState({ liquidGlassEnabled: true });
    useGraphicsSettingsStore.setState({ gpuHardwareAcceleration: true, gpuAtStart: true, gpuReady: false, gpuSaving: false });
});

describe('glass configuration', () => {
    it.each([true, false])('roundtrips %s in config codes and JSON', enabled => {
        expect(decompressConfig(compressConfig({ liquidGlassEnabled: enabled })).liquidGlassEnabled).toBe(enabled);
        expect(decompressConfig(JSON.stringify({ liquidGlassEnabled: enabled })).liquidGlassEnabled).toBe(enabled);
    });
    it('persists an explicit classic-material choice', () => {
        const setItem = vi.fn();
        vi.stubGlobal('window', {});
        vi.stubGlobal('localStorage', { setItem });
        useGlassSettingsStore.getState().setLiquidGlassEnabled(false);
        expect(setItem).toHaveBeenCalledWith('liquid_glass_enabled', 'false');
        expect(useGlassSettingsStore.getState().liquidGlassEnabled).toBe(false);
    });
});

describe('GPU preference IPC', () => {
    it('saves without changing the running startup preference', async () => {
        const saveSettings = vi.fn().mockResolvedValue({ GPU_HARDWARE_ACCELERATION: false, GPU_HARDWARE_ACCELERATION_AT_START: true });
        vi.stubGlobal('window', { electron: { saveSettings } });
        expect(await useGraphicsSettingsStore.getState().setGpuHardwareAcceleration(false)).toBe(true);
        expect(saveSettings).toHaveBeenCalledWith('GPU_HARDWARE_ACCELERATION', false);
        expect(useGraphicsSettingsStore.getState()).toMatchObject({ gpuHardwareAcceleration: false, gpuAtStart: true, gpuSaving: false });
    });
    it('keeps the previous value when saving fails', async () => {
        vi.stubGlobal('window', { electron: { saveSettings: vi.fn().mockRejectedValue(new Error('disk write failed')) } });
        expect(await useGraphicsSettingsStore.getState().setGpuHardwareAcceleration(false)).toBe(false);
        expect(useGraphicsSettingsStore.getState()).toMatchObject({ gpuHardwareAcceleration: true, gpuSaving: false });
    });
});
