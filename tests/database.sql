-- Executar no SQL Editor como postgres: os dados são descartados por ROLLBACK.
BEGIN;
DO $$
DECLARE s uuid; p uuid; a uuid; session_id uuid; answer text; target_date date;
 test_phone constant text := '5500000000001'; i integer:=0; reply public.chatbot_outbox%ROWTYPE;
BEGIN
 INSERT INTO public.services(name,duration_minutes,price) VALUES('ZZZ teste temporário',30,50) RETURNING id INTO s;
 INSERT INTO public.professionals(name) VALUES('ZZZ teste temporário') RETURNING id INTO p;
 target_date := (now() AT TIME ZONE 'America/Campo_Grande')::date+1;
 WHILE extract(dow FROM target_date)=0 LOOP target_date:=target_date+1; END LOOP;
 PERFORM public.chatbot_receive('test-0',test_phone,'oi','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-0',test_phone,'oi','Teste','America/Campo_Grande');
 IF (SELECT count(*) FROM public.messages WHERE whatsapp_message_id='test-0')<>1 OR (SELECT count(*) FROM public.chatbot_outbox WHERE incoming_id='test-0')<>1 THEN RAISE EXCEPTION 'Deduplication failed';END IF;
 PERFORM public.chatbot_receive('test-1',test_phone,'1','Teste','America/Campo_Grande');
 -- Usar a posição do serviço/profissional temporário, sem depender de um catálogo vazio.
 SELECT ordinality::integer INTO i FROM public.conversation_sessions cs, jsonb_array_elements(cs.context->'choices') WITH ORDINALITY c(v,ordinality) WHERE cs.phone=test_phone AND v->>'id'=s::text;
 PERFORM public.chatbot_receive('test-2',test_phone,i::text,'Teste','America/Campo_Grande');
 SELECT ordinality::integer INTO i FROM public.conversation_sessions cs, jsonb_array_elements(cs.context->'choices') WITH ORDINALITY c(v,ordinality) WHERE cs.phone=test_phone AND v->>'id'=p::text;
 PERFORM public.chatbot_receive('test-3',test_phone,i::text,'Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-4',test_phone,'31/02/2099','Teste','America/Campo_Grande');
 IF (SELECT state FROM public.conversation_sessions WHERE conversation_sessions.phone=test_phone)<>'date' THEN RAISE EXCEPTION 'Invalid date handling failed';END IF;
 PERFORM public.chatbot_receive('test-5',test_phone,to_char(target_date,'DD/MM/YYYY'),'Teste','America/Campo_Grande');
 IF (SELECT state FROM public.conversation_sessions WHERE conversation_sessions.phone=test_phone)<>'slot' THEN RAISE EXCEPTION 'Slots failed';END IF;
 PERFORM public.chatbot_receive('test-6',test_phone,'1','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-7',test_phone,'Cliente de teste','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-8',test_phone,'sim','Teste','America/Campo_Grande');
 SELECT ap.id INTO a FROM public.appointments ap JOIN public.clients c ON c.id=ap.client_id WHERE c.phone=test_phone;
 IF a IS NULL THEN RAISE EXCEPTION 'Booking failed';END IF;
 PERFORM public.chatbot_receive('test-8',test_phone,'sim','Teste','America/Campo_Grande');
 IF (SELECT count(*) FROM public.appointments ap JOIN public.clients c ON c.id=ap.client_id WHERE c.phone=test_phone)<>1 THEN RAISE EXCEPTION 'Duplicate booking';END IF;
 PERFORM public.chatbot_receive('test-9',test_phone,'4','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-10',test_phone,'1','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-11',test_phone,to_char(target_date,'DD/MM/YYYY'),'Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-12',test_phone,'2','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-13',test_phone,'sim','Teste','America/Campo_Grande');
 IF (SELECT count(*) FROM public.appointments ap JOIN public.clients c ON c.id=ap.client_id WHERE c.phone=test_phone)<>1 THEN RAISE EXCEPTION 'Reschedule created a duplicate';END IF;
 PERFORM public.chatbot_receive('test-14',test_phone,'3','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-15',test_phone,'1','Teste','America/Campo_Grande');
 PERFORM public.chatbot_receive('test-16',test_phone,'sim','Teste','America/Campo_Grande');
 IF (SELECT status FROM public.appointments WHERE id=a)<>'cancelled' THEN RAISE EXCEPTION 'Cancel failed';END IF;
 SELECT * INTO reply FROM public.chatbot_claim_reply(test_phone);
 IF reply.id IS NULL THEN RAISE EXCEPTION 'Claim failed';END IF;
 IF EXISTS(SELECT 1 FROM public.chatbot_claim_reply(test_phone)) THEN RAISE EXCEPTION 'Concurrent reply claim allowed';END IF;
 PERFORM public.chatbot_finish_reply(reply.id,reply.claim_token,'wamid.test-outgoing',NULL);
 IF NOT EXISTS(SELECT 1 FROM public.messages WHERE whatsapp_message_id='wamid.test-outgoing' AND direction='outgoing') THEN RAISE EXCEPTION 'Outbox log failed';END IF;
 IF has_function_privilege('anon','public.chatbot_receive(text,text,text,text,text)','EXECUTE') OR has_table_privilege('anon','public.chatbot_outbox','SELECT') THEN RAISE EXCEPTION 'Public access to private operations';END IF;
END $$;
SELECT 'PASS: booking, date validation, rescheduling, cancellation, deduplication, outbox lease, message logging, permissions' AS tests;
ROLLBACK;
