export const SUPPORT_EMAIL = 'support@mittansvar.app';
export const FEEDBACK_SUBJECT = 'Tilbakemelding på MittAnsvar';

/** Teknisk info nederst i e-posten. Bare dette, aldri navn, e-post eller husstands-id. */
export type AppInfo = {
  version: string;
  build: string;
  platform: string;
  osVersion: string;
};

/** Tom plass øverst til brukerens tekst, teknisk info nederst. */
export function buildFeedbackBody(info: AppInfo): string {
  return [
    '',
    '',
    '',
    '---',
    `Appversjon: ${info.version}`,
    `Bygg: ${info.build}`,
    `Plattform: ${info.platform}`,
    `OS-versjon: ${info.osVersion}`,
  ].join('\n');
}

export function buildFeedbackMailto(info: AppInfo): string {
  const subject = encodeURIComponent(FEEDBACK_SUBJECT);
  const body = encodeURIComponent(buildFeedbackBody(info));
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
