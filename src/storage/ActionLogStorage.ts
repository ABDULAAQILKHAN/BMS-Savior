import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActionLogEntry, ToggleKind } from '../types/bms';
import { STORAGE_KEYS } from './keys';

const MAX_ENTRIES = 5;

export async function getActionLog(): Promise<ActionLogEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.actionLog);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ActionLogEntry[];
  } catch {
    return [];
  }
}

/** Records a toggle action, keeping only the most recent MAX_ENTRIES entries. */
export async function appendActionLog(
  kind: ToggleKind,
  value: boolean,
): Promise<ActionLogEntry[]> {
  const existing = await getActionLog();
  const entry: ActionLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    value,
    timestamp: Date.now(),
  };
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEYS.actionLog, JSON.stringify(updated));
  return updated;
}
