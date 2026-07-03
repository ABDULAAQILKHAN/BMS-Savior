import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConnectionStatusBadge } from '../components/ConnectionStatusBadge';
import { PermissionBanner } from '../components/PermissionBanner';
import { TelemetryCard } from '../components/TelemetryCard';
import { ToggleRow } from '../components/ToggleRow';
import { useBle } from '../context/BleContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const {
    pairedDevice,
    connectionStatus,
    telemetry,
    telemetryError,
    permissions,
    bluetoothState,
    requestPermissions,
    setDischarge,
    setCharge,
  } = useBle();

  const [dischargeOn, setDischargeOn] = useState(true);
  const [chargeOn, setChargeOn] = useState(true);
  const [dischargeBusy, setDischargeBusy] = useState(false);
  const [chargeBusy, setChargeBusy] = useState(false);

  const connected = connectionStatus === 'connected';

  React.useEffect(() => {
    if (telemetry?.dischargeEnabled !== undefined) setDischargeOn(telemetry.dischargeEnabled);
    if (telemetry?.chargeEnabled !== undefined) setChargeOn(telemetry.chargeEnabled);
  }, [telemetry?.dischargeEnabled, telemetry?.chargeEnabled]);

  const confirmToggle = (
    kind: 'discharge' | 'charge',
    nextValue: boolean,
    apply: () => Promise<void>,
  ) => {
    const action = nextValue ? 'Turn on' : 'Turn off';
    const noun = kind === 'discharge' ? 'discharge output' : 'charge input';
    const warning =
      kind === 'discharge' && !nextValue
        ? ' This will cut power to your vehicle.'
        : kind === 'charge' && !nextValue
          ? ' Your charger will stop charging the battery.'
          : '';

    Alert.alert(`${action} ${noun}?`, `Are you sure?${warning}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: nextValue ? 'default' : 'destructive',
        onPress: () => {
          apply().catch(error => {
            Alert.alert('Command failed', error instanceof Error ? error.message : String(error));
          });
        },
      },
    ]);
  };

  const handleDischargeChange = (value: boolean) => {
    confirmToggle('discharge', value, async () => {
      setDischargeBusy(true);
      try {
        await setDischarge(value);
        setDischargeOn(value);
      } finally {
        setDischargeBusy(false);
      }
    });
  };

  const handleChargeChange = (value: boolean) => {
    confirmToggle('charge', value, async () => {
      setChargeBusy(true);
      try {
        await setCharge(value);
        setChargeOn(value);
      } finally {
        setChargeBusy(false);
      }
    });
  };

  return (
    <View style={styles.container}>
      <PermissionBanner
        permissionsGranted={permissions.granted}
        bluetoothState={bluetoothState}
        onRequestPermissions={requestPermissions}
      />

      <View style={styles.header}>
        <ConnectionStatusBadge status={connectionStatus} pairedDevice={pairedDevice} />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsLink}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!connected ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {connectionStatus === 'searching' && pairedDevice
                ? `Searching for ${pairedDevice.name}. Make sure the battery is powered on and nearby.`
                : connectionStatus === 'connecting'
                  ? 'Connecting…'
                  : connectionStatus === 'bluetooth_off'
                    ? 'Turn on Bluetooth to connect.'
                    : connectionStatus === 'permissions_required'
                      ? 'Grant permissions above to connect.'
                      : 'Not connected.'}
            </Text>
          </View>
        ) : null}

        {telemetryError && connected ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Telemetry read failed: {telemetryError}</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          <TelemetryCard
            label="State of charge"
            value={telemetry ? telemetry.soc.toFixed(0) : '--'}
            unit="%"
            accentColor={colors.accent}
          />
          <TelemetryCard
            label="Voltage"
            value={telemetry ? telemetry.voltage.toFixed(2) : '--'}
            unit="V"
          />
          <TelemetryCard
            label="Current"
            value={telemetry ? telemetry.current.toFixed(2) : '--'}
            unit="A"
            accentColor={
              telemetry && telemetry.current > 0
                ? colors.accent
                : telemetry && telemetry.current < 0
                  ? colors.warning
                  : undefined
            }
          />
          <TelemetryCard
            label="Temperature"
            value={telemetry ? telemetry.temperature.toFixed(1) : '--'}
            unit="°C"
          />
          <TelemetryCard
            label="Cycle count"
            value={telemetry ? String(telemetry.cycleCount) : '--'}
          />
        </View>

        {telemetry?.cellVoltages?.length ? (
          <View style={styles.cellSection}>
            <Text style={styles.sectionTitle}>Cell voltages</Text>
            <View style={styles.grid}>
              {telemetry.cellVoltages.map(cell => (
                <TelemetryCard
                  key={cell.index}
                  label={`Cell ${cell.index + 1}`}
                  value={cell.voltage.toFixed(3)}
                  unit="V"
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Controls</Text>
          <ToggleRow
            label="Discharge output"
            description="Power delivered to the vehicle's motor/controller."
            value={dischargeOn}
            disabled={!connected}
            busy={dischargeBusy}
            onValueChange={handleDischargeChange}
          />
          <ToggleRow
            label="Charge input"
            description="Allows the charger to top up the battery."
            value={chargeOn}
            disabled={!connected}
            busy={chargeBusy}
            onValueChange={handleChargeChange}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
    paddingBottom: spacing(1.5),
  },
  settingsLink: {
    color: colors.info,
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: spacing(2.5),
    paddingTop: 0,
  },
  notice: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: spacing(1.5),
    marginBottom: spacing(2),
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cellSection: {
    marginTop: spacing(1),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing(1.5),
  },
  controlSection: {
    marginTop: spacing(1),
  },
});
