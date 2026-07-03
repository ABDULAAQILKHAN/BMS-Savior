import type { BMSProtocol } from './BMSProtocol';
import { GenericBMSProtocol } from './GenericBMSProtocol';

export type { BMSProtocol } from './BMSProtocol';
export { BaseBMSProtocol } from './BaseBMSProtocol';
export { GenericBMSProtocol } from './GenericBMSProtocol';

/**
 * Single place the rest of the app imports the active BMS protocol from.
 * Swap this for your real implementation once it's ready — nothing else
 * needs to change.
 */
export const activeBMSProtocol: BMSProtocol = new GenericBMSProtocol();
