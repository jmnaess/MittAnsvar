-- Stenger seks hjelpefunksjoner i private igjen.
--
-- De ble stengt for innloggede da de ble laget (child_devices, reward_approval,
-- adult_fix_completions, postpone_task). Så kjørte 20261119090000_seasonal_tasks.sql
-- «grant execute on all functions in schema private to authenticated», og da ble de åpnet på nytt.
--
-- Ingen app-flyt trenger dem som innlogget bruker. De kalles bare fra security definer-funksjoner
-- som eies av postgres (unlink_*, delete_my_account_data, approve/reject/set_completion_status,
-- reassign/remove_completion, postpone_task, undo_postpone), og ingen RLS-policy eller view bruker
-- dem. private er heller ikke eksponert i API-et.
--
-- Fremover: ikke bruk «on all functions in schema private». Gi og ta rettigheter per funksjon.
-- supabase/tests/private_function_privileges.test.sql passer på at disse holder seg stengt.

revoke execute on function private.delete_anonymous_users(uuid[])                from public, anon, authenticated;
revoke execute on function private.assert_adult_for_completions(uuid[])          from public, anon, authenticated;
revoke execute on function private.member_balance(uuid)                          from public, anon, authenticated;
revoke execute on function private.lock_today_completion(uuid, uuid)             from public, anon, authenticated;
revoke execute on function private.assert_reward_not_paid(public.task_completions) from public, anon, authenticated;
revoke execute on function private.lock_task_for_adult(uuid)                     from public, anon, authenticated;
