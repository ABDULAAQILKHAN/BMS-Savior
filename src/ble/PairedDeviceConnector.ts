import type { Device, Subscription } from 'react-native-ble-plx';
import { delay } from '../utils/delay';
import { bleService } from './BleService';

const CONNECT_ATTEMPT_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 4000;

type StatusCallback = (status: 'searching' | 'connecting' | 'connected' | 'error') => void;
type DeviceCallback = (device: Device | null) => void;

/**
 * Owns the "only ever talk to the paired device" lifecycle: try to connect,
 * and if it's unreachable or drops, keep quietly retrying against that same
 * device id only — never scans for or falls back to any other device.
 */
export class PairedDeviceConnector {
  private cancelled = false;
  private disconnectSub: Subscription | null = null;
  private currentDevice: Device | null = null;

  constructor(
    private readonly deviceId: string,
    private readonly onStatus: StatusCallback,
    private readonly onDevice: DeviceCallback,
  ) {}

  async start(): Promise<void> {
    this.cancelled = false;
    while (!this.cancelled) {
      this.onStatus('searching');
      try {
        const device = await bleService.connectToKnownDevice(this.deviceId, CONNECT_ATTEMPT_TIMEOUT_MS);
        if (this.cancelled) {
          await bleService.disconnectDevice(device.id).catch(() => {});
          return;
        }
        this.currentDevice = device;
        this.onStatus('connected');
        this.onDevice(device);
        this.watchForDisconnect(device);
        return;
      } catch {
        if (this.cancelled) return;
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  private watchForDisconnect(device: Device): void {
    this.disconnectSub = bleService.onDeviceDisconnected(device.id, () => {
      this.disconnectSub?.remove();
      this.disconnectSub = null;
      this.currentDevice = null;
      this.onDevice(null);
      if (!this.cancelled) {
        // Paired device dropped out of range or powered off — keep
        // searching for that same device, never anything else.
        this.start();
      }
    });
  }

  /** Stops retrying and disconnects if currently connected. Used on forget/unmount. */
  async stop(): Promise<void> {
    this.cancelled = true;
    this.disconnectSub?.remove();
    this.disconnectSub = null;
    bleService.stopScan();
    if (this.currentDevice) {
      await bleService.disconnectDevice(this.currentDevice.id).catch(() => {});
      this.currentDevice = null;
    }
  }
}
