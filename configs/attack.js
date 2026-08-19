/**
 * TEMPORARY shim — kept until Phase 2 migrates consumers to character configs.
 * Re-exports the base move set under the old name.
 */
import { BASE_ATTACKS } from './characters/base.js';

export const ATTACKS = BASE_ATTACKS;
