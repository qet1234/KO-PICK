-- The complete KO-PICK platform migration is split into smaller ordered files:
-- 20260724130100_platform_schema.sql
-- 20260724130200_platform_security.sql
-- 20260724130300_space_rpcs.sql
-- 20260724130400_reservation_rpcs.sql
-- 20260724130600_trending_rpcs.sql
--
-- Keeping this marker preserves migration history while allowing each stage to
-- be independently validated and reviewed.
select 1;
