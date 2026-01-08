-- Create table to store username change history
CREATE TABLE public.username_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_username VARCHAR NOT NULL,
  new_username VARCHAR NOT NULL,
  change_reason VARCHAR DEFAULT 'cpf_auto_link',
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- Masters can view all history
CREATE POLICY "Masters can view all username history"
ON public.username_history
FOR SELECT
USING (is_master(auth.uid()));

-- Admins can view tenant history
CREATE POLICY "Admins can view username history"
ON public.username_history
FOR SELECT
USING (is_admin_or_higher(auth.uid()));

-- System can insert history (via service role)
CREATE POLICY "Service role can insert history"
ON public.username_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_username_history_profile_id ON public.username_history(profile_id);
CREATE INDEX idx_username_history_changed_at ON public.username_history(changed_at DESC);