import type { Database } from '../../types/database';

/** Husstandens svar på én vare. En vare uten rad mangler. Se docs/DATABASE.md §1. */
export type PreparednessRow = Database['public']['Tables']['preparedness_items']['Row'];
/** have = på plass, not_needed = trenger vi ikke. null (på raden) = mangler. */
export type PreparednessStatus = Database['public']['Enums']['preparedness_status'];
