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
  // Postgres
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
