-- Tilbakemeldinger for barn som handler om å ta sin del, ikke bare om penger (docs/VISJON.md).
-- Bare audience = 'child': complete_task.test.sql forutsetter færre enn 12 humortekster for
-- voksne/alle uten kategori, så de røres ikke.
insert into public.feedback_messages (tone, audience, category, text) values
  ('humor', 'child', null, 'Sånn! Der tok du din del.'),
  ('humor', 'child', null, 'Takk! Det merker hele familien.'),
  ('humor', 'child', null, 'Alle tar sin del, og du tok din.'),
  ('humor', 'child', null, 'Yes! Den er i boks.'),
  ('humor', 'child', null, 'Hjemmet ble litt bedre nå. Takk!');
