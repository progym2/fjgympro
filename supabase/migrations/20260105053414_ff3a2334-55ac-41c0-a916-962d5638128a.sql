-- =============================================
-- CORREÇÃO DE SEGURANÇA: Hash de senhas e RLS
-- =============================================

-- 1. Habilitar extensão pgcrypto para hash de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Adicionar coluna password_hash na tabela master_credentials
ALTER TABLE public.master_credentials 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Migrar senhas existentes para hash (bcrypt)
UPDATE public.master_credentials 
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password_hash IS NULL;

-- 4. Remover coluna de senha em texto plano (após migração)
-- Primeiro, tornar password_hash NOT NULL
ALTER TABLE public.master_credentials 
ALTER COLUMN password_hash SET NOT NULL;

-- 5. Remover a coluna password antiga (senhas em texto plano)
ALTER TABLE public.master_credentials 
DROP COLUMN IF EXISTS password;

-- =============================================
-- CORREÇÃO RLS: profiles - Remover acesso público
-- =============================================

-- 6. Remover política que expõe dados pessoais publicamente
DROP POLICY IF EXISTS "Anyone can view profile by student_id" ON public.profiles;

-- 7. Criar política mais segura para consulta de aluno (apenas dados básicos via função)
CREATE OR REPLACE FUNCTION public.get_student_basic_info(p_student_id VARCHAR)
RETURNS TABLE(
  student_id VARCHAR,
  full_name VARCHAR,
  avatar_url TEXT,
  enrollment_status VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.student_id,
    p.full_name,
    p.avatar_url,
    p.enrollment_status
  FROM public.profiles p
  WHERE p.student_id = p_student_id
  LIMIT 1;
$$;

-- =============================================
-- CORREÇÃO RLS: master_credentials - Bloquear acesso anônimo
-- =============================================

-- 8. Garantir que RLS está habilitado
ALTER TABLE public.master_credentials ENABLE ROW LEVEL SECURITY;

-- 9. Remover políticas existentes que possam estar permissivas
DROP POLICY IF EXISTS "Masters can manage all master credentials" ON public.master_credentials;

-- 10. Criar política restritiva: APENAS masters autenticados podem acessar
CREATE POLICY "Only authenticated masters can manage credentials"
ON public.master_credentials
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND is_master(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_master(auth.uid())
);

-- 11. Criar função segura para validação de credenciais master (para edge function)
CREATE OR REPLACE FUNCTION public.validate_master_credentials(
  p_username TEXT,
  p_password TEXT
)
RETURNS TABLE(
  id UUID,
  username TEXT,
  full_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.username,
    mc.full_name,
    (mc.password_hash = crypt(p_password, mc.password_hash)) AS is_valid
  FROM public.master_credentials mc
  WHERE mc.username = p_username
    AND mc.is_active = true
  LIMIT 1;
END;
$$;

-- 12. Revogar acesso direto à tabela para anon
REVOKE ALL ON public.master_credentials FROM anon;
REVOKE ALL ON public.master_credentials FROM authenticated;

-- 13. Conceder acesso apenas para service_role (edge functions)
GRANT SELECT ON public.master_credentials TO service_role;