import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { ConnectionStatus, PairedDevice } from '../types/bms';

interface Props {
  status: ConnectionStatus;
  pairedDevice: PairedDevice | null;
}

const STATUS_META: Record<ConnectionStatus, { label: string; color: string }> = {
  no_paired_device: { label: 'No paired device', color: colors.textSecondary },
  permissions_required: { label: 'Permissions required', color: colors.warning },
  bluetooth_off: { label: 'Bluetooth off', color: colors.warning },
  searching: { label: 'Searching', color: colors.warning },
  connecting: { label: 'Connecting', color: colors.info },
  connected: { label: 'Connected', color: colors.accent },
  error: { label: 'Error', color: colors.danger },
};

export function ConnectionStatusBadge({ status, pairedDevice }: Props) {
  const meta = STATUS_META[status];
  const subtitle =
    status === 'searching' && pairedDevice
      ? `Searching for ${pairedDevice.name}…`
      : status === 'connected' && pairedDevice
        ? pairedDevice.name
        : null;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <View>
        <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
});
