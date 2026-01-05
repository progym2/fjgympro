-- Drop and recreate licenses policies to allow admin inserts
DROP POLICY IF EXISTS "Admins can manage tenant licenses" ON public.licenses;
DROP POLICY IF EXISTS "Users can view own license" ON public.licenses;
DROP POLICY IF EXISTS "Masters can delete licenses" ON public.licenses;

-- Allow admins to insert licenses for any profile (without tenant restriction for new clients)
CREATE POLICY "Admins can insert licenses"
ON public.licenses
FOR INSERT
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Allow admins to update/select tenant licenses
CREATE POLICY "Admins can manage tenant licenses"
ON public.licenses
FOR ALL
USING (is_admin_or_higher(auth.uid()) AND ((tenant_id = get_current_tenant_id()) OR is_master(auth.uid()) OR tenant_id IS NULL));

-- Users can view their own license
CREATE POLICY "Users can view own license"
ON public.licenses
FOR SELECT
USING (profile_id = get_current_profile_id());

-- Masters can delete licenses
CREATE POLICY "Masters can delete licenses"
ON public.licenses
FOR DELETE
USING (is_master(auth.uid()));

-- Drop and recreate payments policies
DROP POLICY IF EXISTS "Admins can manage tenant payments" ON public.payments;
DROP POLICY IF EXISTS "Instructors can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

-- Allow admins to insert payments for any client
CREATE POLICY "Admins can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Allow admins to manage all payments
CREATE POLICY "Admins can manage tenant payments"
ON public.payments
FOR ALL
USING (is_admin_or_higher(auth.uid()) AND ((tenant_id = get_current_tenant_id()) OR is_master(auth.uid()) OR tenant_id IS NULL));

-- Instructors can manage their own payments
CREATE POLICY "Instructors can manage payments"
ON public.payments
FOR ALL
USING (instructor_id = get_current_profile_id());

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
USING (client_id = get_current_profile_id());

-- Add student_id column to profiles if not exists (for public consultation)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_id VARCHAR(12) UNIQUE;

-- Create function to generate unique student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS VARCHAR(12)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'ALU-';
  i INTEGER;
  exists_check BOOLEAN;
BEGIN
  LOOP
    result := 'ALU-';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE student_id = result) INTO exists_check;
    IF NOT exists_check THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger to auto-generate student_id on insert
CREATE OR REPLACE FUNCTION public.set_student_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    NEW.student_id := public.generate_student_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_student_id ON public.profiles;
CREATE TRIGGER trigger_set_student_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_student_id();

-- Add policy to allow public consultation of student by ID
CREATE POLICY "Anyone can view profile by student_id"
ON public.profiles
FOR SELECT
USING (student_id IS NOT NULL);