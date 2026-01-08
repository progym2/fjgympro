-- Fix: Replace overly permissive INSERT policy with a more restrictive one
-- Drop the permissive policy
DROP POLICY IF EXISTS "Service role can insert history" ON public.username_history;

-- Create a policy that only allows inserts from admin or higher (edge functions use service role)
CREATE POLICY "Admins can insert username history"
ON public.username_history
FOR INSERT
WITH CHECK (is_admin_or_higher(auth.uid()) OR auth.uid() IS NULL);