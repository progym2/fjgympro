-- Replace instructor search policy to allow locating any non-privileged authenticated account in the same tenant
DROP POLICY IF EXISTS "Instructors can search all clients for linking" ON public.profiles;

CREATE POLICY "Instructors can search tenant users for linking"
ON public.profiles
FOR SELECT
USING (
  -- requester must be instructor
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'instructor'::public.app_role
  )
  -- same tenant
  AND profiles.tenant_id = get_current_tenant_id()
  -- only accounts that can actually log in
  AND profiles.user_id IS NOT NULL
  -- don't allow listing privileged accounts (admin/master/instructor)
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id
      AND ur.role IN ('admin'::public.app_role, 'master'::public.app_role, 'instructor'::public.app_role)
  )
);