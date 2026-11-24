-- A FK em professional_id precisa de índice próprio para joins e operações de exclusão/atualização.
CREATE INDEX IF NOT EXISTS idx_service_professionals_professional_id
  ON public.service_professionals (professional_id);
