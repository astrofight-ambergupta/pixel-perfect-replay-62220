-- Workspace isolation check. Runs as simulated users and always rolls back (ends with RAISE).
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid();
w1 uuid := gen_random_uuid(); w2 uuid := gen_random_uuid(); n int; out text := '';
begin
  insert into workspaces(id,name,owner_id) values (w1,'W1',a),(w2,'W2',b);
  insert into workspace_members(workspace_id,user_id,role) values (w1,a,'professional'),(w1,c,'astronaut'),(w2,b,'professional'),(w2,a,'astronaut'),(w2,d,'astronaut');
  insert into health_records(workspace_id,user_id,kind,local_id,payload) values (w1,c,'checkin','1','{}'),(w2,d,'checkin','1','{}'),(w2,a,'checkin','1','{}');
  insert into alerts(workspace_id,user_id,level) values (w1,c,'severe'),(w2,d,'severe');
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into n from health_records where workspace_id=w1; out := out || 'A W1 records(1)=' || n;
  select count(*) into n from health_records where workspace_id=w2; out := out || ' | A W2 records(1 own)=' || n;
  select count(*) into n from alerts where workspace_id=w2; out := out || ' | A W2 alerts(0)=' || n;
  begin insert into sync_requests(workspace_id,user_id,requested_by) values (w2,d,a); out := out || ' | A sync W2 ALLOWED(bad)'; exception when others then out := out || ' | A sync W2 blocked'; end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',c,'role','authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into n from alerts; out := out || ' | C alerts(0)=' || n;
  begin insert into health_records(workspace_id,user_id,kind,local_id,payload) values (w2,c,'checkin','9','{}'); out := out || ' | C write W2 ALLOWED(bad)'; exception when others then out := out || ' | C write W2 blocked'; end;
  execute 'reset role';
  raise exception 'RESULT: %', out;
end $$;
