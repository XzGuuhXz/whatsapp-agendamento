-- Relaciona os serviços aos profissionais habilitados para atendê-los.
-- Nenhum vínculo é criado automaticamente: a coordenação deve configurar os vínculos reais.
CREATE TABLE IF NOT EXISTS public.service_professionals (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, professional_id)
);

ALTER TABLE public.service_professionals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_professionals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.service_professionals TO authenticated;
GRANT ALL ON TABLE public.service_professionals TO service_role;

DROP POLICY IF EXISTS staff_manage_service_professionals ON public.service_professionals;
CREATE POLICY staff_manage_service_professionals
  ON public.service_professionals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
        AND sp.active = true
        AND sp.role IN ('admin', 'recepcao')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = (SELECT auth.uid())
        AND sp.active = true
        AND sp.role IN ('admin', 'recepcao')
    )
  );

-- A disponibilidade só pode ser calculada quando o profissional estiver
-- explicitamente vinculado ao serviço escolhido.
CREATE OR REPLACE FUNCTION private.chatbot_slots(
  p_service uuid,
  p_professional uuid,
  p_date date,
  p_timezone text,
  p_ignore uuid DEFAULT NULL
)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT slot, slot + make_interval(mins => s.duration_minutes)
 FROM public.services s
 JOIN public.professionals p ON p.id = p_professional AND p.active
 JOIN public.service_professionals sp
   ON sp.service_id = s.id AND sp.professional_id = p.id
 JOIN public.business_hours h
   ON h.day_of_week = extract(dow FROM p_date)::integer AND h.active
 CROSS JOIN LATERAL generate_series(
   (p_date+h.opens_at) AT TIME ZONE p_timezone,
   ((p_date+h.closes_at) AT TIME ZONE p_timezone)-make_interval(mins=>s.duration_minutes),
   interval '15 minutes'
 ) slot
 WHERE s.id=p_service AND s.active AND slot>now()
 AND NOT EXISTS(
   SELECT 1 FROM public.appointments a
   WHERE a.professional_id=p_professional
     AND a.status IN ('scheduled','confirmed')
     AND (p_ignore IS NULL OR a.id<>p_ignore)
     AND a.starts_at < slot+make_interval(mins=>s.duration_minutes)
     AND a.ends_at>slot
 )
 AND NOT EXISTS(
   SELECT 1 FROM public.blocked_times b
   WHERE b.starts_at<slot+make_interval(mins=>s.duration_minutes)
     AND b.ends_at>slot
 )
 ORDER BY slot LIMIT 40;
$$;
REVOKE ALL ON FUNCTION private.chatbot_slots(uuid,uuid,date,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.chatbot_slots(uuid,uuid,date,text,uuid) TO service_role;

-- Mantém o fluxo atual, mas lista somente profissionais vinculados ao serviço escolhido.
CREATE OR REPLACE FUNCTION public.chatbot_receive(
  p_message_id text,
  p_phone text,
  p_text text,
  p_name text,
  p_timezone text
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
 ses public.conversation_sessions%ROWTYPE;
 ctx jsonb; choices jsonb; choice jsonb; reply text; input text := lower(trim(coalesce(p_text,'')));
 menu constant text := E'Olá! Escolha uma opção:\n1 - Agendar\n2 - Consultar agendamentos\n3 - Cancelar\n4 - Remarcar\nDigite menu para recomeçar.';
 next_state text; idx integer; appt public.appointments%ROWTYPE;
 client uuid; appt_id uuid; selected_date date; start_time timestamptz; end_time timestamptz;
BEGIN
 IF p_phone !~ '^[0-9]{8,15}$' OR length(p_message_id) NOT BETWEEN 1 AND 512 THEN RAISE EXCEPTION 'Invalid message'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_phone,0));
 IF EXISTS(SELECT 1 FROM public.messages WHERE whatsapp_message_id=p_message_id) THEN RETURN; END IF;
 INSERT INTO public.conversation_sessions(phone) VALUES(p_phone) ON CONFLICT(phone) DO NOTHING;
 SELECT * INTO STRICT ses FROM public.conversation_sessions WHERE phone=p_phone FOR UPDATE;
 ctx:=ses.context; next_state:=ses.state;
 IF ses.last_message_at IS NOT NULL AND ses.last_message_at < now()-interval '30 minutes' THEN ctx:='{}'; next_state:='idle'; END IF;
 INSERT INTO public.messages(session_id,phone,direction,content,whatsapp_message_id)
 VALUES(ses.id,p_phone,'incoming',left(p_text,4096),p_message_id);
 IF input IN ('menu','inicio','início','oi','olá','ola') THEN next_state:='idle'; ctx:='{}'; reply:=menu;
 ELSIF input='' THEN reply:='Envie uma mensagem de texto. Digite menu para ver as opções.';
 ELSIF next_state='idle' THEN
  IF input='1' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO choices
   FROM (SELECT id,name,duration_minutes,price FROM public.services WHERE active ORDER BY name,id LIMIT 20) x;
   IF jsonb_array_length(choices)=0 THEN reply:='Ainda não há serviços cadastrados. Entre em contato com o estabelecimento.';
   ELSE
    ctx:=jsonb_build_object('choices',choices); next_state:='service';
    SELECT E'Escolha o serviço:\n'||string_agg(n||' - '||(v->>'name')||' ('||(v->>'duration_minutes')||' min)',E'\n')
    INTO reply FROM jsonb_array_elements(choices) WITH ORDINALITY AS e(v,n);
   END IF;
  ELSIF input IN ('2','3','4') THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO choices FROM (
    SELECT a.id,a.service_id,a.professional_id,a.starts_at,s.name
    FROM public.appointments a
    JOIN public.clients c ON c.id=a.client_id
    JOIN public.services s ON s.id=a.service_id
    WHERE c.phone=p_phone AND a.status IN ('scheduled','confirmed') AND a.starts_at>now()
    ORDER BY a.starts_at LIMIT 20
   ) x;
   IF jsonb_array_length(choices)=0 THEN reply:='Você não tem agendamentos futuros. Digite menu para voltar.';
   ELSE
    SELECT E'Seus agendamentos:\n'||string_agg(n||' - '||(v->>'name')||' em '||to_char((v->>'starts_at')::timestamptz AT TIME ZONE p_timezone,'DD/MM/YYYY HH24:MI'),E'\n')
    INTO reply FROM jsonb_array_elements(choices) WITH ORDINALITY AS e(v,n);
    IF input IN ('3','4') THEN
     next_state:='appointment';ctx:=jsonb_build_object('choices',choices,'action',input);
     reply:=reply||E'\nEnvie o número do agendamento.';
    ELSE reply:=reply||E'\nDigite menu para voltar.'; END IF;
   END IF;
  ELSE reply:=menu; END IF;
 ELSIF next_state IN ('service','professional','slot','appointment') THEN
  choices:=ctx->'choices'; idx:=NULL;
  IF input ~ '^[0-9]{1,2}$' THEN idx:=input::integer; END IF;
  IF idx IS NULL OR idx<1 OR idx>jsonb_array_length(choices) THEN reply:='Opção inválida. Envie um dos números da lista ou digite menu.';
  ELSE
   choice:=choices->(idx-1);
   IF next_state='service' THEN
    ctx:=jsonb_build_object('service_id',choice->>'id');
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO choices
    FROM (
      SELECT p.id,p.name
      FROM public.professionals p
      JOIN public.service_professionals sp ON sp.professional_id=p.id
      WHERE p.active AND sp.service_id=(ctx->>'service_id')::uuid
      ORDER BY p.name,p.id LIMIT 20
    ) x;
    IF jsonb_array_length(choices)=0 THEN
     reply:='Ainda não há profissionais vinculados a este serviço. Entre em contato com o estabelecimento.';
     next_state:='idle';ctx:='{}';
    ELSE
     ctx:=ctx||jsonb_build_object('choices',choices);next_state:='professional';
     SELECT E'Escolha o profissional:\n'||string_agg(n||' - '||(v->>'name'),E'\n')
     INTO reply FROM jsonb_array_elements(choices) WITH ORDINALITY AS e(v,n);
    END IF;
   ELSIF next_state='professional' THEN
    ctx:=ctx-'choices'||jsonb_build_object('professional_id',choice->>'id');next_state:='date';
    reply:='Qual dia? Envie DD/MM/AAAA (até 90 dias à frente).';
   ELSIF next_state='appointment' THEN
    SELECT a.* INTO appt FROM public.appointments a JOIN public.clients c ON c.id=a.client_id
    WHERE a.id=(choice->>'id')::uuid AND c.phone=p_phone
      AND a.status IN ('scheduled','confirmed') AND a.starts_at>now();
    IF NOT FOUND THEN next_state:='idle';ctx:='{}';reply:='Agendamento indisponível. Digite menu para atualizar.';
    ELSIF ctx->>'action'='3' THEN
     ctx:=jsonb_build_object('appointment_id',appt.id);next_state:='cancel_confirm';reply:='Confirma o cancelamento? Envie sim ou não.';
    ELSE
     ctx:=jsonb_build_object('appointment_id',appt.id,'service_id',appt.service_id,'professional_id',appt.professional_id);
     next_state:='date';reply:='Qual a nova data? Envie DD/MM/AAAA. O horário atual será mantido até a confirmação.';
    END IF;
   ELSE
    ctx:=ctx-'choices'||jsonb_build_object('starts_at',choice->>'starts_at','ends_at',choice->>'ends_at');
    IF ctx ? 'appointment_id' THEN
     next_state:='confirm';
     reply:='Confirma remarcar para '||to_char((choice->>'starts_at')::timestamptz AT TIME ZONE p_timezone,'DD/MM/YYYY HH24:MI')||'? Envie sim ou não.';
    ELSE next_state:='name';reply:='Qual o seu nome?';END IF;
   END IF;
  END IF;
 ELSIF next_state='date' THEN
  selected_date:=NULL;
  IF input ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN
   BEGIN
    selected_date:=to_date(input,'DD/MM/YYYY');
    IF to_char(selected_date,'DD/MM/YYYY')<>input THEN selected_date:=NULL;END IF;
   EXCEPTION WHEN OTHERS THEN selected_date:=NULL; END;
  END IF;
  IF selected_date IS NULL OR selected_date<(now() AT TIME ZONE p_timezone)::date
     OR selected_date>(now() AT TIME ZONE p_timezone)::date+90 THEN
   reply:='Data inválida. Use DD/MM/AAAA, de hoje até 90 dias à frente.';
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO choices
   FROM private.chatbot_slots((ctx->>'service_id')::uuid,(ctx->>'professional_id')::uuid,
     selected_date,p_timezone,(ctx->>'appointment_id')::uuid) x;
   IF jsonb_array_length(choices)=0 THEN reply:='Não há horários livres nesse dia. Envie outra data ou digite menu.';
   ELSE
    ctx:=ctx||jsonb_build_object('choices',choices);next_state:='slot';
    SELECT E'Escolha o horário:\n'||string_agg(n||' - '||to_char((v->>'starts_at')::timestamptz AT TIME ZONE p_timezone,'HH24:MI'),E'\n')
    INTO reply FROM jsonb_array_elements(choices) WITH ORDINALITY AS e(v,n);
   END IF;
  END IF;
 ELSIF next_state='name' THEN
  IF length(trim(p_text)) NOT BETWEEN 2 AND 100 THEN reply:='Envie um nome entre 2 e 100 caracteres.';
  ELSE
   ctx:=ctx||jsonb_build_object('name',trim(p_text));next_state:='confirm';
   reply:='Confirma agendar para '||to_char((ctx->>'starts_at')::timestamptz AT TIME ZONE p_timezone,'DD/MM/YYYY HH24:MI')||'? Envie sim ou não.';
  END IF;
 ELSIF next_state IN ('confirm','cancel_confirm') THEN
  IF input IN ('nao','não','n') THEN next_state:='idle';ctx:='{}';reply:='Operação descartada. Digite menu para voltar.';
  ELSIF input NOT IN ('sim','s') THEN reply:='Envie sim para confirmar ou não para desistir.';
  ELSIF next_state='cancel_confirm' THEN
   UPDATE public.appointments a SET status='cancelled' FROM public.clients c
   WHERE a.id=(ctx->>'appointment_id')::uuid AND c.id=a.client_id AND c.phone=p_phone
     AND a.status IN ('scheduled','confirmed') AND a.starts_at>now();
   IF FOUND THEN reply:='Agendamento cancelado. Digite menu para voltar.';
   ELSE reply:='Este agendamento não pode mais ser cancelado. Digite menu.'; END IF;
   next_state:='idle';ctx:='{}';
  ELSE
   start_time:=(ctx->>'starts_at')::timestamptz;end_time:=(ctx->>'ends_at')::timestamptz;
   PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ctx->>'professional_id',1));
   IF NOT EXISTS(
     SELECT 1 FROM private.chatbot_slots((ctx->>'service_id')::uuid,(ctx->>'professional_id')::uuid,
       (start_time AT TIME ZONE p_timezone)::date,p_timezone,(ctx->>'appointment_id')::uuid) x
     WHERE x.starts_at=start_time AND x.ends_at=end_time
   ) THEN
    next_state:='date';reply:='Esse horário não está mais disponível. Envie outra data (DD/MM/AAAA).';
   ELSE
    BEGIN
     IF ctx ? 'appointment_id' THEN
      UPDATE public.appointments a SET starts_at=start_time,ends_at=end_time
      FROM public.clients c
      WHERE a.id=(ctx->>'appointment_id')::uuid AND c.id=a.client_id AND c.phone=p_phone
        AND a.status IN ('scheduled','confirmed') AND a.starts_at>now()
      RETURNING a.id INTO appt_id;
      IF appt_id IS NULL THEN RAISE EXCEPTION 'Appointment changed' USING ERRCODE='P0002';END IF;
      reply:='Agendamento remarcado com sucesso!';
     ELSE
      INSERT INTO public.clients(name,phone) VALUES(ctx->>'name',p_phone)
      ON CONFLICT(phone) DO UPDATE SET name=excluded.name RETURNING id INTO client;
      INSERT INTO public.appointments(client_id,service_id,professional_id,starts_at,ends_at)
      VALUES(client,(ctx->>'service_id')::uuid,(ctx->>'professional_id')::uuid,start_time,end_time)
      RETURNING id INTO appt_id;
      UPDATE public.conversation_sessions SET client_id=client WHERE id=ses.id;
      reply:='Agendamento realizado com sucesso!';
     END IF;
     reply:=reply||' '||to_char(start_time AT TIME ZONE p_timezone,'DD/MM/YYYY HH24:MI')||E'\nDigite menu para consultar ou cancelar.';
     next_state:='idle';ctx:='{}';
    EXCEPTION WHEN exclusion_violation THEN next_state:='date';reply:='Esse horário acabou de ser reservado. Envie outra data.';
     WHEN no_data_found THEN next_state:='idle';ctx:='{}';reply:='O agendamento foi alterado. Digite menu para consultar.';
    END;
   END IF;
  END IF;
 ELSE next_state:='idle';ctx:='{}';reply:=menu;
 END IF;
 UPDATE public.conversation_sessions SET state=next_state,context=ctx,last_message_at=now() WHERE id=ses.id;
 INSERT INTO public.chatbot_outbox(incoming_id,session_id,phone,content) VALUES(p_message_id,ses.id,p_phone,reply);
END $$;
REVOKE ALL ON FUNCTION public.chatbot_receive(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.chatbot_receive(text,text,text,text,text) TO service_role;
