import { Redirect } from 'expo-router';

/**
 * Den gamle «Årshjul»-fanen. Årshjulet er nå et segment i «Oppgaver», så gamle lenker
 * (/year, mittansvar://year) sendes dit med Årshjul valgt.
 */
export default function YearRedirect() {
  return <Redirect href={{ pathname: '/tasks', params: { view: 'year' } }} />;
}
