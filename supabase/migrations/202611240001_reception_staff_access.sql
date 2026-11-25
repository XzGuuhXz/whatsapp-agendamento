-- Acesso administrativo do painel da recepção.
-- Aplicar no Supabase SQL Editor após revisar os usuários que terão acesso.
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 100),
  role text NOT NULL DEFAULT 'recepcao' CHECK (role IN ('admin', 'recepcao')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.staff_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.staff_profiles TO authenticated;

DROP POLICY IF EXISTS staff_read_own_profile ON public.staff_profiles;
CREATE POLICY staff_read_own_profile
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- O perfil não pode ser criado nem promovido pelo próprio funcionário via API.
-- Cadastros e mudanças de função devem ser feitos por um administrador no SQL Editor.

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO authenticated;

DROP POLICY IF EXISTS staff_manage_services ON public.services;
CREATE POLICY staff_manage_services
  ON public.services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
        AND sp.active = true
        AND sp.role IN ('admin', 'recepcao')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
        AND sp.active = true
        AND sp.role IN ('admin', 'recepcao')
    )
  );

-- Nenhuma permissão é concedida à chave anon para criar ou alterar serviços.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.services FROM anon;

-- O cadastro de profissionais também é restrito a funcionários ativos.
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.professionals TO authenticated;

DROP POLICY IF EXISTS staff_manage_professionals ON public.professionals;
CREATE POLICY staff_manage_professionals
  ON public.professionals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
        AND sp.active = true
        AND sp.role IN ('admin', 'recepcao')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
        AND sp.active = true
        AND sp.role IN ('admin', 'recepcao')
    )
  );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.professionals FROM anon;
