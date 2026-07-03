/**
 * Minimal base64 <-> byte array helpers. react-native-ble-plx exchanges
 * characteristic values as base64 strings; Hermes has no built-in Buffer or
 * atob/btoa, so we implement the small bit of encoding we need directly
 * rather than pull in a Node polyfill package.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: number[] | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let result = '';
  let i = 0;
  for (; i + 2 < arr.length; i += 3) {
    const chunk = (arr[i] << 16) | (arr[i + 1] << 8) | arr[i + 2];
    result +=
      CHARS[(chunk >> 18) & 0x3f] +
      CHARS[(chunk >> 12) & 0x3f] +
      CHARS[(chunk >> 6) & 0x3f] +
      CHARS[chunk & 0x3f];
  }
  const remaining = arr.length - i;
  if (remaining === 1) {
    const chunk = arr[i] << 16;
    result += CHARS[(chunk >> 18) & 0x3f] + CHARS[(chunk >> 12) & 0x3f] + '==';
  } else if (remaining === 2) {
    const chunk = (arr[i] << 16) | (arr[i + 1] << 8);
    result +=
      CHARS[(chunk >> 18) & 0x3f] + CHARS[(chunk >> 12) & 0x3f] + CHARS[(chunk >> 6) & 0x3f] + '=';
  }
  return result;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}
