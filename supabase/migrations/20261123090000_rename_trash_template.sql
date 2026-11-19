-- Malen «Bære ut søppelet» heter nå «Tømme søppel på kjøkken og bad», med ny beskrivelse.
-- Oppgaver laget fra malen får samme tekst, men bare der brukeren ikke har endret den:
-- tittel og beskrivelse oppdateres hver for seg, og bare hvis de er lik den gamle teksten.

update public.task_templates
set title = 'Tømme søppel på kjøkken og bad',
    description = 'Knyt igjen posene på kjøkkenet og badet, bær dem ut og sett i nye poser.'
where slug = 'routine-kid-trash';

update public.tasks t
set title = tt.title
from public.task_templates tt
where tt.slug = 'routine-kid-trash'
  and t.template_id = tt.id
  and t.title = 'Bære ut søppelet';

update public.tasks t
set description = tt.description
from public.task_templates tt
where tt.slug = 'routine-kid-trash'
  and t.template_id = tt.id
  and t.description = 'Ta med restavfall, papir og plast ut, og sett i en ny pose.';
