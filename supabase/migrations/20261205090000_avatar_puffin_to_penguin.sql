-- Lunden (puffin) er byttet ut med pingvinen (penguin) i appen (src/features/household/avatars.ts).
-- Medlemmer som valgte lunden, får pingvinen i stedet for reserven (reven).
-- Fargene er de samme, så personens farge i appen endres ikke.
--
-- Kjører uten innlogget bruker (auth.uid() er null), så members_guard_other_adult_profile
-- (20261125090000_own_adult_profile.sql) slipper endringen gjennom også for voksne.
-- Trygg å kjøre flere ganger: etterpå finnes ingen rader med puffin.

update public.members
set avatar = 'penguin'
where avatar = 'puffin';
