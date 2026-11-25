-- Reduz os dados pessoais expostos ao painel da recepção.
-- A agenda precisa apenas do nome do paciente e dos campos operacionais do agendamento.
-- Esta migration é aditiva e deve ser aplicada separadamente em cada ambiente.

REVOKE SELECT ON TABLE public.appointments, public.clients FROM PUBLIC, anon, authenticated;

GRANT SELECT (id, client_id, service_id, professional_id, starts_at, ends_at, status)
  ON TABLE public.appointments TO authenticated;
GRANT SELECT (name)
  ON TABLE public.clients TO authenticated;

-- Não permite enumerar clientes sem vínculo com um agendamento.
DROP POLICY IF EXISTS staff_read_clients ON public.clients;
CREATE POLICY staff_read_clients
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.client_id = clients.id
    )
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
        AND sp.active = true
        AND sp.role IN ('admin', 'recepcao')
    )
  );

COMMENT ON COLUMN public.clients.phone IS
  'Dado pessoal restrito; não conceder leitura direta ao painel da recepção.';
COMMENT ON COLUMN public.clients.email IS
  'Dado pessoal restrito; não conceder leitura direta ao painel da recepção.';
COMMENT ON COLUMN public.appointments.notes IS
  'Observações potencialmente sensíveis; não conceder leitura direta ao painel da recepção.';
