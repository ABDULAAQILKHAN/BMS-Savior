import type { DiscoveredDevice } from '../types/bms';

/**
 * BLE has no "this is a BMS" flag, so this is a best-effort heuristic to hide
 * obvious non-battery devices (earbuds, watches, etc.) from the pairing scan
 * list. It only ever hides devices — callers should always offer a "show
 * all" escape hatch, since this can't be 100% correct across every BMS
 * chipset in the wild.
 *
 * Signals used:
 *  - Well-known consumer-only GATT service UUIDs (Battery Service, HID,
 *    Google Fast Pair, Heart Rate). Cheap serial-command BMS modules
 *    (the HM-10/JBD/Daly-style UART clones common in e-bike/rickshaw
 *    batteries) don't implement these standard consumer profiles.
 *  - Consumer-sounding device names (buds, watch, speaker, etc.).
 *
 * Deliberately NOT excluded: unnamed devices. Cheap BMS UART modules very
 * commonly don't advertise a GAP device name at all, unlike consumer
 * electronics which almost always do — so "no name" is a weak signal FOR a
 * BMS-like device, not against one.
 */

const CONSUMER_SERVICE_UUIDS = new Set([
  '180f', // Battery Service — used by earbuds/watches to show battery %, not a BMS signal
  '1812', // Human Interface Device (mice, keyboards, remotes)
  'fe2c', // Google Fast Pair Service
  '180d', // Heart Rate Service (fitness bands/watches)
]);

const CONSUMER_NAME_PATTERN =
  /\b(buds?|airpods?|earphones?|earbuds?|headphones?|headset|tws|speaker|soundbar|watch|smartband|band|mouse|keyboard|remote|glasses|ring|tracker|camera|printer|scale)\b/i;

function shortUUID(uuid: string): string {
  const lower = uuid.toLowerCase();
  // Full 128-bit UUIDs for SIG-assigned 16-bit services follow the pattern
  // 0000XXXX-0000-1000-8000-00805f9b34fb — pull out the 16-bit part.
  const match = lower.match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/);
  return match ? match[1] : lower;
}

export function isLikelyConsumerDevice(device: Pick<DiscoveredDevice, 'name' | 'serviceUUIDs'>): boolean {
  const hasConsumerService = device.serviceUUIDs.some(uuid => CONSUMER_SERVICE_UUIDS.has(shortUUID(uuid)));
  if (hasConsumerService) return true;

  return CONSUMER_NAME_PATTERN.test(device.name);
}
