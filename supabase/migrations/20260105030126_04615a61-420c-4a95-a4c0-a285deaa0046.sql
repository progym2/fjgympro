-- Drop the restrictive policy
DROP POLICY IF EXISTS "Instructors can search clients by username for linking" ON public.profiles;

-- Create a more permissive policy that allows instructors to search ALL client profiles
CREATE POLICY "Instructors can search all clients for linking"
ON public.profiles
FOR SELECT
USING (
  -- Current user must be an instructor
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'instructor'
  )
  -- Target profile must be a client
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = profiles.user_id
    AND ur.role = 'client'
  )
);