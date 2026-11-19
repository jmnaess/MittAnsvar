import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  isAuthError,
  type PostgrestError,
} from '@supabase/supabase-js';

/**
 * Feil fra et databasekall (tabell eller RPC).
 * PostgrestError har ingen HTTP-status, så vi tar den med selv. Da kan vi skille
 * nettverksfeil (0), for mange forsøk (429) og serverfeil (5xx) fra hverandre.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Slik supabase-js beskriver et svar: enten data, eller en feil (og da er data null).
type DbResult<T> =
  | { data: T; error: null; status: number }
  | { data: null; error: PostgrestError; status: number };

/** Returnerer data fra et supabase-kall, eller kaster ApiError. */
export function unwrap<T>(result: DbResult<T>): T {
  if (result.error) {
    throw new ApiError(result.error.message, result.status, result.error.code);
  }
  return result.data;
}

// Kjente feilkoder og -nøkler → norsk tekst.
// Nøklene i create_household kommer som melding (errcode P0001), se migrasjonen.
const KNOWN: Record<string, string> = {
  // Auth
  otp_expired: 'Koden er feil eller utløpt. Prøv igjen, eller be om en ny kode.',
  over_email_send_rate_limit: 'For mange forsøk. Vent litt og prøv igjen.',
  over_request_rate_limit: 'For mange forsøk. Vent litt og prøv igjen.',
  email_address_invalid: 'E-postadressen ser ikke riktig ut.',
  validation_failed: 'E-postadressen ser ikke riktig ut.',
  signup_disabled: 'Nye brukere kan ikke registrere seg akkurat nå.',
  // create_household
  already_in_household: 'Du er allerede med i en husstand.',
  anonymous_not_allowed: 'Denne enheten kan ikke opprette en husstand.',
  not_authenticated: 'Du er ikke innlogget. Logg inn på nytt.',
  // Invitasjon av voksen
  invite_invalid: 'Koden er feil, utløpt eller allerede brukt. Be om en ny kode.',
  too_many_attempts: 'For mange feil forsøk. Vent 15 minutter og prøv igjen.',
  not_adult: 'Bare voksne kan gjøre dette.',
  // Barnets enhet
  link_invalid: 'Koden er feil, utløpt eller allerede brukt. Be en voksen lage en ny kode.',
  already_linked: 'Barnet har allerede en enhet. Koble fra den først.',
  invalid_avatar: 'Velg en av avatarene.',
  member_not_found: 'Fant ikke profilen din. Logg inn på nytt.',
  anonymous_required: 'Denne enheten er logget inn som voksen. Logg ut først.',
  // Familieskjermen
  not_display: 'Denne enheten er ikke en familieskjerm.',
  // Oppgaver
  subscription_required: 'Prøveperioden er over. Husstanden trenger abonnement for å gjøre endringer.',
  recurrence_not_found: 'Fant ingen dato som passer gjentakelsen. Prøv et annet valg.',
  task_not_found: 'Fant ikke oppgaven. Den kan være slettet.',
  task_not_due: 'Denne oppgaven er allerede gjort.',
  invalid_member: 'Du kan ikke krysse av for denne oppgaven.',
  invalid_assignment: 'Et av barna finnes ikke lenger. Last inn på nytt og prøv igjen.',
  // Angring
  completion_not_found: 'Avkrysningen finnes ikke lenger.',
  undo_not_allowed: 'Bare den siste avkrysningen kan angres.',
  undo_expired: 'Det er for lenge siden til å angre.',
  not_today: 'Bare det som er gjort i dag, kan endres her.',
  // Utsett til
  not_postponable: 'Denne oppgaven kan ikke utsettes. Last inn på nytt og prøv igjen.',
  invalid_date: 'Velg en senere dato, innen ett år fra i dag.',
  undo_postpone_expired: 'Oppgaven er endret siden, så utsettelsen kan ikke angres.',
  // Utbetaling og godkjenning
  amount_exceeds_balance: 'Beløpet kan ikke være større enn det som er godkjent.',
  not_pending: 'Denne er allerede godkjent eller avvist.',
  reward_already_paid: 'Beløpet er allerede betalt ut, så det kan ikke trekkes tilbake.',
  status_not_changeable: 'Statusen kan ikke endres. Last inn på nytt og prøv igjen.',
  // Profilbilder
  no_photo: 'Det finnes ikke noe bilde ennå. Be en voksen legge inn et.',
  camera_permission_denied: 'Appen har ikke tilgang til kameraet. Gi tilgang i innstillingene på telefonen.',
  photos_permission_denied: 'Appen har ikke tilgang til bildene. Gi tilgang i innstillingene på telefonen.',
  photo_upload_failed: 'Fikk ikke lastet opp bildet. Sjekk nettet og prøv igjen.',
  photo_delete_failed: 'Fikk ikke slettet bildet. Sjekk nettet og prøv igjen.',
  // Postgres
  '23503': 'Personen du valgte, finnes ikke lenger i husstanden.',
  '23505': 'Dette finnes allerede.',
  '42501': 'Du har ikke tilgang til å gjøre dette.',
  '23514': 'Noe av det du skrev, er ikke gyldig.',
};

const NETWORK = 'Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.';
const RATE_LIMIT = 'For mange forsøk. Vent litt og prøv igjen.';
const SERVER = 'Det oppsto en feil hos oss. Prøv igjen om litt.';
const UNKNOWN = 'Noe gikk galt. Prøv igjen.';

/** Henter feilkode/-nøkkel, uansett hvilken Supabase-del feilen kommer fra. */
function getCode(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    // RPC-ene våre bruker P0001 med en fast nøkkel som melding.
    return error.code === 'P0001' ? error.message : error.code;
  }
  if (isAuthError(error)) return error.code;
  return undefined;
}

/** Henter HTTP-status. 0 betyr at vi ikke fikk svar (nettverk). */
function getStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;
  if (isAuthError(error)) return error.status;
  if (error instanceof FunctionsHttpError) return (error.context as Response | undefined)?.status;
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return 0;
  return undefined;
}

/**
 * Gjør feil fra Supabase om til korte norske meldinger.
 * Rekkefølgen er viktig: auth-js merker også 5xx som «retryable fetch error»,
 * så status må sjekkes før vi antar at det er nettverket.
 */
export function toNorwegianMessage(error: unknown): string {
  const code = getCode(error);
  if (code && KNOWN[code]) return KNOWN[code];

  const status = getStatus(error);
  if (status === 429) return RATE_LIMIT;
  if (status !== undefined && status >= 500) return SERVER;
  if (status === 0) return NETWORK;
  return UNKNOWN;
}
