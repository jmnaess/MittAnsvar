import { unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type {
  ChildInput,
  FeedbackTone,
  Household,
  HouseholdType,
  HousingType,
  Member,
} from './types';

/** Husstanden til den innloggede, eller null. RLS gjør at man bare ser sin egen. */
export async function getMyHousehold(): Promise<Household | null> {
  return unwrap(await supabase.from('households').select('*').maybeSingle());
}

export type CreateHouseholdInput = {
  name: string;
  type: HouseholdType;
  housingType: HousingType;
  displayName: string;
  avatar: string;
};

/** Oppretter husstanden og deg som voksen i én transaksjon. Returnerer husstandens id. */
export async function createHousehold(input: CreateHouseholdInput): Promise<string> {
  return unwrap(
    await supabase.rpc('create_household', {
      p_name: input.name,
      p_type: input.type,
      p_housing_type: input.housingType,
      p_display_name: input.displayName,
      p_avatar: input.avatar,
    }),
  );
}

/** Bare navn og tone kan endres her. Andre kolonner er stengt med kolonnerettigheter. */
export async function updateHousehold(
  id: string,
  changes: { name?: string; feedback_tone?: FeedbackTone },
): Promise<void> {
  unwrap(await supabase.from('households').update(changes).eq('id', id));
}

/** Voksne først, deretter i rekkefølgen de ble lagt til. */
export async function listMembers(householdId: string): Promise<Member[]> {
  return unwrap(
    await supabase
      .from('members')
      .select('*')
      .eq('household_id', householdId)
      .order('role') // enum-rekkefølge: adult før child
      .order('created_at'),
  );
}

export async function addChild(householdId: string, child: ChildInput): Promise<void> {
  unwrap(
    await supabase.from('members').insert({ household_id: householdId, role: 'child', ...child }),
  );
}

export async function updateChild(memberId: string, child: ChildInput): Promise<void> {
  unwrap(await supabase.from('members').update(child).eq('id', memberId));
}

export async function deleteChild(memberId: string): Promise<void> {
  unwrap(await supabase.from('members').delete().eq('id', memberId));
}
