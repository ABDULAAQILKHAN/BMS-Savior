import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useBle } from '../context/BleContext';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PairingScreen } from '../screens/PairingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Pairing: undefined;
  Dashboard: undefined;
  Settings: undefined;
  RePair: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { pairedDevice, pairedDeviceLoaded } = useBle();

  if (!pairedDeviceLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {pairedDevice ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'MyBMS' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          {/* Distinct route name from the unpaired branch's "Pairing" screen below —
              reusing the same name here would make React Navigation preserve the
              active route across this children swap instead of resetting to
              Dashboard, leaving the user stuck on the re-pair modal after pairing. */}
          <Stack.Screen
            name="RePair"
            component={PairingScreen}
            options={{ title: 'Re-pair device', presentation: 'modal' }}
          />
        </>
      ) : (
        <Stack.Screen name="Pairing" component={PairingScreen} options={{ title: 'Pair your BMS' }} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
