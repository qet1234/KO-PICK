-- Run after the migration inside a transaction; always ROLLBACK fixtures.
do $$
declare
  customer uuid := gen_random_uuid(); owner_id uuid := gen_random_uuid();
  store uuid := gen_random_uuid(); other_store uuid := gen_random_uuid();
  result jsonb; poll jsonb; candidate uuid; candidate2 uuid; count_votes integer; secret text;
  rejected boolean := false;
begin
  assert not has_function_privilege('anon', 'public.vote_shared_place_poll(text,uuid,text,text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.consume_security_rate_limit(text,text,integer,integer)', 'execute');
  assert not has_table_privilege('authenticated', 'public.mobile_auth_exchanges', 'select');
  assert public.consume_security_rate_limit('security-test', customer::text, 2, 60);
  assert public.consume_security_rate_limit('security-test', customer::text, 2, 60);
  assert not public.consume_security_rate_limit('security-test', customer::text, 2, 60);
  insert into public.mobile_auth_exchanges(code_hash, challenge, token_hash) values (repeat('a',64), repeat('b',64), 'fixture-token');
  assert public.consume_mobile_auth_exchange(repeat('a',64),repeat('c',64)) is null;
  assert public.consume_mobile_auth_exchange(repeat('a',64),repeat('b',64)) = 'fixture-token';
  assert public.consume_mobile_auth_exchange(repeat('a',64),repeat('b',64)) is null;
  insert into public.mobile_auth_exchanges(code_hash, challenge, token_hash, expires_at) values (repeat('c',64),repeat('b',64),'expired',now()-interval '1 minute');
  assert public.consume_mobile_auth_exchange(repeat('c',64),repeat('b',64)) is null;

  insert into auth.users(id) values (customer),(owner_id);
  insert into public.merchant_stores(id,owner_user_id,place_source,place_id,name,approval_status)
    values (store,owner_id,'MANUAL',store::text,'Security test fixture','approved'),
           (other_store,owner_id,'MANUAL',other_store::text,'Suspended fixture','suspended');
  perform set_config('request.jwt.claim.sub',customer::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated')::text,true);
  result := public.create_merchant_reservation('MANUAL',store::text,current_date+1,'12:00',2,'Fixture','01000000000');
  begin
    perform public.create_merchant_reservation('MANUAL',store::text,current_date+1,'12:00',2,'Fixture','01000000000');
  exception when raise_exception then rejected := sqlerrm like '%이미 예약%'; end;
  assert rejected, 'Duplicate reservation was accepted';
  for i in 1..4 loop
    perform public.create_merchant_reservation('MANUAL',store::text,current_date+1,('12:00'::time + i * interval '1 minute')::time,2,'Fixture','01000000000');
  end loop;
  rejected := false;
  begin
    perform public.create_merchant_reservation('MANUAL',store::text,current_date+1,'13:00',2,'Fixture','01000000000');
  exception when raise_exception then rejected := sqlerrm like '%너무 많%'; end;
  assert rejected, 'Reservation quota was bypassed';
  update public.merchant_stores set approval_status='suspended' where id=store;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  perform set_config('role','authenticated',true);
  assert not exists (select 1 from public.merchant_reservations where store_id=store), 'Suspended owner can read reservations';
  perform set_config('request.jwt.claim.sub',customer::text,true);
  assert (select count(*) from public.merchant_reservations where store_id=store)=5, 'Customer lost access';
  perform set_config('role','none',true);
  update public.merchant_stores set approval_status='approved' where id=store;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('role','authenticated',true);
  assert (select count(*) from public.merchant_reservations where store_id=store)=5, 'Approved owner lost access';
  perform set_config('role','none',true);

  poll := public.create_place_poll('Security fixture','[{"placeName":"Fixture A"},{"placeName":"Fixture B"}]');
  select id into candidate from public.place_poll_candidates where poll_id=(poll->>'pollId')::uuid order by position limit 1;
  select id into candidate2 from public.place_poll_candidates where poll_id=(poll->>'pollId')::uuid order by position desc limit 1;
  perform public.vote_shared_place_poll(poll->>'token',candidate,'first-spoofed-token','Fixture');
  perform public.vote_shared_place_poll(poll->>'token',candidate2,'second-spoofed-token','Fixture');
  select count(*) into count_votes from public.place_poll_votes where poll_id=(poll->>'pollId')::uuid;
  assert count_votes=1, 'Changing caller voter token created multiple ballots';
  result := public.get_shared_place_poll(poll->>'token','third-spoofed-token');
  assert (result->'candidates'->1->>'votedByMe')::boolean;
  perform public.vote_shared_place_poll(poll->>'token',candidate2,'another-token','Fixture');
  assert not exists (select 1 from public.place_poll_votes where poll_id=(poll->>'pollId')::uuid), 'Vote toggle failed';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  result := public.get_shared_place_poll(poll->>'token',null);
  assert result->>'title'='Security fixture', 'Anonymous read failed';
  insert into public.admin_operation_events(actor_user_id,visitor_id,event_type,feature,platform,event_bucket)
    values(customer,customer,'app_error','security-fixture','web',0);
  delete from auth.users where id=customer;
  assert not exists(select 1 from public.admin_operation_events where actor_user_id=customer), 'Account deletion left telemetry';
end; $$;
