-- Schema-base isolado para testes de integração.
-- Reproduz somente estrutura (sem registros) do banco original do chatbot.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (closes_at > opens_at)
);

CREATE TABLE public.blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE public.conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  phone text NOT NULL,
  state text NOT NULL DEFAULT 'idle',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.conversation_sessions(id),
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('incoming','outgoing')),
  message_type text NOT NULL DEFAULT 'text',
  content text,
  whatsapp_message_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  professional_id uuid NOT NULL REFERENCES public.professionals(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_services_active ON public.services(active);
CREATE INDEX idx_professionals_active ON public.professionals(active);
CREATE INDEX idx_business_hours_day ON public.business_hours(day_of_week);
CREATE INDEX idx_blocked_times_start ON public.blocked_times(starts_at);
CREATE INDEX idx_blocked_times_end ON public.blocked_times(ends_at);
CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_appointments_service ON public.appointments(service_id);
CREATE INDEX idx_appointments_professional ON public.appointments(professional_id);
CREATE INDEX idx_appointments_starts_at ON public.appointments(starts_at);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX appointments_no_overlap
  ON public.appointments USING gist (professional_id, tstzrange(starts_at, ends_at, '[)'))
  WHERE status IN ('scheduled','confirmed');
CREATE INDEX idx_conversation_sessions_client ON public.conversation_sessions(client_id);
CREATE INDEX idx_conversation_sessions_phone ON public.conversation_sessions(phone);
CREATE INDEX idx_messages_phone ON public.messages(phone);
CREATE INDEX idx_messages_session ON public.messages(session_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
