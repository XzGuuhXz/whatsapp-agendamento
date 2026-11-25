-- Permite que o PostgREST resolva o relacionamento appointments -> clients(name).
-- A recepção precisa do identificador interno para o JOIN, mas não recebe telefone ou e-mail.

REVOKE SELECT (id) ON TABLE public.clients FROM PUBLIC, anon;
GRANT SELECT (id) ON TABLE public.clients TO authenticated;

