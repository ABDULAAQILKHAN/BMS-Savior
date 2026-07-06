import { BleManager, Device, State as BluetoothState, Subscription } from 'react-native-ble-plx';
import type { DiscoveredDevice } from '../types/bms';
import type { GattServiceSummary } from '../types/gatt';

/**
 * Thin wrapper around react-native-ble-plx's BleManager. Knows nothing about
 * pairing/reconnect policy or BMS command bytes — that lives in
 * BleContext and the BMSProtocol implementation, respectively. This class
 * only exposes primitive scan/connect/disconnect operations.
 */
export class BleService {
  readonly manager: BleManager;

  constructor() {
    this.manager = new BleManager();
  }

  destroy(): void {
    this.manager.destroy();
  }

  getAdapterState(): Promise<BluetoothState> {
    return this.manager.state();
  }

  onAdapterStateChange(callback: (state: BluetoothState) => void): Subscription {
    return this.manager.onStateChange(callback, true);
  }

  toDiscoveredDevice(device: Device): DiscoveredDevice {
    return {
      id: device.id,
      name: device.name ?? device.localName ?? 'Unnamed device',
      rssi: device.rssi,
      serviceUUIDs: device.serviceUUIDs ?? [],
    };
  }

  /**
   * Generic scan for the first-time pairing flow — deliberately unfiltered
   * so any nearby BMS-style (or other) BLE peripheral shows up, since we
   * don't know the target chipset's advertised service UUID ahead of time.
   * Returns a function that stops the scan.
   */
  startPairingScan(onDevice: (device: Device) => void, onError: (error: Error) => void): () => void {
    this.manager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
        onError(error);
        return;
      }
      if (device) {
        onDevice(device);
      }
    });
    return () => this.manager.stopDeviceScan();
  }

  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  /**
   * Connects directly to a known device id (MAC on Android, UUID on iOS).
   * Never scans for or connects to any other device. Throws if the device
   * isn't reachable within timeoutMs (e.g. currently out of range).
   */
  async connectToKnownDevice(deviceId: string, timeoutMs = 8000): Promise<Device> {
    const device = await this.manager.connectToDevice(deviceId, { timeout: timeoutMs });
    await device.discoverAllServicesAndCharacteristics();
    return device;
  }

  /**
   * Enumerates the real GATT services/characteristics a connected device
   * exposes. Used to discover the actual UUIDs a BMSProtocol implementation
   * needs, instead of guessing from general chipset knowledge — device.id
   * must already be connected with services discovered (e.g. via
   * connectToKnownDevice).
   */
  async describeDevice(device: Device): Promise<GattServiceSummary[]> {
    const services = await device.services();
    return Promise.all(
      services.map(async service => {
        const characteristics = await service.characteristics();
        return {
          serviceUUID: service.uuid,
          characteristics: characteristics.map(c => ({
            uuid: c.uuid,
            isReadable: c.isReadable,
            isWritableWithResponse: c.isWritableWithResponse,
            isWritableWithoutResponse: c.isWritableWithoutResponse,
            isNotifiable: c.isNotifiable,
            isIndicatable: c.isIndicatable,
          })),
        };
      }),
    );
  }

  async isDeviceConnected(deviceId: string): Promise<boolean> {
    try {
      return await this.manager.isDeviceConnected(deviceId);
    } catch {
      return false;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const connected = await this.isDeviceConnected(deviceId);
    if (connected) {
      await this.manager.cancelDeviceConnection(deviceId);
    }
  }

  onDeviceDisconnected(deviceId: string, callback: (error: Error | null) => void): Subscription {
    return this.manager.onDeviceDisconnected(deviceId, error => callback(error ?? null));
  }
}

export const bleService = new BleService();
