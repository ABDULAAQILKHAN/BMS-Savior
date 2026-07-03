import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { State as BluetoothState } from 'react-native-ble-plx';

interface Props {
  permissionsGranted: boolean;
  bluetoothState: BluetoothState | null;
  onRequestPermissions: () => void;
}

export function PermissionBanner({ permissionsGranted, bluetoothState, onRequestPermissions }: Props) {
  if (permissionsGranted && (bluetoothState === null || bluetoothState === 'PoweredOn')) {
    return null;
  }

  if (!permissionsGranted) {
    return (
      <View style={styles.banner}>
        <Text style={styles.text}>
          {Platform.OS === 'android'
            ? 'Bluetooth and location permissions are required to scan for your BMS.'
            : 'Bluetooth permission is required to connect to your BMS.'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onRequestPermissions}>
          <Text style={styles.buttonText}>Grant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (bluetoothState && bluetoothState !== 'PoweredOn') {
    return (
      <View style={styles.banner}>
        <Text style={styles.text}>Bluetooth is off. Turn it on to connect to your BMS.</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(1),
  },
  text: {
    color: '#1A1400',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#1A1400',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: 6,
  },
  buttonText: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 13,
  },
});
