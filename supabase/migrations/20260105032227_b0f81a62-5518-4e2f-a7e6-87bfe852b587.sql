-- Drop all instructor profile policies and create a simpler one
DROP POLICY IF EXISTS "Instructors can consult all clients" ON public.profiles;

-- Create a simple policy: instructors can view all profiles that have 'client' role
CREATE POLICY "Instructors can view client profiles"
ON public.profiles
FOR SELECT
USING (
  -- Requester is an instructor
  public.has_role(auth.uid(), 'instructor'::public.app_role)
);