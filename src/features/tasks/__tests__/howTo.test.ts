import { howToForTask, howToForTemplate, type HowToTemplate } from '../howTo';

const yearly: HowToTemplate & { title: string } = {
  title: 'Sjekk brannslukkeren',
  description: 'Trykkmåleren skal stå på grønt.',
  source_name: 'DSB',
  source_url: 'https://www.dsb.no',
  recurrence_type: 'calendar',
  recurrence_unit: 'year',
  season_start_month: null,
};

const routine: HowToTemplate & { title: string } = {
  ...yearly,
  title: 'Re opp senga',
  description: 'Dyna og puta på plass.',
  source_name: null,
  source_url: null,
  recurrence_unit: 'day',
};

describe('howToForTemplate', () => {
  it('årshjul, hjemprofil og intervall får ikon med kilde', () => {
    expect(howToForTemplate(yearly)).toEqual({
      title: 'Sjekk brannslukkeren',
      text: 'Trykkmåleren skal stå på grønt.',
      source: { name: 'DSB', url: 'https://www.dsb.no' },
    });
    expect(howToForTemplate({ ...yearly, recurrence_type: 'interval', recurrence_unit: 'month' })).not.toBeNull();
  });

  it('sesongmaler får ikon, selv om de er ukentlige', () => {
    expect(howToForTemplate({ ...routine, recurrence_unit: 'week', season_start_month: 5 })).not.toBeNull();
  });

  it('rutinemaler (dag, uke, måned) får ikke ikon', () => {
    expect(howToForTemplate(routine)).toBeNull();
    expect(howToForTemplate({ ...routine, recurrence_unit: 'week' })).toBeNull();
    expect(howToForTemplate({ ...routine, recurrence_unit: 'month' })).toBeNull();
  });

  it('kilde uten URL', () => {
    expect(howToForTemplate({ ...yearly, source_url: null })?.source).toEqual({ name: 'DSB', url: null });
  });

  it('ingen kilde uten source_name', () => {
    expect(howToForTemplate({ ...yearly, source_name: null })?.source).toBeNull();
  });
});

describe('howToForTask', () => {
  const fromYearly = {
    title: 'Sjekk brannslukkeren',
    description: 'Trykkmåleren skal stå på grønt.',
    template_id: 'mal',
    recurrence_type: 'calendar' as const,
    recurrence_unit: 'year' as const,
    season_start_month: null,
  };

  it('ingen beskrivelse: null', () => {
    expect(howToForTask({ ...fromYearly, description: null }, yearly)).toBeNull();
    expect(howToForTask({ ...fromYearly, description: '  ' }, yearly)).toBeNull();
  });

  it('fra årshjulsmal: ikon med kilde', () => {
    expect(howToForTask(fromYearly, yearly)?.source).toEqual({ name: 'DSB', url: 'https://www.dsb.no' });
  });

  it('endret beskrivelse: ikon, men ikke kilde', () => {
    const t = howToForTask({ ...fromYearly, description: 'Egen tekst' }, yearly);
    expect(t).toEqual({ title: 'Sjekk brannslukkeren', text: 'Egen tekst', source: null });
  });

  it('fra rutinemal: ikke ikon, selv om gjentakelsen er endret', () => {
    const t = { ...fromYearly, description: 'Dyna og puta på plass.', recurrence_unit: 'year' as const };
    expect(howToForTask(t, routine)).toBeNull();
  });

  it('ukjent mal: oppgavens gjentakelse avgjør', () => {
    expect(howToForTask(fromYearly, null)).not.toBeNull();
    expect(howToForTask({ ...fromYearly, recurrence_unit: 'week' }, undefined)).toBeNull();
    expect(howToForTask(fromYearly, null)?.source).toBeNull();
  });

  it('mal uten template_id (familieskjermen): malen avgjør', () => {
    const { template_id: _, ...board } = fromYearly;
    expect(howToForTask({ ...board, description: 'Dyna og puta på plass.' }, routine)).toBeNull();
    expect(howToForTask(board, yearly)?.source?.name).toBe('DSB');
  });

  it('uten mal: ikon når den har beskrivelse, også daglige', () => {
    const own = { ...fromYearly, template_id: null, recurrence_unit: 'day' as const };
    expect(howToForTask(own, undefined)?.text).toBe('Trykkmåleren skal stå på grønt.');
  });

  it('always: redigeringsskjermen viser beskrivelsen også for rutiner', () => {
    const t = { ...fromYearly, description: 'Dyna og puta på plass.' };
    expect(howToForTask(t, routine, { always: true })?.text).toBe('Dyna og puta på plass.');
  });
});
