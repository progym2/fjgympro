-- Create trash/recycle bin table for soft-deleted items
CREATE TABLE public.deleted_items_trash (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_table TEXT NOT NULL,
  original_id UUID NOT NULL,
  item_data JSONB NOT NULL,
  deleted_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  auto_purge_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  restore_attempted_at TIMESTAMP WITH TIME ZONE,
  permanently_deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.deleted_items_trash ENABLE ROW LEVEL SECURITY;

-- Only masters can manage trash
CREATE POLICY "Masters can manage trash"
ON public.deleted_items_trash
FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- Add unique constraint to master_credentials username
ALTER TABLE public.master_credentials ADD CONSTRAINT master_credentials_username_unique UNIQUE (username);

-- Create index for efficient auto-purge queries
CREATE INDEX idx_deleted_items_auto_purge ON public.deleted_items_trash (auto_purge_at) WHERE permanently_deleted_at IS NULL;

-- Create function to auto-purge old items (can be called via cron)
CREATE OR REPLACE FUNCTION public.purge_expired_trash_items()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.deleted_items_trash
  WHERE auto_purge_at <= now() AND permanently_deleted_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;