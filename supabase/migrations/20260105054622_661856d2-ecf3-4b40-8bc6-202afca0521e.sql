-- Recriar função com referência explícita ao schema extensions
CREATE OR REPLACE FUNCTION public.create_master_credential(p_username text, p_password text, p_full_name text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.master_credentials (username, password_hash, full_name, is_active)
  VALUES (p_username, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), p_full_name, p_is_active)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$function$;

-- Atualizar também a função de update
CREATE OR REPLACE FUNCTION public.update_master_password(p_credential_id uuid, p_new_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.master_credentials 
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_credential_id;
  
  RETURN FOUND;
END;
$function$;

-- Atualizar função de validação
CREATE OR REPLACE FUNCTION public.validate_master_credentials(p_username text, p_password text)
 RETURNS TABLE(id uuid, username text, full_name text, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.username,
    mc.full_name,
    (mc.password_hash = extensions.crypt(p_password, mc.password_hash)) AS is_valid
  FROM public.master_credentials mc
  WHERE mc.username = p_username
    AND mc.is_active = true
  LIMIT 1;
END;
$function$;