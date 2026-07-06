import React from 'react';
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBle } from '../context/BleContext';
import { colors, spacing } from '../theme';
import type { ActionLogEntry } from '../types/bms';
import type { GattCharacteristicSummary, GattServiceSummary } from '../types/gatt';

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString();
}

function describeEntry(entry: ActionLogEntry): string {
  const noun = entry.kind === 'discharge' ? 'Discharge output' : 'Charge input';
  return `${noun} turned ${entry.value ? 'ON' : 'OFF'}`;
}

function formatCharacteristicFlags(c: GattCharacteristicSummary): string {
  const flags: string[] = [];
  if (c.isReadable) flags.push('R');
  if (c.isWritableWithResponse) flags.push('W');
  if (c.isWritableWithoutResponse) flags.push('WNR');
  if (c.isNotifiable) flags.push('N');
  if (c.isIndicatable) flags.push('I');
  return flags.length ? flags.join(',') : 'none';
}

function formatGattSummary(summary: GattServiceSummary[]): string {
  return summary
    .map(service => {
      const chars = service.characteristics
        .map(c => `    ${c.uuid}  [${formatCharacteristicFlags(c)}]`)
        .join('\n');
      return `Service ${service.serviceUUID}\n${chars || '    (no characteristics)'}`;
    })
    .join('\n\n');
}

export function SettingsScreen() {
  const { pairedDevice, actionLog, forgetDevice, connectionStatus, gattSummary, gattSummaryError } =
    useBle();

  const handleForget = () => {
    Alert.alert(
      'Forget this device?',
      `You'll need to re-scan and pick a device again. Currently paired: ${
        pairedDevice?.name ?? 'none'
      }.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget & re-pair',
          style: 'destructive',
          // RootNavigator switches back to the Pairing screen automatically
          // once pairedDevice is cleared — no manual navigation needed here.
          onPress: () => forgetDevice(),
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paired device</Text>
        <View style={styles.card}>
          <Text style={styles.deviceName}>{pairedDevice?.name ?? 'None'}</Text>
          <Text style={styles.deviceId}>{pairedDevice?.id ?? '--'}</Text>
        </View>
        <TouchableOpacity style={styles.dangerButton} onPress={handleForget}>
          <Text style={styles.dangerButtonText}>Forget device / Re-pair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 5 actions</Text>
        <FlatList
          data={actionLog}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.logRow}>
              <Text style={styles.logText}>{describeEntry(item)}</Text>
              <Text style={styles.logTime}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No actions logged yet.</Text>}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostics — connected device's GATT table</Text>
        <Text style={styles.helperText}>
          Real service/characteristic UUIDs read from the connected device, for wiring up its
          BMSProtocol. Long-press to select and copy.
        </Text>
        {connectionStatus !== 'connected' ? (
          <Text style={styles.empty}>Connect to your BMS to see this.</Text>
        ) : gattSummaryError ? (
          <Text style={styles.empty}>Couldn't read services: {gattSummaryError}</Text>
        ) : gattSummary === null ? (
          <Text style={styles.empty}>Reading services…</Text>
        ) : gattSummary.length === 0 ? (
          <Text style={styles.empty}>No services found.</Text>
        ) : (
          <View style={styles.card}>
            <Text selectable style={styles.mono}>
              {formatGattSummary(gattSummary)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing(2.5),
  },
  section: {
    marginBottom: spacing(3),
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing(1.5),
    lineHeight: 17,
  },
  mono: {
    color: colors.textPrimary,
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing(1.5),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(1.5),
  },
  deviceName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  deviceId: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#2A0000',
    fontWeight: '800',
    fontSize: 14,
  },
  logRow: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing(1.5),
    marginBottom: spacing(1),
    borderWidth: 1,
    borderColor: colors.border,
  },
  logText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  logTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
