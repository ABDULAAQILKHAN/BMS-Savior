import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PairedDevice } from '../types/bms';
import { STORAGE_KEYS } from './keys';

export async function getPairedDevice(): Promise<PairedDevice | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.pairedDevice);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PairedDevice;
  } catch {
    return null;
  }
}

export async function savePairedDevice(device: PairedDevice): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.pairedDevice, JSON.stringify(device));
}

export async function clearPairedDevice(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.pairedDevice);
}
