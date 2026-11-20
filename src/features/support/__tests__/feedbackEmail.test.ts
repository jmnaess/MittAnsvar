import {
  buildFeedbackBody,
  buildFeedbackMailto,
  FEEDBACK_SUBJECT,
  SUPPORT_EMAIL,
  type AppInfo,
} from '../feedbackEmail';

const info: AppInfo = { version: '1.0.0', build: '12', platform: 'iOS', osVersion: '18.1' };

function parse(url: string) {
  const [target, query] = url.split('?');
  const params = new URLSearchParams(query);
  return { target, subject: params.get('subject'), body: params.get('body') };
}

describe('buildFeedbackMailto', () => {
  it('går til support med riktig emne', () => {
    const { target, subject } = parse(buildFeedbackMailto(info));
    expect(target).toBe(`mailto:${SUPPORT_EMAIL}`);
    expect(subject).toBe(FEEDBACK_SUBJECT);
  });

  it('har brødteksten med versjon, bygg, plattform og OS', () => {
    const { body } = parse(buildFeedbackMailto(info));
    expect(body).toBe(buildFeedbackBody(info));
    expect(body).toContain('Appversjon: 1.0.0');
    expect(body).toContain('Bygg: 12');
    expect(body).toContain('Plattform: iOS');
    expect(body).toContain('OS-versjon: 18.1');
  });

  it('koder mellomrom og linjeskift i URL-en', () => {
    const url = buildFeedbackMailto(info);
    expect(url).not.toMatch(/\s/);
    expect(url).toContain('%0A');
  });
});

describe('buildFeedbackBody', () => {
  it('starter med tom linje til brukeren og har bare teknisk info', () => {
    expect(buildFeedbackBody(info)).toBe(
      '\n\n\n---\nAppversjon: 1.0.0\nBygg: 12\nPlattform: iOS\nOS-versjon: 18.1',
    );
  });

  it('inneholder ingen e-postadresse eller id', () => {
    const body = buildFeedbackBody(info);
    expect(body).not.toContain('@');
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});
