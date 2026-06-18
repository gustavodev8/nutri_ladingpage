-- ================================================================
-- Fix RLS policies for availability_slots
-- Restrict anon to SELECT only, allow authenticated users to perform all actions (INSERT/UPDATE/DELETE).
-- ================================================================

-- 1. Remove existing overly permissive policies if they exist
DROP POLICY IF EXISTS "anon_write_slots" ON availability_slots;

-- 2. Ensure only SELECT is allowed for anonymous users
DROP POLICY IF EXISTS "public_read_slots" ON availability_slots;
CREATE POLICY "public_read_slots" ON availability_slots
  FOR SELECT TO anon USING (true);

-- 3. Create policy for authenticated users to manage availability slots
DROP POLICY IF EXISTS "authenticated_manage_slots" ON availability_slots;
CREATE POLICY "authenticated_manage_slots" ON availability_slots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
