/**
 * A snapshot of what a connected device's GATT table actually looks like —
 * used purely for diagnostics when wiring up a new BMSProtocol
 * implementation, so UUIDs come from the real device instead of guesswork.
 */

export interface GattCharacteristicSummary {
  uuid: string;
  isReadable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
  isIndicatable: boolean;
}

export interface GattServiceSummary {
  serviceUUID: string;
  characteristics: GattCharacteristicSummary[];
}
