import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { DiscoveredDevice } from '../types/bms';

interface Props {
  device: DiscoveredDevice;
  onPress: () => void;
}

function signalLabel(rssi: number | null): { label: string; color: string } {
  if (rssi === null) return { label: 'Unknown', color: colors.textSecondary };
  if (rssi >= -60) return { label: 'Strong', color: colors.accent };
  if (rssi >= -80) return { label: 'Medium', color: colors.warning };
  return { label: 'Weak', color: colors.danger };
}

export function DeviceListItem({ device, onPress }: Props) {
  const signal = signalLabel(device.rssi);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={styles.id} numberOfLines={1}>
          {device.id}
        </Text>
      </View>
      <View style={styles.signalBlock}>
        <Text style={[styles.signalLabel, { color: signal.color }]}>{signal.label}</Text>
        <Text style={styles.rssi}>{device.rssi !== null ? `${device.rssi} dBm` : '--'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing(2),
    marginBottom: spacing(1.25),
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
    marginRight: spacing(1),
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  id: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  signalBlock: {
    alignItems: 'flex-end',
  },
  signalLabel: {
    fontWeight: '700',
    fontSize: 13,
  },
  rssi: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
