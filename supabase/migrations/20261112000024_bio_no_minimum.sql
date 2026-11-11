-- D26 change: the bio on Card 2 is still required, but any length is fine (no 40-character minimum).
do $$
declare
  d text := pg_get_functiondef('public.complete_onboarding_profile(text, jsonb, smallint[], text[])'::regprocedure);
begin
  d := replace(d, 'char_length(btrim(coalesce(p_bio, ''''))) < 40', 'char_length(btrim(coalesce(p_bio, ''''))) < 1');
  d := replace(d, '''bio_too_short''', '''bio_required''');
  if position('< 1' in d) = 0 then
    raise exception 'complete_onboarding_profile did not change';
  end if;
  execute d;
end;
$$;
