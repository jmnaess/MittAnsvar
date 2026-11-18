-- Hjemprofil: spørsmål om boligen som styrer forslag i årshjulet.
-- Se docs/DATABASE.md §1 (households) og §4 (task_templates.requires).
--
-- Hovedregler:
--   - Profilen er kolonner på households (én profil per husstand). Boligtype er den eksisterende
--     housing_type. RLS på households gjelder uendret: alle i husstanden leser, voksne endrer.
--   - null = ikke svart. Et ubesvart spørsmål oppfyller aldri en betingelse på en mal.
--   - Malene får requires (jsonb): {"has_air_heat_pump": true} eller
--     {"sewage_type": ["septic_tank", "mini_treatment_plant"]}. Alle nøkler må være oppfylt.
--     Utvalget skjer i TypeScript (templates/suggest.ts), som for husstandstype og boligtype.

-- ---------------------------------------------------------------------------
-- Profil på households
-- ---------------------------------------------------------------------------
create type public.sewage_type as enum ('municipal', 'septic_tank', 'mini_treatment_plant');

alter table public.households
  add column has_garden               boolean,
  add column has_car                  boolean,
  add column has_cabin                boolean,
  add column has_air_heat_pump        boolean,
  add column has_fireplace            boolean,
  add column has_balanced_ventilation boolean,
  add column has_hydronic_heating     boolean,
  add column has_private_well         boolean,
  add column sewage_type              public.sewage_type;

-- Kommer i tillegg til den eksisterende grant update (name, type, housing_type, feedback_tone).
grant update (has_garden, has_car, has_cabin, has_air_heat_pump, has_fireplace,
              has_balanced_ventilation, has_hydronic_heating, has_private_well, sewage_type)
  on public.households to authenticated;

-- ---------------------------------------------------------------------------
-- Betingelser på maler
-- ---------------------------------------------------------------------------

-- Gyldig requires: null, eller et ikke-tomt objekt der hver nøkkel er et profilspørsmål.
--   has_*:       true eller false
--   sewage_type: ikke-tom liste med gyldige verdier (en av dem må stemme)
-- case (ikke or) sikrer at jsonb_array_elements_text bare kjøres på lister.
create function private.template_requires_valid(r jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select r is null or (
    jsonb_typeof(r) = 'object'
    and r <> '{}'::jsonb
    and not exists (
      select 1
      from jsonb_each(r) as e (key, value)
      where not case
        when e.key in ('has_garden', 'has_car', 'has_cabin', 'has_air_heat_pump', 'has_fireplace',
                       'has_balanced_ventilation', 'has_hydronic_heating', 'has_private_well')
          then jsonb_typeof(e.value) = 'boolean'
        when e.key = 'sewage_type' then
          case when jsonb_typeof(e.value) = 'array' then
            jsonb_array_length(e.value) > 0
            and not exists (
              select 1 from jsonb_array_elements(e.value) as v (item)
              where jsonb_typeof(v.item) <> 'string'
                 or v.item #>> '{}' not in ('municipal', 'septic_tank', 'mini_treatment_plant')
            )
          else false end
        else false
      end
    )
  );
$$;

alter table public.task_templates
  add column requires jsonb
  constraint task_templates_requires_valid check (private.template_requires_valid(requires));

-- Nye funksjoner i private får execute til public som standard. Samme opprydding som før.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
