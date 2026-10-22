import { describe, expect, it, vi } from 'vitest';

// Verify the saved preference is applied before app readiness and is on for existing installations.
const { configureHardwareAcceleration, readHardwareAccelerationPreference } = require('../../../electron/hardwareAcceleration.cjs');

describe('hardware acceleration startup preference', () => {
    it.each([undefined, true, 'true', 1])('keeps acceleration enabled for %s', value => {
        const app = { disableHardwareAcceleration: vi.fn() };
        const store = { get: () => value };
        expect(configureHardwareAcceleration(app, store)).toBe(true);
        expect(app.disableHardwareAcceleration).not.toHaveBeenCalled();
    });
    it.each([false, 'false', 0])('disables acceleration before startup for %s', value => {
        const app = { disableHardwareAcceleration: vi.fn() };
        expect(configureHardwareAcceleration(app, { get: () => value })).toBe(false);
        expect(app.disableHardwareAcceleration).toHaveBeenCalledOnce();
    });
    it('uses the same default for unknown saved values', () => {
        expect(readHardwareAccelerationPreference({ get: () => null })).toBe(true);
    });
});
