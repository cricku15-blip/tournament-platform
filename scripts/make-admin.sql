update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'YOU@example.com');
select id, full_name, is_admin from public.profiles where is_admin;
