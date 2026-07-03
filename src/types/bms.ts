/**
 * Domain types shared across the BLE layer, protocol layer, and UI.
 */

export interface CellVoltage {
  index: number;
  voltage: number; // volts
}

export interface BMSTelemetry {
  soc: number; // state of charge, percent 0-100
  voltage: number; // pack voltage, volts
  /** Amps. Positive = charging, negative = discharging. */
  current: number;
  /** Primary/average temperature reading, celsius. */
  temperature: number;
  /** All raw temperature sensor readings, celsius, if the BMS reports more than one. */
  temperatures?: number[];
  cycleCount: number;
  cellVoltages?: CellVoltage[];
  /** Reported MOSFET/output state, if the BMS exposes it. */
  dischargeEnabled?: boolean;
  chargeEnabled?: boolean;
  /** Date.now() when this sample was read. */
  timestamp: number;
}

export type ConnectionStatus =
  | 'no_paired_device' // first run, nothing saved yet -> Pairing screen
  | 'permissions_required' // BLE/location permissions missing
  | 'bluetooth_off' // adapter disabled
  | 'searching' // looking for the paired device specifically
  | 'connecting' // found it, GATT connect in progress
  | 'connected'
  | 'error';

export interface PairedDevice {
  id: string; // device identifier (MAC on Android, UUID on iOS)
  name: string;
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  rssi: number | null;
  /** GATT service UUIDs from the advertisement/scan response, if any were included. */
  serviceUUIDs: string[];
}

export type ToggleKind = 'discharge' | 'charge';

export interface ActionLogEntry {
  id: string;
  kind: ToggleKind;
  value: boolean; // true = turned on, false = turned off
  timestamp: number;
}
