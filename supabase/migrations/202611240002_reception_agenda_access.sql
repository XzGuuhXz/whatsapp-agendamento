-- Acesso da recepção à agenda e configuração do expediente.
-- Dados de pacientes permanecem restritos a funcionários ativos.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointments' AND policyname='staff_read_appointments') THEN
    CREATE POLICY staff_read_appointments ON public.appointments
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=(SELECT auth.uid()) AND sp.active=true AND sp.role IN ('admin','recepcao')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='appointments' AND policyname='staff_update_appointments') THEN
    CREATE POLICY staff_update_appointments ON public.appointments
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=(SELECT auth.uid()) AND sp.active=true AND sp.role IN ('admin','recepcao')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=(SELECT auth.uid()) AND sp.active=true AND sp.role IN ('admin','recepcao')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='staff_read_clients') THEN
    CREATE POLICY staff_read_clients ON public.clients
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=(SELECT auth.uid()) AND sp.active=true AND sp.role IN ('admin','recepcao')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_hours' AND policyname='staff_manage_business_hours') THEN
    CREATE POLICY staff_manage_business_hours ON public.business_hours
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=(SELECT auth.uid()) AND sp.active=true AND sp.role IN ('admin','recepcao')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=(SELECT auth.uid()) AND sp.active=true AND sp.role IN ('admin','recepcao')));
  END IF;
END $$;

GRANT SELECT ON public.appointments, public.clients TO authenticated;
GRANT UPDATE (status) ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;

-- Nenhuma permissão de escrita é concedida ao papel público.
REVOKE ALL ON public.appointments, public.clients, public.business_hours FROM anon;
