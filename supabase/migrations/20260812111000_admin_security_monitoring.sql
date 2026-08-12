alter table public.app_service_status
  add column if not exists security_management_enabled boolean not null default true;

comment on column public.app_service_status.security_management_enabled is
  '관리자 대시보드의 보안 관리 수행 여부. 인증, RLS, 보안 헤더 등 실제 보호 기능을 비활성화하지 않는다.';

update public.app_service_status
set security_management_enabled = true
where security_management_enabled is null;
