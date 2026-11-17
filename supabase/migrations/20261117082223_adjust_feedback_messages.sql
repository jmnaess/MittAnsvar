-- Justerer startsettet med tilbakemeldingstekster fra *_task_completions.sql etter gjennomgang.
--
-- Tekster deaktiveres (is_active = false) i stedet for å slettes. Da beholder eksisterende
-- task_completions koblingen via feedback_message_id, og teksten kan slås på igjen senere.
-- complete_task og RLS-policyen viser bare aktive tekster.
--
-- Radene finnes på teksten, som er unik. Hver endring må treffe nøyaktig én rad, ellers
-- stopper migrasjonen. Det fanger skrivefeil i stedet for at en endring stille ikke skjer.

create function pg_temp.expect_one(p_what text, p_count int)
returns void language plpgsql as $$
begin
  if p_count <> 1 then
    raise exception 'adjust_feedback_messages: «%» traff % rader, ventet 1', p_what, p_count;
  end if;
end;
$$;

do $$
declare n int;
begin
  -- Deaktiver
  update public.feedback_messages set is_active = false
  where text in (
    'Visste du at små, faste rutiner er lettere å holde enn store forsetter?',
    'Visste du at det kjennes godt å krysse av fordi hjernen belønner deg for å fullføre noe?',
    'Visste du at oppgaver som har en fast dag, er lettere å huske enn oppgaver «en gang snart»?',
    'Visste du at det er lettere å huske en oppgave når alle vet hvem som har ansvaret?',
    'Gratulerer, du var voksen i dag også.'
  );
  get diagnostics n = row_count;
  if n <> 5 then
    raise exception 'adjust_feedback_messages: deaktivering traff % rader, ventet 5', n;
  end if;

  -- Ny ordlyd. Samme id, så tidligere utføringer peker på den oppdaterte teksten.
  update public.feedback_messages
  set text = 'Visste du at det kan ta fra noen uker til flere måneder før en ny vane sitter?'
  where text = 'Visste du at det i snitt tar rundt to måneder før en ny vane sitter?';
  get diagnostics n = row_count;
  perform pg_temp.expect_one('ny ordlyd om vaner', n);

  -- Bare for rengjøringsoppgaver
  update public.feedback_messages set category = 'cleaning'
  where text = 'Hvor mange hybelkaniner fant du?';
  get diagnostics n = row_count;
  perform pg_temp.expect_one('kategori på hybelkaniner', n);
end;
$$;

insert into public.feedback_messages (tone, audience, category, text) values
  ('fact',  'child', null, 'Visste du at sjøstjerner ikke har hjerne?'),
  ('fact',  'child', null, 'Visste du at bananer egentlig er bær, men jordbær ikke er det?'),
  ('fact',  'child', null, 'Visste du at elefanter ikke kan hoppe?'),
  ('humor', 'child', null, 'Ninjanivå! Oppgaven merket ikke engang at du kom.'),
  ('humor', 'child', null, 'Det der var nesten raskere enn lyset.'),
  ('humor', 'adult', null, 'Fremtidige deg sier takk.'),
  ('humor', 'adult', null, 'Voksenpoeng: +1.'),
  ('humor', 'any',   null, 'Ingen så det. Men vi så det.');
