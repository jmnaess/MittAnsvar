import { ApiError, unwrap } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { normalizeInviteCode } from './inviteCode';
import { deletePhotoFolder } from './photoApi';
import type {
  ChildInput,
  FeedbackTone,
  HomeProfile,
  Household,
  HouseholdType,
  HousingType,
  Invite,
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

/**
 * Det voksne kan endre på husstanden: navn, type (bare i oppstarten i appen), tone, om barna kan
 * sende forslag, og hjemprofilen. Andre kolonner er stengt med kolonnerettigheter.
 */
export type HouseholdChanges = Partial<
  { name: string; type: HouseholdType; feedback_tone: FeedbackTone; child_proposals_enabled: boolean } &
    HomeProfile
>;

export async function updateHousehold(id: string, changes: HouseholdChanges): Promise<void> {
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

/** Nytt navn. Voksne kan bare endre sitt eget (trigger i *_own_adult_name.sql), barn aldri. */
export async function updateMemberName(memberId: string, displayName: string): Promise<void> {
  unwrap(await supabase.from('members').update({ display_name: displayName }).eq('id', memberId));
}

/** Ny avatar på min egen profil. Barn kan bare endre avataren, via RPC-en set_my_avatar. */
export async function setMyAvatar(avatar: string): Promise<void> {
  unwrap(await supabase.rpc('set_my_avatar', { p_avatar: avatar }));
}

/**
 * Sletter barneprofilen. Bildemappen slettes først: databasen kan ikke slette filer selv
 * (Supabase stopper DELETE på storage.objects med SQL). Feiler det, slettes ikke profilen,
 * så man kan prøve igjen uten at et bilde av barnet blir liggende.
 */
export async function deleteChild(member: Pick<Member, 'id' | 'household_id'>): Promise<void> {
  await deletePhotoFolder(member.household_id, member.id);
  unwrap(await supabase.from('members').delete().eq('id', member.id));
}

// ---------------------------------------------------------------------------
// Invitasjon av voksen
// ---------------------------------------------------------------------------

/** Lager en engangskode. Klarteksten finnes bare i dette svaret, databasen lagrer hashen. */
export async function createInvite(householdId: string): Promise<{ code: string; expiresAt: string }> {
  const rows = unwrap(await supabase.rpc('create_invite', { p_household_id: householdId }));
  return { code: rows[0].code, expiresAt: rows[0].expires_at };
}

/** Ubrukte invitasjoner som ikke har utløpt. RLS: bare voksne i husstanden ser dem. */
export async function listActiveInvites(householdId: string): Promise<Invite[]> {
  return unwrap(
    await supabase
      .from('invites')
      .select('id, created_by, expires_at')
      .eq('household_id', householdId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at'),
  );
}

/** Trekker tilbake = sletter. RLS tillater det bare for ubrukte invitasjoner. */
export async function revokeInvite(inviteId: string): Promise<void> {
  unwrap(await supabase.from('invites').delete().eq('id', inviteId));
}

export type AcceptInviteInput = { code: string; displayName: string; avatar: string };

/**
 * Blir med i husstanden. Returnerer husstandens id.
 * Feil kode gir null fra databasen (ikke en feil, ellers ville forsøket ikke blitt telt,
 * se migrasjonen). Her gjør vi null om til feilnøkkelen invite_invalid.
 */
export async function acceptInvite(input: AcceptInviteInput): Promise<string> {
  const result = await supabase.rpc('accept_invite', {
    p_code: normalizeInviteCode(input.code),
    p_display_name: input.displayName,
    p_avatar: input.avatar,
  });
  const householdId = unwrap(result) as string | null;
  if (householdId === null) throw new ApiError('invite_invalid', result.status, 'P0001');
  return householdId;
}
