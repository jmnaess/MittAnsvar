-- Steg 9: ny gjentakelsestype for ledige jobber (oppgaver uten dato).
-- Se docs/DATABASE.md §2.
--
-- Egen migrasjon: en ny enum-verdi kan ikke brukes i samme transaksjon som den legges til.
-- Resten av steg 9 ligger i *_rewards_and_jobs.sql.
alter type public.recurrence_type add value 'job';
