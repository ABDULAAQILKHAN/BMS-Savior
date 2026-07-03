import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBle } from '../context/BleContext';
import { colors, spacing } from '../theme';
import type { ActionLogEntry } from '../types/bms';

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString();
}

function describeEntry(entry: ActionLogEntry): string {
  const noun = entry.kind === 'discharge' ? 'Discharge output' : 'Charge input';
  return `${noun} turned ${entry.value ? 'ON' : 'OFF'}`;
}

export function SettingsScreen() {
  const { pairedDevice, actionLog, forgetDevice } = useBle();

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
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing(2.5),
  },
  section: {
    marginBottom: spacing(3),
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
