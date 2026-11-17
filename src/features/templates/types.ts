import type { Database } from '../../types/database';

/** En ferdig mal fra databasen (global, les-bare). Se docs/DATABASE.md §4. */
export type TaskTemplate = Database['public']['Tables']['task_templates']['Row'];
