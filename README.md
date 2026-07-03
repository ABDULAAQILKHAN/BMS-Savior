# MyBMS

A personal, general-purpose BLE scanner and control app for a lithium BMS (Battery
Management System) — built for monitoring/controlling the battery on an e-bike and
an electric rickshaw. It pairs with exactly one BLE device (chosen by you) and only
ever auto-connects to that device afterwards.

Stack: React Native + TypeScript, [`react-native-ble-plx`](https://github.com/dotintent/react-native-ble-plx)
for BLE, `@react-native-async-storage/async-storage` for local persistence,
`@react-navigation` for the Pairing/Dashboard/Settings screens.

## Project structure

```
App.tsx                        Root component (providers + navigation)
src/
  types/bms.ts                 Shared domain types (telemetry, connection status, etc.)
  protocol/
    BMSProtocol.ts             Interface: readTelemetry / setDischarge / setCharge
    BaseBMSProtocol.ts         Optional base class with GATT read/write/notify helpers
    GenericBMSProtocol.ts      <-- PLUG YOUR REAL BMS COMMAND BYTES IN HERE
    index.ts                   Exports `activeBMSProtocol` used by the rest of the app
  ble/
    BleService.ts              Thin wrapper over react-native-ble-plx's BleManager
    PairedDeviceConnector.ts   "Only ever reconnect to the paired device" state machine
  storage/
    PairingStorage.ts          Persists the paired device id/name
    ActionLogStorage.ts        Persists the last 5 charge/discharge toggle actions
  permissions/blePermissions.ts  Android runtime BLE/location permission handling
  context/BleContext.tsx       Central app state: permissions, connection, telemetry, actions
  navigation/RootNavigator.tsx Pairing vs. Dashboard/Settings/RePair screen switch
  screens/                     PairingScreen, DashboardScreen, SettingsScreen
  components/                  PermissionBanner, DeviceListItem, TelemetryCard, ToggleRow, ...
```

## Wiring up your real BMS

Nothing in this app guesses at your BMS's command bytes. Everything talks to the
device through the `BMSProtocol` interface (`src/protocol/BMSProtocol.ts`):

```ts
readTelemetry(device): Promise<BMSTelemetry>
setDischarge(device, enabled): Promise<void>
setCharge(device, enabled): Promise<void>
```

Once you have your chipset's protocol doc (or reverse-engineered bytes), implement
these in `src/protocol/GenericBMSProtocol.ts` (rename it if you like) using the
`writeCommand` / `readValue` / `writeAndAwaitNotification` helpers from
`BaseBMSProtocol`, then confirm `src/protocol/index.ts` still points
`activeBMSProtocol` at it. No other file needs to change — the BLE layer, screens,
and action log are all protocol-agnostic.

Until you do that, the app runs fine end-to-end (scanning, pairing, reconnect,
persistence) but telemetry reads / toggle commands will throw a clear
"not implemented" error, shown inline on the Dashboard.

## Prerequisites

- Node.js — the toolchain is pinned to `>= 22.11.0` in `package.json`. It also works
  with Node 20.x (tested during development) but you'll see an `EBADENGINE`
  warning from npm; upgrade if you hit odd issues.
- A real Android or iOS device is **strongly recommended** for testing. Emulators/
  simulators generally have no working Bluetooth radio, so BLE scanning will not
  find real devices there — you can only verify the UI shell on an emulator.
- Android: Android Studio + SDK (API 24+ / compileSdk 36), a device with **USB
  debugging enabled**.
- iOS (macOS only): Xcode + CocoaPods.

## Running locally

### 1. Install dependencies

```sh
npm install
```

### 2. Start Metro (the JS dev server)

```sh
npm start
```

Leave this running in its own terminal.

### 3. Android — run on a real device (recommended)

1. Enable Developer Options → USB debugging on your phone and plug it in via USB.
2. Confirm it shows up:
   ```sh
   adb devices
   ```
3. Build, install, and launch:
   ```sh
   npm run android
   ```
   If you have multiple devices/emulators attached, target yours explicitly:
   ```sh
   npx react-native run-android --deviceId=<id-from-adb-devices>
   ```

The app will request Bluetooth permission (Android 12+: `BLUETOOTH_SCAN` /
`BLUETOOTH_CONNECT`; Android 11 and below: location permission, which Android
requires for BLE scan results to be delivered at all). Grant it, then use "Scan
for nearby devices" on the Pairing screen — stand near your battery so its
advertisement is the strongest signal in the list.

### 3b. Android — emulator (UI-only smoke test)

```sh
npm run android
```

Works for checking screens/navigation render correctly, but scanning won't find
any real BMS since AVDs don't expose a Bluetooth radio.

### 4. iOS (macOS only)

```sh
bundle install          # first time only
bundle exec pod install --project-directory=ios
npm run ios
```

BLE works on physical iOS devices; the Simulator has no Bluetooth radio at all,
so use a real iPhone for anything BLE-related.

### Reloading / dev menu

- Android: press `R` twice, or `Ctrl+M` (Linux/Windows) / `Cmd+M` (macOS) for the
  dev menu.
- iOS: `Cmd+D` in the Simulator, or shake a physical device.

## Building an installable APK

For sideloading onto your own phone (the one that'll ride along and talk to the
battery), a **debug APK** is usually enough and doesn't require setting up
signing:

```sh
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Install it with:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

or copy the file to the phone and open it (allow "install unknown apps" for
whichever app you copy it with).

### Release APK (smaller, optimized, no dev menu)

1. Generate a signing key (first time only) and keep it somewhere safe — you'll
   need the same key for every future update:
   ```sh
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore mybms-release.keystore -alias mybms -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Reference it from `android/gradle.properties` (don't commit real passwords —
   use environment variables or `~/.gradle/gradle.properties` instead for
   anything beyond local personal use):
   ```properties
   MYBMS_UPLOAD_STORE_FILE=mybms-release.keystore
   MYBMS_UPLOAD_KEY_ALIAS=mybms
   MYBMS_UPLOAD_STORE_PASSWORD=********
   MYBMS_UPLOAD_KEY_PASSWORD=********
   ```
   and wire those properties into the `signingConfigs.release` block in
   `android/app/build.gradle` (by default the template ships with the debug
   keystore signing release builds too, which is fine for strictly personal use
   and lets you skip this step).
3. Build:
   ```sh
   cd android
   ./gradlew assembleRelease
   ```
   Output: `android/app/build/outputs/apk/release/app-release.apk`.
4. Install the same way as above with `adb install -r ...`.

## Notes / known quirks

- The project folder name contains a space (`BAT BMS`). This is fine for the JS/
  Metro/Gradle tooling used here, but some native build tools (older Xcode/CMake
  setups) dislike spaces in paths — if you hit obscure native build failures,
  moving the project to a space-free path is the first thing to try.
- `npm install` prints an `EBADENGINE` warning for Node — see Prerequisites above.
