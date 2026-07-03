import { PermissionsAndroid, Platform, type Permission } from 'react-native';

export interface PermissionCheckResult {
  granted: boolean;
  missing: string[];
}

/**
 * Android's runtime permission requirements for BLE scanning changed with
 * API 31 (Android 12): devices on API <= 30 need location permission for
 * scan results to be delivered at all; API 31+ devices need the new
 * BLUETOOTH_SCAN / BLUETOOTH_CONNECT runtime permissions instead (declared
 * with usesPermissionFlags="neverForLocation" in the manifest, so location
 * is not required there).
 */
function androidPermissionsForApiLevel(): Permission[] {
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  if (apiLevel >= 31) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
  }

  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

export async function checkBlePermissions(): Promise<PermissionCheckResult> {
  if (Platform.OS !== 'android') {
    // iOS handles Bluetooth authorization via the system prompt driven by
    // Info.plist usage descriptions; there's no separate runtime check here.
    return { granted: true, missing: [] };
  }

  const required = androidPermissionsForApiLevel();
  const results = await Promise.all(required.map(permission => PermissionsAndroid.check(permission)));
  const missing = required.filter((_permission, index) => !results[index]);

  return { granted: missing.length === 0, missing };
}

export async function requestBlePermissions(): Promise<PermissionCheckResult> {
  if (Platform.OS !== 'android') {
    return { granted: true, missing: [] };
  }

  const required = androidPermissionsForApiLevel();
  const results = await PermissionsAndroid.requestMultiple(required);

  const missing = required.filter(
    permission => results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );

  return { granted: missing.length === 0, missing };
}
