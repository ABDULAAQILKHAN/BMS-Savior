import type { Device } from 'react-native-ble-plx';
import { base64ToBytes, bytesToBase64 } from '../utils/base64';
import type { BMSProtocol } from './BMSProtocol';

/**
 * Optional base class with small GATT read/write helpers shared by most BMS
 * protocols (base64 <-> byte array conversion, write-and-wait-for-notify).
 * Concrete protocol implementations are not required to extend this — it's
 * just here to avoid repeating boilerplate.
 */
export abstract class BaseBMSProtocol implements BMSProtocol {
  abstract readonly name: string;
  abstract readonly serviceUUIDs: string[];

  abstract readTelemetry(device: Device): ReturnType<BMSProtocol['readTelemetry']>;
  abstract setDischarge(device: Device, enabled: boolean): Promise<void>;
  abstract setCharge(device: Device, enabled: boolean): Promise<void>;

  protected bytesToBase64(bytes: number[] | Uint8Array): string {
    return bytesToBase64(bytes);
  }

  protected base64ToBytes(base64: string): Uint8Array {
    return base64ToBytes(base64);
  }

  /** Write a raw command to a characteristic (with response). */
  protected async writeCommand(
    device: Device,
    serviceUUID: string,
    characteristicUUID: string,
    bytes: number[] | Uint8Array,
  ): Promise<void> {
    await device.writeCharacteristicWithResponseForService(
      serviceUUID,
      characteristicUUID,
      this.bytesToBase64(bytes),
    );
  }

  /** One-shot read of a characteristic's current value. */
  protected async readValue(
    device: Device,
    serviceUUID: string,
    characteristicUUID: string,
  ): Promise<Uint8Array> {
    const characteristic = await device.readCharacteristicForService(
      serviceUUID,
      characteristicUUID,
    );
    if (!characteristic.value) {
      return new Uint8Array(0);
    }
    return this.base64ToBytes(characteristic.value);
  }

  /**
   * Many BMS chipsets respond to a command by pushing the answer via a
   * notify characteristic rather than returning it from a read. This writes
   * a command, subscribes to a notify characteristic, and resolves with the
   * first notified value (or rejects on timeout).
   */
  protected writeAndAwaitNotification(
    device: Device,
    serviceUUID: string,
    writeCharacteristicUUID: string,
    notifyCharacteristicUUID: string,
    commandBytes: number[] | Uint8Array,
    timeoutMs = 4000,
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        subscription.remove();
        reject(new Error(`Timed out waiting for ${notifyCharacteristicUUID} notification`));
      }, timeoutMs);

      const subscription = device.monitorCharacteristicForService(
        serviceUUID,
        notifyCharacteristicUUID,
        (error, characteristic) => {
          if (settled) return;
          if (error) {
            settled = true;
            clearTimeout(timeout);
            subscription.remove();
            reject(error);
            return;
          }
          if (!characteristic?.value) return;
          settled = true;
          clearTimeout(timeout);
          subscription.remove();
          resolve(this.base64ToBytes(characteristic.value));
        },
      );

      this.writeCommand(device, serviceUUID, writeCharacteristicUUID, commandBytes).catch(
        error => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          subscription.remove();
          reject(error);
        },
      );
    });
  }
}
