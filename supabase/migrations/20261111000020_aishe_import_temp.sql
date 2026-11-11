-- D26: one-off import of the AISHE college list. The rows are sent in chunks from the founder's computer.
-- The function only works with the one-time token kept in Vault ('aishe_import_token'), and both are
-- removed by the next migration once the import is done.
create function public.import_aishe_colleges(p_token text, p_rows jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_count integer;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'aishe_import_token' limit 1;
  if v_token is null or p_token is distinct from v_token then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'bad_chunk' using errcode = '22023';
  end if;

  insert into public.colleges (aishe_code, name, state, district, university, kind, source, status)
  select r ->> 0, r ->> 1, nullif(r ->> 2, ''), nullif(r ->> 3, ''), nullif(r ->> 4, ''), 'college', 'aishe', 'approved'
  from jsonb_array_elements(p_rows) r
  where (r ->> 0) ~ '^C-[0-9]+$' and char_length(r ->> 1) between 5 and 160
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.import_aishe_colleges(text, jsonb) from public;
grant execute on function public.import_aishe_colleges(text, jsonb) to anon;
