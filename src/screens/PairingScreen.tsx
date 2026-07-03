import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DeviceListItem } from '../components/DeviceListItem';
import { PermissionBanner } from '../components/PermissionBanner';
import { useBle } from '../context/BleContext';
import { colors, spacing } from '../theme';
import type { DiscoveredDevice } from '../types/bms';
import { isLikelyConsumerDevice } from '../utils/bmsHeuristics';

// Reused for both the first-time "Pairing" route and the "RePair" modal route
// (see RootNavigator) — it doesn't need navigation props because pairing/
// unpairing swaps the whole screen set out from under it automatically.
export function PairingScreen() {
  const {
    isScanning,
    discoveredDevices,
    startPairingScan,
    stopPairingScan,
    pairWithDevice,
    permissions,
    bluetoothState,
    requestPermissions,
  } = useBle();

  const [showAllDevices, setShowAllDevices] = useState(false);

  useEffect(() => {
    return () => {
      stopPairingScan();
    };
  }, [stopPairingScan]);

  const canScan = permissions.granted && (bluetoothState === null || bluetoothState === 'PoweredOn');

  const handleSelect = async (device: DiscoveredDevice) => {
    stopPairingScan();
    await pairWithDevice(device);
    // RootNavigator switches to the Dashboard/Settings screen set as soon as
    // pairedDevice is set — no manual navigation needed here.
  };

  const sorted = [...discoveredDevices].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
  const filtered = showAllDevices ? sorted : sorted.filter(d => !isLikelyConsumerDevice(d));
  const hiddenCount = sorted.length - filtered.length;

  return (
    <View style={styles.container}>
      <PermissionBanner
        permissionsGranted={permissions.granted}
        bluetoothState={bluetoothState}
        onRequestPermissions={requestPermissions}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Pair your BMS</Text>
        <Text style={styles.subtitle}>
          Stand near your e-bike or rickshaw battery and scan. Pick the device with the
          strongest signal to confirm it's the one physically in front of you — the app will
          only ever auto-connect to whichever device you choose here.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.scanButton, (!canScan || isScanning) && styles.scanButtonDisabled]}
        onPress={isScanning ? stopPairingScan : startPairingScan}
        disabled={!canScan}
      >
        {isScanning ? <ActivityIndicator color={colors.background} /> : null}
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Stop scanning' : 'Scan for nearby devices'}
        </Text>
      </TouchableOpacity>

      {hiddenCount > 0 || showAllDevices ? (
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowAllDevices(prev => !prev)}
        >
          <Text style={styles.filterToggleText}>
            {showAllDevices
              ? 'Showing all nearby devices — tap to hide likely non-battery devices'
              : `Hiding ${hiddenCount} likely non-battery device${hiddenCount === 1 ? '' : 's'} — tap to show all`}
          </Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DeviceListItem device={item} onPress={() => handleSelect(item)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isScanning
              ? 'Scanning… nearby BLE devices will appear here.'
              : sorted.length > 0
                ? 'All nearby devices look like non-battery devices. Tap above to show them anyway.'
                : 'No devices yet. Tap "Scan for nearby devices" to begin.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing(1),
    lineHeight: 18,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    marginHorizontal: spacing(2.5),
    marginTop: spacing(2.5),
    paddingVertical: spacing(1.5),
    borderRadius: 10,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    color: colors.background,
    fontWeight: '800',
    fontSize: 15,
  },
  filterToggle: {
    marginHorizontal: spacing(2.5),
    marginTop: spacing(2),
  },
  filterToggleText: {
    color: colors.info,
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    padding: spacing(2.5),
    flexGrow: 1,
  },
  empty: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing(4),
    fontSize: 13,
    paddingHorizontal: spacing(2),
  },
});
