-- Create storage bucket for evolution photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('evolution-photos', 'evolution-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for evolution photo metadata
CREATE TABLE public.evolution_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  body_fat_percentage NUMERIC(5,2),
  notes TEXT,
  photo_type VARCHAR(50) DEFAULT 'front', -- front, back, side_left, side_right
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evolution_photos ENABLE ROW LEVEL SECURITY;

-- Users can manage their own photos
CREATE POLICY "Users can manage own evolution photos"
ON public.evolution_photos
FOR ALL
USING (profile_id = get_current_profile_id())
WITH CHECK (profile_id = get_current_profile_id());

-- Instructors can view linked client photos
CREATE POLICY "Instructors can view linked client evolution photos"
ON public.evolution_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM instructor_clients ic
    WHERE ic.instructor_id = get_current_profile_id()
    AND ic.client_id = evolution_photos.profile_id
    AND ic.is_active = true
    AND ic.link_status = 'accepted'
  )
);

-- Storage policies for evolution-photos bucket
CREATE POLICY "Users can upload own evolution photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evolution-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own evolution photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evolution-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own evolution photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evolution-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Instructors can view linked client storage photos
CREATE POLICY "Instructors can view linked client storage photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evolution-photos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN instructor_clients ic ON ic.client_id = p.id
    WHERE p.user_id::text = (storage.foldername(name))[1]
    AND ic.instructor_id = get_current_profile_id()
    AND ic.is_active = true
    AND ic.link_status = 'accepted'
  )
);