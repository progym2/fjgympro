-- Função para criar credencial master com hash
CREATE OR REPLACE FUNCTION public.create_master_credential(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.master_credentials (username, password_hash, full_name, is_active)
  VALUES (p_username, crypt(p_password, gen_salt('bf', 10)), p_full_name, p_is_active)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Função para atualizar senha master com hash
CREATE OR REPLACE FUNCTION public.update_master_password(
  p_credential_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.master_credentials 
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_credential_id;
  
  RETURN FOUND;
END;
$$;