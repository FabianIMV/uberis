"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adbAsync = adbAsync;
exports.getAdbExecutableAsync = getAdbExecutableAsync;
exports.sanitizeAdbDeviceName = sanitizeAdbDeviceName;
exports.getAdbNameForDeviceIdAsync = getAdbNameForDeviceIdAsync;
exports.getRunningEmulatorsAsync = getRunningEmulatorsAsync;
exports.getFirstRunningEmulatorAsync = getFirstRunningEmulatorAsync;
exports.isEmulatorBootedAsync = isEmulatorBootedAsync;
exports.waitForEmulatorToBeBootedAsync = waitForEmulatorToBeBootedAsync;
const tslib_1 = require("tslib");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
const sdk_1 = require("./sdk");
const log_1 = tslib_1.__importDefault(require("../../log"));
const filter_1 = require("../../utils/expodash/filter");
const promise_1 = require("../../utils/promise");
const BEGINNING_OF_ADB_ERROR_MESSAGE = 'error: ';
async function adbAsync(...args) {
    const adbExecutable = await getAdbExecutableAsync();
    try {
        return await (0, spawn_async_1.default)(adbExecutable, args);
    }
    catch (error) {
        let errorMessage = (error.stderr || error.stdout || error.message).trim();
        if (errorMessage.startsWith(BEGINNING_OF_ADB_ERROR_MESSAGE)) {
            errorMessage = errorMessage.substring(BEGINNING_OF_ADB_ERROR_MESSAGE.length);
        }
        error.message = errorMessage;
        throw error;
    }
}
async function getAdbExecutableAsync() {
    const sdkRoot = await (0, sdk_1.getAndroidSdkRootAsync)();
    if (!sdkRoot) {
        log_1.default.debug('Failed to resolve the Android SDK path, falling back to global adb executable');
        return 'adb';
    }
    return path_1.default.join(sdkRoot, 'platform-tools/adb');
}
function sanitizeAdbDeviceName(deviceName) {
    return deviceName.trim().split(/[\r\n]+/)[0];
}
/**
 * Return the Emulator name for an emulator ID, this can be used to determine if an emulator is booted.
 *
 * @param devicePid a value like `emulator-5554` from `abd devices`
 */
async function getAdbNameForDeviceIdAsync(emulatorPid) {
    const { stdout } = await adbAsync('-s', emulatorPid, 'emu', 'avd', 'name');
    if (stdout.match(/could not connect to TCP port .*: Connection refused/)) {
        // Can also occur when the emulator does not exist.
        throw new Error(`Emulator not found: ${stdout}`);
    }
    return sanitizeAdbDeviceName(stdout) ?? null;
}
// TODO: This is very expensive for some operations.
async function getRunningEmulatorsAsync() {
    const { stdout } = await adbAsync('devices', '-l');
    const splitItems = stdout.trim().split(os_1.default.EOL);
    const attachedDevices = splitItems
        // First line is `"List of devices attached"`, remove it
        .slice(1, splitItems.length)
        .map(line => {
        // unauthorized: ['FA8251A00719', 'unauthorized', 'usb:338690048X', 'transport_id:5']
        // authorized: ['FA8251A00719', 'device', 'usb:336592896X', 'product:walleye', 'model:Pixel_2', 'device:walleye', 'transport_id:4']
        // emulator: ['emulator-5554', 'offline', 'transport_id:1']
        const [pid] = line.split(' ').filter(filter_1.truthy);
        const type = line.includes('emulator') ? 'emulator' : 'device';
        return { pid, type };
    })
        .filter(({ pid, type }) => !!pid && type === 'emulator');
    const devicePromises = attachedDevices.map(async ({ pid }) => {
        const name = (await getAdbNameForDeviceIdAsync(pid)) ?? '';
        return {
            pid,
            name,
        };
    });
    return await Promise.all(devicePromises);
}
async function getFirstRunningEmulatorAsync() {
    const emulators = await getRunningEmulatorsAsync();
    return emulators[0] ?? null;
}
/**
 * Returns true if emulator is booted
 *
 * @param emulatorPid
 */
async function isEmulatorBootedAsync(emulatorPid) {
    try {
        const { stdout } = await adbAsync('-s', emulatorPid, 'shell', 'getprop', 'sys.boot_completed');
        if (stdout.trim() === '1') {
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
async function waitForEmulatorToBeBootedAsync(maxWaitTimeMs, intervalMs) {
    log_1.default.newLine();
    log_1.default.log('Waiting for the Android emulator to start...');
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTimeMs) {
        const emulator = await getFirstRunningEmulatorAsync();
        if (emulator?.pid && (await isEmulatorBootedAsync(emulator.pid))) {
            return emulator;
        }
        await (0, promise_1.sleepAsync)(intervalMs);
    }
    throw new Error('Timed out waiting for the Android emulator to start.');
}
