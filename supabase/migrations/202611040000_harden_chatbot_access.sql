-- Alterações anteriores já aplicadas no projeto existente; requer as oito tabelas originais.
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION btree_gist SET SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$ BEGIN NEW.updated_at = clock_timestamp(); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.set_updated_at() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE t text;
BEGIN
FOREACH t IN ARRAY ARRAY['clients','services','professionals','appointments','business_hours','blocked_times','conversation_sessions','messages']
LOOP
EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated',t);
EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',t);
EXECUTE format('CREATE POLICY server_access ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',t);
IF t <> 'messages' THEN
EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()',t);
END IF;
END LOOP;
END $$;
GRANT SELECT ON public.services TO anon, authenticated;
CREATE POLICY read_active_services ON public.services FOR SELECT TO anon, authenticated USING (active = true);
ALTER TABLE public.conversation_sessions ADD CONSTRAINT conversation_sessions_phone_key UNIQUE(phone);
