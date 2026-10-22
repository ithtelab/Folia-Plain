// Hardware acceleration is a startup preference; changing it never restarts the app implicitly.
const GPU_HARDWARE_ACCELERATION_KEY = 'GPU_HARDWARE_ACCELERATION';

function readHardwareAccelerationPreference(store) {
    const value = store.get(GPU_HARDWARE_ACCELERATION_KEY, true);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string' && /^(true|false)$/i.test(value.trim())) return value.trim().toLowerCase() === 'true';
    if (typeof value === 'number') return value !== 0;
    return true;
}

function configureHardwareAcceleration(app, store) {
    const enabled = readHardwareAccelerationPreference(store);
    if (!enabled) app.disableHardwareAcceleration();
    console.info(`[Graphics] Hardware acceleration preference at startup: ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
}

module.exports = { GPU_HARDWARE_ACCELERATION_KEY, readHardwareAccelerationPreference, configureHardwareAcceleration };
