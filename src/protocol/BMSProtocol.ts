import type { Device } from 'react-native-ble-plx';
import type { BMSTelemetry } from '../types/bms';

/**
 * Abstraction over a specific BMS chipset's GATT protocol.
 *
 * The BLE layer (src/ble) only ever talks to a device through this interface —
 * it never encodes/decodes command bytes itself. To support a real BMS, write a
 * class that implements this interface (see GenericBMSProtocol.ts for a
 * scaffold) with the manufacturer's actual service/characteristic UUIDs and
 * command byte sequences, then pass an instance of it to BleService.
 */
export interface BMSProtocol {
  /** Human readable name, used in logs/UI (e.g. "JBD/Xiaoxiang BMS"). */
  readonly name: string;

  /**
   * GATT service UUID(s) this protocol expects the device to advertise or
   * expose. Used to identify compatible devices during scanning. Leave empty
   * to accept any device (useful for the generic pairing scan).
   */
  readonly serviceUUIDs: string[];

  /**
   * Read a full telemetry snapshot (SOC, voltage, current, temperature,
   * cycle count, per-cell voltages, etc.) from the connected device.
   */
  readTelemetry(device: Device): Promise<BMSTelemetry>;

  /** Enable or disable the discharge (output) MOSFET. */
  setDischarge(device: Device, enabled: boolean): Promise<void>;

  /** Enable or disable the charge (input) MOSFET. */
  setCharge(device: Device, enabled: boolean): Promise<void>;
}
