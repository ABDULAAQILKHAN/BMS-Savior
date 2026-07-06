import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Device, State as BluetoothState } from 'react-native-ble-plx';
import { bleService } from '../ble/BleService';
import { PairedDeviceConnector } from '../ble/PairedDeviceConnector';
import {
  checkBlePermissions,
  requestBlePermissions,
  type PermissionCheckResult,
} from '../permissions/blePermissions';
import { activeBMSProtocol } from '../protocol';
import { appendActionLog, getActionLog } from '../storage/ActionLogStorage';
import {
  clearPairedDevice,
  getPairedDevice,
  savePairedDevice,
} from '../storage/PairingStorage';
import type {
  ActionLogEntry,
  BMSTelemetry,
  ConnectionStatus,
  DiscoveredDevice,
  PairedDevice,
  ToggleKind,
} from '../types/bms';
import type { GattServiceSummary } from '../types/gatt';

const TELEMETRY_POLL_MS = 3000;

interface BleContextValue {
  pairedDevice: PairedDevice | null;
  pairedDeviceLoaded: boolean;
  connectionStatus: ConnectionStatus;
  telemetry: BMSTelemetry | null;
  telemetryError: string | null;
  gattSummary: GattServiceSummary[] | null;
  gattSummaryError: string | null;
  permissions: PermissionCheckResult;
  bluetoothState: BluetoothState | null;
  actionLog: ActionLogEntry[];

  // Pairing flow
  isScanning: boolean;
  discoveredDevices: DiscoveredDevice[];
  startPairingScan: () => void;
  stopPairingScan: () => void;
  pairWithDevice: (device: DiscoveredDevice) => Promise<void>;
  forgetDevice: () => Promise<void>;

  // Control
  setDischarge: (enabled: boolean) => Promise<void>;
  setCharge: (enabled: boolean) => Promise<void>;

  // Permissions
  requestPermissions: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const BleContext = createContext<BleContextValue | null>(null);

export function BleProvider({ children }: { children: React.ReactNode }) {
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null);
  const [pairedDeviceLoaded, setPairedDeviceLoaded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('no_paired_device');
  const [telemetry, setTelemetry] = useState<BMSTelemetry | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [gattSummary, setGattSummary] = useState<GattServiceSummary[] | null>(null);
  const [gattSummaryError, setGattSummaryError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionCheckResult>({
    granted: false,
    missing: [],
  });
  const [bluetoothState, setBluetoothState] = useState<BluetoothState | null>(null);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);

  const connectorRef = useRef<PairedDeviceConnector | null>(null);
  const connectedDeviceRef = useRef<Device | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const telemetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPermissions = useCallback(async () => {
    const result = await checkBlePermissions();
    setPermissions(result);
  }, []);

  const requestPermissions = useCallback(async () => {
    const result = await requestBlePermissions();
    setPermissions(result);
  }, []);

  // Initial load: permissions, adapter state, paired device, action log.
  useEffect(() => {
    refreshPermissions();
    getActionLog().then(setActionLog);

    const stateSub = bleService.onAdapterStateChange(state => {
      setBluetoothState(state);
    });

    getPairedDevice().then(device => {
      setPairedDevice(device);
      setPairedDeviceLoaded(true);
      if (!device) {
        setConnectionStatus('no_paired_device');
      }
    });

    return () => {
      stateSub.remove();
    };
  }, [refreshPermissions]);

  const stopTelemetryPolling = useCallback(() => {
    if (telemetryTimerRef.current) {
      clearInterval(telemetryTimerRef.current);
      telemetryTimerRef.current = null;
    }
  }, []);

  const startTelemetryPolling = useCallback((device: Device) => {
    stopTelemetryPolling();

    const poll = async () => {
      try {
        const reading = await activeBMSProtocol.readTelemetry(device);
        setTelemetry(reading);
        setTelemetryError(null);
      } catch (error) {
        setTelemetryError(error instanceof Error ? error.message : String(error));
      }
    };

    poll();
    telemetryTimerRef.current = setInterval(poll, TELEMETRY_POLL_MS);
  }, [stopTelemetryPolling]);

  const stopConnector = useCallback(async () => {
    stopTelemetryPolling();
    setTelemetry(null);
    setGattSummary(null);
    setGattSummaryError(null);
    connectedDeviceRef.current = null;
    if (connectorRef.current) {
      await connectorRef.current.stop();
      connectorRef.current = null;
    }
  }, [stopTelemetryPolling]);

  const loadGattSummary = useCallback(async (device: Device) => {
    try {
      const summary = await bleService.describeDevice(device);
      setGattSummary(summary);
      setGattSummaryError(null);
    } catch (error) {
      setGattSummaryError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  // Drive the connect-to-paired-device lifecycle whenever we have a paired
  // device, permissions are granted, and Bluetooth is powered on. Never
  // connects to anything else.
  useEffect(() => {
    if (!pairedDeviceLoaded) return;

    if (!pairedDevice) {
      setConnectionStatus('no_paired_device');
      stopConnector();
      return;
    }

    if (!permissions.granted) {
      setConnectionStatus('permissions_required');
      stopConnector();
      return;
    }

    if (bluetoothState !== null && bluetoothState !== 'PoweredOn') {
      setConnectionStatus('bluetooth_off');
      stopConnector();
      return;
    }

    if (bluetoothState === null) {
      // Adapter state not yet known; wait for onAdapterStateChange.
      return;
    }

    if (connectorRef.current) {
      // Already running for this device.
      return;
    }

    const connector = new PairedDeviceConnector(
      pairedDevice.id,
      status => setConnectionStatus(status),
      device => {
        connectedDeviceRef.current = device;
        if (device) {
          startTelemetryPolling(device);
          loadGattSummary(device);
        } else {
          stopTelemetryPolling();
          setTelemetry(null);
          setGattSummary(null);
          setGattSummaryError(null);
        }
      },
    );
    connectorRef.current = connector;
    connector.start();

    return () => {
      // Only torn down on dependency change / unmount, not on every render.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairedDeviceLoaded, pairedDevice, permissions.granted, bluetoothState]);

  useEffect(() => {
    return () => {
      stopConnector();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPairingScan = useCallback(() => {
    setDiscoveredDevices([]);
    setIsScanning(true);
    const stop = bleService.startPairingScan(
      device => {
        const discovered = bleService.toDiscoveredDevice(device);
        setDiscoveredDevices(prev => {
          const idx = prev.findIndex(d => d.id === discovered.id);
          if (idx === -1) return [...prev, discovered];
          const next = [...prev];
          next[idx] = discovered;
          return next;
        });
      },
      () => setIsScanning(false),
    );
    stopScanRef.current = stop;
  }, []);

  const stopPairingScan = useCallback(() => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    setIsScanning(false);
  }, []);

  const pairWithDevice = useCallback(
    async (device: DiscoveredDevice) => {
      stopPairingScan();
      const paired: PairedDevice = { id: device.id, name: device.name };
      await savePairedDevice(paired);
      setPairedDevice(paired);
    },
    [stopPairingScan],
  );

  const forgetDevice = useCallback(async () => {
    await stopConnector();
    await clearPairedDevice();
    setPairedDevice(null);
    setConnectionStatus('no_paired_device');
  }, [stopConnector]);

  const logToggle = useCallback(async (kind: ToggleKind, value: boolean) => {
    const updated = await appendActionLog(kind, value);
    setActionLog(updated);
  }, []);

  const setDischarge = useCallback(
    async (enabled: boolean) => {
      const device = connectedDeviceRef.current;
      if (!device) throw new Error('Not connected to the paired BMS.');
      await activeBMSProtocol.setDischarge(device, enabled);
      await logToggle('discharge', enabled);
    },
    [logToggle],
  );

  const setCharge = useCallback(
    async (enabled: boolean) => {
      const device = connectedDeviceRef.current;
      if (!device) throw new Error('Not connected to the paired BMS.');
      await activeBMSProtocol.setCharge(device, enabled);
      await logToggle('charge', enabled);
    },
    [logToggle],
  );

  const value: BleContextValue = {
    pairedDevice,
    pairedDeviceLoaded,
    connectionStatus,
    telemetry,
    telemetryError,
    gattSummary,
    gattSummaryError,
    permissions,
    bluetoothState,
    actionLog,
    isScanning,
    discoveredDevices,
    startPairingScan,
    stopPairingScan,
    pairWithDevice,
    forgetDevice,
    setDischarge,
    setCharge,
    requestPermissions,
    refreshPermissions,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
}

export function useBle(): BleContextValue {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error('useBle must be used within a BleProvider');
  return ctx;
}
