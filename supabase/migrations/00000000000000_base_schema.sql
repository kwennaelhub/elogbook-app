--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

--
-- Name: des_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.des_level AS ENUM (
    'DES1',
    'DES2',
    'DES3',
    'DES4',
    'DES5'
);


--
-- Name: entry_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entry_mode AS ENUM (
    'prospective',
    'retrospective'
);


--
-- Name: garde_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.garde_source AS ENUM (
    'user',
    'admin'
);


--
-- Name: garde_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.garde_type AS ENUM (
    'day',
    'night',
    '24h',
    'weekend'
);


--
-- Name: operator_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.operator_role AS ENUM (
    'observer',
    'assistant',
    'supervised_operator',
    'autonomous_operator'
);


--
-- Name: patient_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patient_type AS ENUM (
    'real',
    'simulation'
);


--
-- Name: subscription_plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_plan AS ENUM (
    'free',
    'premium',
    'institutional'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'expired',
    'cancelled'
);


--
-- Name: surgery_context; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.surgery_context AS ENUM (
    'programmed',
    'emergency'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'student',
    'supervisor',
    'admin',
    'superadmin',
    'developer'
);


--
-- Name: get_user_hospital_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_hospital_id(user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT hospital_id FROM profiles WHERE id = user_id; $$;


--
-- Name: get_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT role FROM profiles WHERE id = user_id; $$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ DECLARE v_registry des_registry%ROWTYPE; v_matricule TEXT; BEGIN v_matricule := NEW.raw_user_meta_data->>'matricule'; IF v_matricule IS NOT NULL AND v_matricule <> '' THEN SELECT * INTO v_registry FROM des_registry WHERE matricule = v_matricule AND is_active = true; END IF; INSERT INTO profiles (id, email, first_name, last_name, des_level, matricule, registry_id) VALUES ( NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name', COALESCE(v_registry.first_name, '')), COALESCE(NEW.raw_user_meta_data->>'last_name', COALESCE(v_registry.last_name, '')), v_registry.des_level, NULLIF(v_matricule, '' ), v_registry.id ); INSERT INTO subscriptions (user_id, plan, status) VALUES (NEW.id, 'free', 'active'); RETURN NEW; END; $$;


--
-- Name: has_active_subscription(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_active_subscription(uid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = uid AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM seat_assignments sa
    JOIN institutional_seats ist ON ist.id = sa.institutional_seat_id
    JOIN subscriptions s ON s.id = ist.subscription_id
    WHERE sa.user_id = uid AND sa.is_active = true AND s.status = 'active'
  );
END;
$$;


--
-- Name: set_entry_mode(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_entry_mode() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.submitted_at - (NEW.intervention_date + INTERVAL '23 hours 59 minutes') > INTERVAL '48 hours' THEN
    NEW.entry_mode = 'retrospective';
  ELSE
    NEW.entry_mode = 'prospective';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: verify_des_registration(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_des_registration(p_matricule text, p_email text) RETURNS TABLE(is_valid boolean, registry_id uuid, des_level public.des_level, first_name text, last_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS is_valid,
    dr.id AS registry_id,
    dr.des_level,
    dr.first_name,
    dr.last_name
  FROM des_registry dr
  WHERE dr.matricule = p_matricule
    AND (dr.email = p_email OR dr.email IS NULL)
    AND dr.is_active = true;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adhesion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adhesion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    hospital_id uuid,
    hospital_other text,
    specialty_id uuid,
    des_level text NOT NULL,
    promotion_year integer,
    motivation text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT adhesion_requests_des_level_check CHECK ((des_level = ANY (ARRAY['DES1'::text, 'DES2'::text, 'DES3'::text, 'DES4'::text, 'DES5'::text]))),
    CONSTRAINT adhesion_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cro_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cro_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    specialty_id uuid,
    content jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text
);


--
-- Name: des_objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.des_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    des_level text NOT NULL,
    category text DEFAULT 'quantitative'::text NOT NULL,
    label text NOT NULL,
    target_count integer DEFAULT 0 NOT NULL,
    description text,
    specialty_name text,
    procedure_name text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: des_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.des_registry (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    matricule text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    des_level public.des_level NOT NULL,
    promotion_year integer NOT NULL,
    university text DEFAULT 'Université d''Abomey-Calavi'::text NOT NULL,
    specialty text,
    is_active boolean DEFAULT true NOT NULL,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    matricule_long text
);


--
-- Name: entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entries (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    intervention_date date NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    entry_mode public.entry_mode NOT NULL,
    context public.surgery_context NOT NULL,
    patient_type public.patient_type NOT NULL,
    operator_role public.operator_role NOT NULL,
    hospital_id uuid NOT NULL,
    other_hospital text,
    specialty_id uuid,
    segment_id uuid,
    procedure_id uuid,
    other_specialty text,
    other_procedure text,
    notes text,
    geo_latitude double precision,
    geo_longitude double precision,
    geo_accuracy double precision,
    geo_captured_at timestamp with time zone,
    attestation_checked boolean DEFAULT false NOT NULL,
    attestation_text text,
    attestation_at timestamp with time zone,
    supervisor_id uuid,
    is_validated boolean DEFAULT false NOT NULL,
    validated_at timestamp with time zone,
    validated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_retrospective_attestation CHECK (((entry_mode = 'prospective'::public.entry_mode) OR (attestation_checked = true)))
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    user_name text,
    user_role text,
    rating integer NOT NULL,
    category text NOT NULL,
    message text NOT NULL,
    ease_of_use integer,
    would_recommend text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_ease_of_use_check CHECK (((ease_of_use >= 1) AND (ease_of_use <= 10))),
    CONSTRAINT feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT feedback_would_recommend_check CHECK ((would_recommend = ANY (ARRAY['yes'::text, 'maybe'::text, 'no'::text])))
);


--
-- Name: followup_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.followup_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    followup_id uuid NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    event_date date DEFAULT CURRENT_DATE NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT followup_events_event_type_check CHECK ((event_type = ANY (ARRAY['complication'::text, 'reprise_bloc'::text, 'note'::text, 'observation'::text, 'amelioration'::text])))
);


--
-- Name: gardes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gardes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    type public.garde_type NOT NULL,
    source public.garde_source DEFAULT 'user'::public.garde_source NOT NULL,
    service text,
    senior_name text,
    senior_id uuid,
    hospital_id uuid,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospitals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    city text DEFAULT 'Cotonou'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: institutional_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutional_seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    hospital_id uuid,
    max_seats integer DEFAULT 20 NOT NULL,
    used_seats integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: instruments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instruments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    image_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    category text,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_followups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entry_id uuid,
    anonymous_id text NOT NULL,
    intervention_date date NOT NULL,
    discharge_date date,
    outcome text DEFAULT 'pending'::text NOT NULL,
    complication_type text,
    complication_date date,
    age_range text,
    sex text,
    asa_score integer,
    notes text,
    follow_up_days integer GENERATED ALWAYS AS (
CASE
    WHEN (discharge_date IS NOT NULL) THEN (discharge_date - intervention_date)
    ELSE NULL::integer
END) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cause_of_death text,
    CONSTRAINT patient_followups_age_range_check CHECK ((age_range = ANY (ARRAY['0-5'::text, '6-15'::text, '16-25'::text, '26-40'::text, '41-60'::text, '61-75'::text, '75+'::text]))),
    CONSTRAINT patient_followups_asa_score_check CHECK (((asa_score >= 1) AND (asa_score <= 5))),
    CONSTRAINT patient_followups_outcome_check CHECK ((outcome = ANY (ARRAY['en_cours'::text, 'exeat'::text, 'decede'::text]))),
    CONSTRAINT patient_followups_sex_check CHECK ((sex = ANY (ARRAY['M'::text, 'F'::text])))
);


--
-- Name: preop_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preop_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    specialty_id uuid,
    items jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text
);


--
-- Name: prescription_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    specialty_id uuid,
    content jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text
);


--
-- Name: procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedures (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    specialty_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    role public.user_role DEFAULT 'student'::public.user_role NOT NULL,
    des_level public.des_level,
    hospital_id uuid,
    phone text,
    matricule text,
    registry_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    avatar_url text,
    date_of_birth date
);


--
-- Name: seat_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institutional_seat_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: specialties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specialties (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    level integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    institution_id uuid,
    plan public.subscription_plan DEFAULT 'free'::public.subscription_plan NOT NULL,
    status public.subscription_status DEFAULT 'active'::public.subscription_status NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    payment_provider text,
    payment_reference text,
    amount_fcfa integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supervisor_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supervisor_assignments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    supervisor_id uuid NOT NULL,
    student_id uuid NOT NULL,
    hospital_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: surgical_techniques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surgical_techniques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    specialty_id uuid,
    procedure_id uuid,
    steps text[] DEFAULT ARRAY[]::text[] NOT NULL,
    tips text,
    contraindications text,
    refs text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text
);


--
-- Name: adhesion_requests adhesion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adhesion_requests
    ADD CONSTRAINT adhesion_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: cro_templates cro_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cro_templates
    ADD CONSTRAINT cro_templates_pkey PRIMARY KEY (id);


--
-- Name: des_objectives des_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.des_objectives
    ADD CONSTRAINT des_objectives_pkey PRIMARY KEY (id);


--
-- Name: des_registry des_registry_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.des_registry
    ADD CONSTRAINT des_registry_email_key UNIQUE (email);


--
-- Name: des_registry des_registry_matricule_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.des_registry
    ADD CONSTRAINT des_registry_matricule_key UNIQUE (matricule);


--
-- Name: des_registry des_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.des_registry
    ADD CONSTRAINT des_registry_pkey PRIMARY KEY (id);


--
-- Name: entries entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: followup_events followup_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_events
    ADD CONSTRAINT followup_events_pkey PRIMARY KEY (id);


--
-- Name: gardes gardes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gardes
    ADD CONSTRAINT gardes_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_name_key UNIQUE (name);


--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);


--
-- Name: institutional_seats institutional_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutional_seats
    ADD CONSTRAINT institutional_seats_pkey PRIMARY KEY (id);


--
-- Name: instruments instruments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruments
    ADD CONSTRAINT instruments_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: patient_followups patient_followups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_followups
    ADD CONSTRAINT patient_followups_pkey PRIMARY KEY (id);


--
-- Name: preop_templates preop_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preop_templates
    ADD CONSTRAINT preop_templates_pkey PRIMARY KEY (id);


--
-- Name: prescription_templates prescription_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_pkey PRIMARY KEY (id);


--
-- Name: procedures procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_matricule_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_matricule_key UNIQUE (matricule);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: seat_assignments seat_assignments_institutional_seat_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_institutional_seat_id_user_id_key UNIQUE (institutional_seat_id, user_id);


--
-- Name: seat_assignments seat_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_pkey PRIMARY KEY (id);


--
-- Name: specialties specialties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialties
    ADD CONSTRAINT specialties_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: supervisor_assignments supervisor_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_assignments
    ADD CONSTRAINT supervisor_assignments_pkey PRIMARY KEY (id);


--
-- Name: supervisor_assignments supervisor_assignments_supervisor_id_student_id_hospital_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_assignments
    ADD CONSTRAINT supervisor_assignments_supervisor_id_student_id_hospital_id_key UNIQUE (supervisor_id, student_id, hospital_id);


--
-- Name: surgical_techniques surgical_techniques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_techniques
    ADD CONSTRAINT surgical_techniques_pkey PRIMARY KEY (id);


--
-- Name: idx_adhesion_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adhesion_email ON public.adhesion_requests USING btree (email);


--
-- Name: idx_adhesion_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adhesion_status ON public.adhesion_requests USING btree (status);


--
-- Name: idx_assignments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_student ON public.supervisor_assignments USING btree (student_id);


--
-- Name: idx_assignments_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_supervisor ON public.supervisor_assignments USING btree (supervisor_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_user ON public.audit_log USING btree (user_id);


--
-- Name: idx_cro_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cro_specialty ON public.cro_templates USING btree (specialty_id);


--
-- Name: idx_des_registry_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_des_registry_email ON public.des_registry USING btree (email);


--
-- Name: idx_des_registry_matricule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_des_registry_matricule ON public.des_registry USING btree (matricule);


--
-- Name: idx_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_date ON public.entries USING btree (intervention_date DESC);


--
-- Name: idx_entries_hospital; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_hospital ON public.entries USING btree (hospital_id);


--
-- Name: idx_entries_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_mode ON public.entries USING btree (entry_mode);


--
-- Name: idx_entries_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_specialty ON public.entries USING btree (specialty_id);


--
-- Name: idx_entries_submitted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_submitted ON public.entries USING btree (submitted_at DESC);


--
-- Name: idx_entries_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_supervisor ON public.entries USING btree (supervisor_id);


--
-- Name: idx_entries_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_user ON public.entries USING btree (user_id);


--
-- Name: idx_entries_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entries_user_date ON public.entries USING btree (user_id, intervention_date DESC);


--
-- Name: idx_followup_events_followup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followup_events_followup ON public.followup_events USING btree (followup_id);


--
-- Name: idx_followup_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followup_events_user ON public.followup_events USING btree (user_id);


--
-- Name: idx_followups_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followups_entry ON public.patient_followups USING btree (entry_id) WHERE (entry_id IS NOT NULL);


--
-- Name: idx_followups_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followups_outcome ON public.patient_followups USING btree (outcome);


--
-- Name: idx_followups_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followups_user ON public.patient_followups USING btree (user_id);


--
-- Name: idx_gardes_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gardes_date ON public.gardes USING btree (date);


--
-- Name: idx_gardes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gardes_user ON public.gardes USING btree (user_id);


--
-- Name: idx_gardes_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gardes_user_date ON public.gardes USING btree (user_id, date);


--
-- Name: idx_instruments_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruments_category ON public.instruments USING btree (category);


--
-- Name: idx_notes_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_category ON public.notes USING btree (category) WHERE (category IS NOT NULL);


--
-- Name: idx_notes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_user_id ON public.notes USING btree (user_id);


--
-- Name: idx_procedures_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_specialty ON public.procedures USING btree (specialty_id);


--
-- Name: idx_profiles_des_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_des_level ON public.profiles USING btree (des_level);


--
-- Name: idx_profiles_hospital; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_hospital ON public.profiles USING btree (hospital_id);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_registry_matricule_long; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registry_matricule_long ON public.des_registry USING btree (matricule_long);


--
-- Name: idx_seat_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seat_assignments_user ON public.seat_assignments USING btree (user_id);


--
-- Name: idx_specialties_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialties_level ON public.specialties USING btree (level);


--
-- Name: idx_specialties_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialties_parent ON public.specialties USING btree (parent_id);


--
-- Name: idx_subscriptions_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_institution ON public.subscriptions USING btree (institution_id);


--
-- Name: idx_subscriptions_payment_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_payment_ref ON public.subscriptions USING btree (payment_reference);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user ON public.subscriptions USING btree (user_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: cro_templates tr_cro_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_cro_updated BEFORE UPDATE ON public.cro_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: des_registry tr_des_registry_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_des_registry_updated BEFORE UPDATE ON public.des_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: entries tr_entries_set_mode; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_entries_set_mode BEFORE INSERT ON public.entries FOR EACH ROW EXECUTE FUNCTION public.set_entry_mode();


--
-- Name: entries tr_entries_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_entries_updated BEFORE UPDATE ON public.entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: gardes tr_gardes_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_gardes_updated BEFORE UPDATE ON public.gardes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: prescription_templates tr_prescriptions_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_prescriptions_updated BEFORE UPDATE ON public.prescription_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: procedures tr_procedures_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_procedures_updated BEFORE UPDATE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles tr_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: subscriptions tr_subscriptions_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: adhesion_requests adhesion_requests_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adhesion_requests
    ADD CONSTRAINT adhesion_requests_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: adhesion_requests adhesion_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adhesion_requests
    ADD CONSTRAINT adhesion_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: adhesion_requests adhesion_requests_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adhesion_requests
    ADD CONSTRAINT adhesion_requests_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: cro_templates cro_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cro_templates
    ADD CONSTRAINT cro_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: cro_templates cro_templates_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cro_templates
    ADD CONSTRAINT cro_templates_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);


--
-- Name: des_objectives des_objectives_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.des_objectives
    ADD CONSTRAINT des_objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: des_objectives des_objectives_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.des_objectives
    ADD CONSTRAINT des_objectives_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: entries entries_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: entries entries_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id);


--
-- Name: entries entries_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.specialties(id);


--
-- Name: entries entries_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);


--
-- Name: entries entries_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.profiles(id);


--
-- Name: entries entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: entries entries_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.profiles(id);


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: des_registry fk_des_registry_added_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.des_registry
    ADD CONSTRAINT fk_des_registry_added_by FOREIGN KEY (added_by) REFERENCES public.profiles(id);


--
-- Name: followup_events followup_events_followup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_events
    ADD CONSTRAINT followup_events_followup_id_fkey FOREIGN KEY (followup_id) REFERENCES public.patient_followups(id) ON DELETE CASCADE;


--
-- Name: followup_events followup_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_events
    ADD CONSTRAINT followup_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gardes gardes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gardes
    ADD CONSTRAINT gardes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: gardes gardes_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gardes
    ADD CONSTRAINT gardes_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: gardes gardes_senior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gardes
    ADD CONSTRAINT gardes_senior_id_fkey FOREIGN KEY (senior_id) REFERENCES public.profiles(id);


--
-- Name: gardes gardes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gardes
    ADD CONSTRAINT gardes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: institutional_seats institutional_seats_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutional_seats
    ADD CONSTRAINT institutional_seats_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: institutional_seats institutional_seats_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutional_seats
    ADD CONSTRAINT institutional_seats_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: patient_followups patient_followups_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_followups
    ADD CONSTRAINT patient_followups_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE SET NULL;


--
-- Name: patient_followups patient_followups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_followups
    ADD CONSTRAINT patient_followups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: preop_templates preop_templates_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preop_templates
    ADD CONSTRAINT preop_templates_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);


--
-- Name: prescription_templates prescription_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: prescription_templates prescription_templates_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);


--
-- Name: procedures procedures_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);


--
-- Name: profiles profiles_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_registry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_registry_id_fkey FOREIGN KEY (registry_id) REFERENCES public.des_registry(id);


--
-- Name: seat_assignments seat_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: seat_assignments seat_assignments_institutional_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_institutional_seat_id_fkey FOREIGN KEY (institutional_seat_id) REFERENCES public.institutional_seats(id) ON DELETE CASCADE;


--
-- Name: seat_assignments seat_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_assignments
    ADD CONSTRAINT seat_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: specialties specialties_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specialties
    ADD CONSTRAINT specialties_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.specialties(id);


--
-- Name: subscriptions subscriptions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.hospitals(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: supervisor_assignments supervisor_assignments_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_assignments
    ADD CONSTRAINT supervisor_assignments_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: supervisor_assignments supervisor_assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_assignments
    ADD CONSTRAINT supervisor_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: supervisor_assignments supervisor_assignments_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_assignments
    ADD CONSTRAINT supervisor_assignments_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: surgical_techniques surgical_techniques_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_techniques
    ADD CONSTRAINT surgical_techniques_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: surgical_techniques surgical_techniques_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_techniques
    ADD CONSTRAINT surgical_techniques_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id);


--
-- Name: surgical_techniques surgical_techniques_specialty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surgical_techniques
    ADD CONSTRAINT surgical_techniques_specialty_id_fkey FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);


--
-- Name: institutional_seats Admins can view institutional seats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view institutional seats" ON public.institutional_seats FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.subscriptions s
  WHERE ((s.id = institutional_seats.subscription_id) AND (s.user_id = auth.uid())))));


--
-- Name: cro_templates Authenticated users can insert cro_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert cro_templates" ON public.cro_templates FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: instruments Authenticated users can insert instruments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert instruments" ON public.instruments FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: preop_templates Authenticated users can insert preop_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert preop_templates" ON public.preop_templates FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: prescription_templates Authenticated users can insert prescription_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert prescription_templates" ON public.prescription_templates FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: cro_templates Authenticated users can read cro_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read cro_templates" ON public.cro_templates FOR SELECT TO authenticated USING (true);


--
-- Name: instruments Authenticated users can read instruments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read instruments" ON public.instruments FOR SELECT TO authenticated USING (true);


--
-- Name: preop_templates Authenticated users can read preop_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read preop_templates" ON public.preop_templates FOR SELECT TO authenticated USING (true);


--
-- Name: prescription_templates Authenticated users can read prescription_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read prescription_templates" ON public.prescription_templates FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: adhesion_requests Service role full access adhesion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access adhesion" ON public.adhesion_requests USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: seat_assignments Service role full access seat_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access seat_assignments" ON public.seat_assignments USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: institutional_seats Service role full access seats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access seats" ON public.institutional_seats USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: subscriptions Service role full access subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access subscriptions" ON public.subscriptions USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: followup_events Users can delete their own followup events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own followup events" ON public.followup_events FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: patient_followups Users can delete their own followups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own followups" ON public.patient_followups FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notes Users can delete their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: followup_events Users can insert their own followup events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own followup events" ON public.followup_events FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: patient_followups Users can insert their own followups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own followups" ON public.patient_followups FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notes Users can insert their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notes" ON public.notes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: followup_events Users can read their own followup events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own followup events" ON public.followup_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: patient_followups Users can read their own followups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own followups" ON public.patient_followups FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notes Users can read their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own notes" ON public.notes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: patient_followups Users can update their own followups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own followups" ON public.patient_followups FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notes Users can update their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: seat_assignments Users can view own seat assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own seat assignments" ON public.seat_assignments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: adhesion_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.adhesion_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: adhesion_requests adhesion_requests_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY adhesion_requests_select_admin ON public.adhesion_requests FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: adhesion_requests adhesion_requests_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY adhesion_requests_service_role ON public.adhesion_requests TO service_role USING (true) WITH CHECK (true);


--
-- Name: adhesion_requests adhesion_requests_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY adhesion_requests_update_admin ON public.adhesion_requests FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: audit_log audit_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_insert ON public.audit_log FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_insert ON public.audit_log FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: audit_log audit_log_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_select_admin ON public.audit_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: audit_log audit_log_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_service_role ON public.audit_log TO service_role USING (true) WITH CHECK (true);


--
-- Name: audit_log audit_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_superadmin ON public.audit_log FOR SELECT USING ((public.get_user_role(auth.uid()) = 'superadmin'::public.user_role));


--
-- Name: cro_templates cro_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cro_admin_write ON public.cro_templates USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: cro_templates cro_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cro_read ON public.cro_templates FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: des_objectives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.des_objectives ENABLE ROW LEVEL SECURITY;

--
-- Name: des_objectives des_objectives_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_objectives_admin ON public.des_objectives USING ((public.get_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])));


--
-- Name: des_objectives des_objectives_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_objectives_read ON public.des_objectives FOR SELECT USING (true);


--
-- Name: des_registry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.des_registry ENABLE ROW LEVEL SECURITY;

--
-- Name: des_registry des_registry_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_registry_admin_write ON public.des_registry USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: des_registry des_registry_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_registry_insert_admin ON public.des_registry FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: des_registry des_registry_public_check; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_registry_public_check ON public.des_registry FOR SELECT USING (true);


--
-- Name: des_registry des_registry_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_registry_select_admin ON public.des_registry FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: des_registry des_registry_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_registry_select_own ON public.des_registry FOR SELECT TO authenticated USING ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text));


--
-- Name: des_registry des_registry_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_registry_service_role ON public.des_registry TO service_role USING (true) WITH CHECK (true);


--
-- Name: des_registry des_registry_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY des_registry_update_admin ON public.des_registry FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

--
-- Name: entries entries_admin_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_admin_view ON public.entries FOR SELECT USING (((public.get_user_role(auth.uid()) = 'superadmin'::public.user_role) OR ((public.get_user_role(auth.uid()) = 'admin'::public.user_role) AND (public.get_user_hospital_id(auth.uid()) = hospital_id))));


--
-- Name: entries entries_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_delete_own ON public.entries FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: entries entries_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_insert_own ON public.entries FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: entries entries_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_own ON public.entries USING ((auth.uid() = user_id));


--
-- Name: entries entries_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_select_admin ON public.entries FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: entries entries_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_select_own ON public.entries FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: entries entries_select_supervisor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_select_supervisor ON public.entries FOR SELECT TO authenticated USING ((auth.uid() = supervisor_id));


--
-- Name: entries entries_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_service_role ON public.entries TO service_role USING (true) WITH CHECK (true);


--
-- Name: entries entries_supervisor_validate; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_supervisor_validate ON public.entries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.supervisor_assignments sa
  WHERE ((sa.supervisor_id = auth.uid()) AND (sa.student_id = entries.user_id) AND (sa.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.supervisor_assignments sa
  WHERE ((sa.supervisor_id = auth.uid()) AND (sa.student_id = entries.user_id) AND (sa.is_active = true)))));


--
-- Name: entries entries_supervisor_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_supervisor_view ON public.entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.supervisor_assignments sa
  WHERE ((sa.supervisor_id = auth.uid()) AND (sa.student_id = entries.user_id) AND (sa.is_active = true)))));


--
-- Name: entries entries_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_update_own ON public.entries FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: entries entries_update_supervisor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY entries_update_supervisor ON public.entries FOR UPDATE TO authenticated USING ((auth.uid() = supervisor_id));


--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback feedback_admin_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_admin_view ON public.feedback FOR SELECT USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: feedback feedback_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_insert ON public.feedback FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: feedback feedback_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_select_admin ON public.feedback FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role]))))));


--
-- Name: feedback feedback_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_service_role ON public.feedback TO service_role USING (true) WITH CHECK (true);


--
-- Name: followup_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.followup_events ENABLE ROW LEVEL SECURITY;

--
-- Name: gardes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gardes ENABLE ROW LEVEL SECURITY;

--
-- Name: gardes gardes_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_admin_write ON public.gardes FOR INSERT WITH CHECK ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: gardes gardes_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_delete_own ON public.gardes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: gardes gardes_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_insert_own ON public.gardes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: gardes gardes_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_own ON public.gardes FOR SELECT USING (((user_id = auth.uid()) OR (source = 'admin'::public.garde_source)));


--
-- Name: gardes gardes_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_own_delete ON public.gardes FOR DELETE USING (((user_id = auth.uid()) AND (source = 'user'::public.garde_source)));


--
-- Name: gardes gardes_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_own_update ON public.gardes FOR UPDATE USING (((user_id = auth.uid()) AND (source = 'user'::public.garde_source)));


--
-- Name: gardes gardes_own_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_own_write ON public.gardes FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (source = 'user'::public.garde_source)));


--
-- Name: gardes gardes_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_select_admin ON public.gardes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role, 'developer'::public.user_role, 'supervisor'::public.user_role]))))));


--
-- Name: gardes gardes_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_select_own ON public.gardes FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: gardes gardes_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_service_role ON public.gardes TO service_role USING (true) WITH CHECK (true);


--
-- Name: gardes gardes_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gardes_update_own ON public.gardes FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: hospitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

--
-- Name: hospitals hospitals_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hospitals_read ON public.hospitals FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: institutional_seats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institutional_seats ENABLE ROW LEVEL SECURITY;

--
-- Name: instruments instruments_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY instruments_read ON public.instruments FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_followups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_followups ENABLE ROW LEVEL SECURITY;

--
-- Name: preop_templates preop_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY preop_read ON public.preop_templates FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: prescription_templates prescriptions_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_admin_write ON public.prescription_templates USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: prescription_templates prescriptions_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_read ON public.prescription_templates FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: procedures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

--
-- Name: procedures procedures_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY procedures_admin_write ON public.procedures USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: procedures procedures_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY procedures_read ON public.procedures FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role]))) WITH CHECK ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: profiles profiles_admin_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_view ON public.profiles FOR SELECT USING (((public.get_user_role(auth.uid()) = 'superadmin'::public.user_role) OR ((public.get_user_role(auth.uid()) = 'admin'::public.user_role) AND (public.get_user_hospital_id(auth.uid()) = hospital_id))));


--
-- Name: profiles profiles_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_own ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles profiles_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_own_update ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: profiles profiles_supervisor_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_supervisor_view ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.supervisor_assignments sa
  WHERE ((sa.supervisor_id = auth.uid()) AND (sa.student_id = profiles.id) AND (sa.is_active = true)))));


--
-- Name: seat_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: specialties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

--
-- Name: specialties specialties_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY specialties_admin_write ON public.specialties USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: specialties specialties_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY specialties_read ON public.specialties FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_admin_view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_admin_view ON public.subscriptions FOR SELECT USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: subscriptions subscriptions_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_admin_write ON public.subscriptions USING ((public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::public.user_role, 'superadmin'::public.user_role])));


--
-- Name: subscriptions subscriptions_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_own ON public.subscriptions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: supervisor_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supervisor_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: surgical_techniques techniques_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY techniques_admin ON public.surgical_techniques USING ((public.get_user_role() = ANY (ARRAY['admin'::text, 'superadmin'::text])));


--
-- Name: surgical_techniques techniques_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY techniques_read ON public.surgical_techniques FOR SELECT USING (true);


--
-- PostgreSQL database dump complete
--


