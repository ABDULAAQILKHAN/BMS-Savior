import type { Device } from 'react-native-ble-plx';
import type { BMSTelemetry } from '../types/bms';
import { BaseBMSProtocol } from './BaseBMSProtocol';

/**
 * ============================================================================
 * PLACEHOLDER PROTOCOL — fill in with your BMS chipset's actual GATT details.
 * ============================================================================
 *
 * This class deliberately does NOT guess at command bytes or UUIDs. Nothing
 * in this file is confirmed to work with a real BMS. Once you have the
 * manufacturer's protocol doc (or bytes captured from reverse engineering,
 * e.g. via an Android BLE HCI snoop log), replace the TODOs below.
 *
 * Everything else in the app (BleService, screens, action log) talks to
 * whatever BMSProtocol you wire up in src/protocol/index.ts — no other file
 * needs to change.
 *
 * Typical structure for common BMS chipsets (JBD/Xiaoxiang, Daly, etc.) is:
 *  - one service UUID
 *  - one "write" characteristic you send a request/command frame to
 *  - one "notify" characteristic the BMS pushes the response frame on
 *  - fixed-format request frames (e.g. [0xDD, 0xA5, <reg>, 0x00, <checksum>, 0x77])
 *  - a response frame you parse for SOC/voltage/current/temps/cell voltages
 *  - separate command frames for MOSFET (charge/discharge) control
 *
 * Use BaseBMSProtocol's writeCommand / readValue / writeAndAwaitNotification
 * helpers once you know which pattern your chipset uses.
 */
export class GenericBMSProtocol extends BaseBMSProtocol {
  readonly name = 'Unconfigured BMS Protocol';

  // TODO: replace with your BMS's actual GATT service UUID(s).
  readonly serviceUUIDs: string[] = [];

  // TODO: replace with your BMS's write/notify characteristic UUIDs.
  private readonly writeCharacteristicUUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
  private readonly notifyCharacteristicUUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

  async readTelemetry(_device: Device): Promise<BMSTelemetry> {
    // TODO: send the manufacturer's "read basic info" command, parse the
    // response frame, and map it onto BMSTelemetry. Example shape once
    // implemented:
    //
    // const response = await this.writeAndAwaitNotification(
    //   device,
    //   this.serviceUUIDs[0],
    //   this.writeCharacteristicUUID,
    //   this.notifyCharacteristicUUID,
    //   [0xdd, 0xa5, 0x03, 0x00, 0xff, 0xfd, 0x77],
    // );
    // return parseTelemetryFrame(response);
    throw new Error(
      'GenericBMSProtocol.readTelemetry() is not implemented yet. ' +
        'Plug in your BMS command bytes in src/protocol/GenericBMSProtocol.ts.',
    );
  }

  async setDischarge(_device: Device, _enabled: boolean): Promise<void> {
    // TODO: send the manufacturer's discharge-MOSFET on/off command.
    throw new Error(
      'GenericBMSProtocol.setDischarge() is not implemented yet. ' +
        'Plug in your BMS command bytes in src/protocol/GenericBMSProtocol.ts.',
    );
  }

  async setCharge(_device: Device, _enabled: boolean): Promise<void> {
    // TODO: send the manufacturer's charge-MOSFET on/off command.
    throw new Error(
      'GenericBMSProtocol.setCharge() is not implemented yet. ' +
        'Plug in your BMS command bytes in src/protocol/GenericBMSProtocol.ts.',
    );
  }
}
