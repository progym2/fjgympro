-- Allow instructors to consult/search ALL client profiles (same tenant, NULL-safe)
DROP POLICY IF EXISTS "Instructors can search tenant users for linking" ON public.profiles;

CREATE POLICY "Instructors can consult all clients"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'instructor'::public.app_role)
  AND (profiles.tenant_id IS NOT DISTINCT FROM public.get_current_tenant_id())
  AND profiles.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id
      AND ur.role = 'client'::public.app_role
  )
);