CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'master',
    'admin',
    'instructor',
    'client'
);


--
-- Name: fitness_goal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fitness_goal AS ENUM (
    'muscle_gain',
    'weight_loss',
    'hypertrophy',
    'conditioning',
    'maintenance'
);


--
-- Name: license_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.license_status AS ENUM (
    'active',
    'expired',
    'blocked'
);


--
-- Name: license_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.license_type AS ENUM (
    'demo',
    'trial',
    'full',
    'master'
);


--
-- Name: belongs_to_tenant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.belongs_to_tenant(check_tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND tenant_id = check_tenant_id
  )
$$;


--
-- Name: can_insert_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_insert_profile(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    _user_id IS NULL 
    OR public.is_admin_or_higher(_user_id) 
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id)
$$;


--
-- Name: generate_license_key(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_license_key(prefix text DEFAULT 'LIC'::text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := prefix || '-';
  i INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: get_current_profile_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_profile_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;


--
-- Name: get_current_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin_or_higher(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_higher(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('master', 'admin')
  )
$$;


--
-- Name: is_master(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_master(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'master')
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    check_in_at timestamp with time zone DEFAULT now() NOT NULL,
    check_out_at timestamp with time zone,
    access_method character varying DEFAULT 'qrcode'::character varying,
    registered_by uuid,
    notes text,
    CONSTRAINT access_logs_access_method_check CHECK (((access_method)::text = ANY (ARRAY[('qrcode'::character varying)::text, ('manual'::character varying)::text, ('card'::character varying)::text])))
);


--
-- Name: active_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    session_token text NOT NULL,
    device_info text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity timestamp with time zone DEFAULT now() NOT NULL,
    is_valid boolean DEFAULT true NOT NULL
);


--
-- Name: exercise_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exercise_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    muscle_group character varying(100),
    equipment character varying(100),
    difficulty character varying(50),
    video_url text,
    instructions text,
    created_by uuid,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid
);


--
-- Name: hydration_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hydration_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    amount_ml integer NOT NULL,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: hydration_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hydration_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    daily_goal_ml integer DEFAULT 2000,
    reminder_enabled boolean DEFAULT false,
    reminder_interval_minutes integer DEFAULT 60,
    start_hour integer DEFAULT 6,
    end_hour integer DEFAULT 22
);


--
-- Name: instructor_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructor_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instructor_id uuid NOT NULL,
    client_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now(),
    unlinked_at timestamp with time zone,
    is_active boolean DEFAULT true,
    fitness_level_by_instructor character varying,
    link_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    responded_at timestamp with time zone,
    CONSTRAINT instructor_clients_link_status_check CHECK (((link_status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    license_key character varying(100) NOT NULL,
    license_type public.license_type DEFAULT 'full'::public.license_type NOT NULL,
    status public.license_status DEFAULT 'active'::public.license_status NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    demo_started_at timestamp with time zone,
    trial_started_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid
);

ALTER TABLE ONLY public.licenses REPLICA IDENTITY FULL;


--
-- Name: master_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: meal_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    assigned_to uuid,
    is_instructor_plan boolean DEFAULT false,
    total_calories integer,
    protein_grams integer,
    carbs_grams integer,
    fat_grams integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid
);


--
-- Name: password_reset_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    attempts integer DEFAULT 0 NOT NULL
);


--
-- Name: payment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    created_by uuid NOT NULL,
    instructor_id uuid,
    total_amount numeric NOT NULL,
    installments integer DEFAULT 1 NOT NULL,
    installment_amount numeric NOT NULL,
    description text,
    discount_percentage numeric DEFAULT 0,
    status character varying DEFAULT 'active'::character varying,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid,
    CONSTRAINT payment_plans_installments_check CHECK (((installments >= 1) AND (installments <= 12))),
    CONSTRAINT payment_plans_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instructor_id uuid,
    client_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    due_date date,
    paid_at timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    receipt_number character varying(100),
    discount_percentage numeric(5,2),
    late_fee numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    payment_method character varying DEFAULT 'pending'::character varying,
    plan_id uuid,
    installment_number integer DEFAULT 1,
    total_installments integer DEFAULT 1,
    tenant_id uuid,
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY (ARRAY[('pending'::character varying)::text, ('cash'::character varying)::text, ('pix'::character varying)::text, ('card'::character varying)::text])))
);


--
-- Name: personal_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    record_type character varying NOT NULL,
    value numeric NOT NULL,
    unit character varying DEFAULT 'kg'::character varying NOT NULL,
    achieved_at timestamp with time zone DEFAULT now() NOT NULL,
    workout_log_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT personal_records_record_type_check CHECK (((record_type)::text = ANY ((ARRAY['max_weight'::character varying, 'max_reps'::character varying, 'max_volume'::character varying, 'best_time'::character varying])::text[])))
);


--
-- Name: pre_generated_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_generated_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    license_key text NOT NULL,
    account_type text NOT NULL,
    license_duration_days integer NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_by_profile_id uuid,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    tenant_id uuid,
    CONSTRAINT pre_generated_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['client'::text, 'instructor'::text, 'admin'::text, 'trial'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    username character varying(100) NOT NULL,
    full_name character varying(255),
    email character varying(255),
    phone character varying(20),
    cref character varying(50),
    avatar_url text,
    birth_date date,
    gender character varying(20),
    height_cm numeric(5,2),
    weight_kg numeric(5,2),
    fitness_goal public.fitness_goal DEFAULT 'maintenance'::public.fitness_goal,
    fitness_level character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by_admin uuid,
    enrollment_status character varying DEFAULT 'active'::character varying,
    enrollment_date date DEFAULT CURRENT_DATE,
    freeze_start_date date,
    freeze_end_date date,
    monthly_fee numeric DEFAULT 0,
    tenant_id uuid,
    cpf character varying(14),
    city character varying(100),
    CONSTRAINT profiles_enrollment_status_check CHECK (((enrollment_status)::text = ANY (ARRAY[('active'::character varying)::text, ('cancelled'::character varying)::text, ('frozen'::character varying)::text, ('pending'::character varying)::text])))
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#dc2626'::text,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_theme_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_theme_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    theme character varying DEFAULT 'fire'::character varying NOT NULL,
    custom_primary_hsl character varying,
    custom_accent_hsl character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: weight_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    weight_kg numeric(5,2) NOT NULL,
    body_fat_percentage numeric(4,2),
    muscle_mass_kg numeric(5,2),
    notes text,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: workout_exercise_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_exercise_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_log_id uuid NOT NULL,
    workout_plan_exercise_id uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    sets_completed integer DEFAULT 0 NOT NULL,
    reps_completed integer,
    weight_used_kg numeric,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workout_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    workout_plan_id uuid,
    workout_date date NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workout_plan_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_plan_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_plan_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    day_of_week integer,
    sets integer DEFAULT 3,
    reps integer DEFAULT 12,
    rest_seconds integer DEFAULT 60,
    weight_kg numeric(5,2),
    notes text,
    order_index integer DEFAULT 0,
    CONSTRAINT workout_plan_exercises_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: workout_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    assigned_to uuid,
    is_instructor_plan boolean DEFAULT false,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scheduled_date date,
    scheduled_time time without time zone,
    weekdays integer[]
);


--
-- Name: access_logs access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_pkey PRIMARY KEY (id);


--
-- Name: active_sessions active_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_sessions
    ADD CONSTRAINT active_sessions_pkey PRIMARY KEY (id);


--
-- Name: active_sessions active_sessions_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_sessions
    ADD CONSTRAINT active_sessions_profile_id_key UNIQUE (profile_id);


--
-- Name: exercise_favorites exercise_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_favorites
    ADD CONSTRAINT exercise_favorites_pkey PRIMARY KEY (id);


--
-- Name: exercise_favorites exercise_favorites_profile_id_exercise_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_favorites
    ADD CONSTRAINT exercise_favorites_profile_id_exercise_id_key UNIQUE (profile_id, exercise_id);


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);


--
-- Name: hydration_records hydration_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hydration_records
    ADD CONSTRAINT hydration_records_pkey PRIMARY KEY (id);


--
-- Name: hydration_settings hydration_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hydration_settings
    ADD CONSTRAINT hydration_settings_pkey PRIMARY KEY (id);


--
-- Name: hydration_settings hydration_settings_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hydration_settings
    ADD CONSTRAINT hydration_settings_profile_id_key UNIQUE (profile_id);


--
-- Name: instructor_clients instructor_clients_instructor_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_clients
    ADD CONSTRAINT instructor_clients_instructor_id_client_id_key UNIQUE (instructor_id, client_id);


--
-- Name: instructor_clients instructor_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_clients
    ADD CONSTRAINT instructor_clients_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_license_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_license_key_key UNIQUE (license_key);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: master_credentials master_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_credentials
    ADD CONSTRAINT master_credentials_pkey PRIMARY KEY (id);


--
-- Name: master_credentials master_credentials_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_credentials
    ADD CONSTRAINT master_credentials_username_key UNIQUE (username);


--
-- Name: meal_plans meal_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- Name: payment_plans payment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plans
    ADD CONSTRAINT payment_plans_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: personal_records personal_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT personal_records_pkey PRIMARY KEY (id);


--
-- Name: personal_records personal_records_profile_id_exercise_id_record_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT personal_records_profile_id_exercise_id_record_type_key UNIQUE (profile_id, exercise_id, record_type);


--
-- Name: pre_generated_accounts pre_generated_accounts_license_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_generated_accounts
    ADD CONSTRAINT pre_generated_accounts_license_key_key UNIQUE (license_key);


--
-- Name: pre_generated_accounts pre_generated_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_generated_accounts
    ADD CONSTRAINT pre_generated_accounts_pkey PRIMARY KEY (id);


--
-- Name: pre_generated_accounts pre_generated_accounts_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_generated_accounts
    ADD CONSTRAINT pre_generated_accounts_username_key UNIQUE (username);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_theme_preferences user_theme_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_theme_preferences
    ADD CONSTRAINT user_theme_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_theme_preferences user_theme_preferences_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_theme_preferences
    ADD CONSTRAINT user_theme_preferences_profile_id_key UNIQUE (profile_id);


--
-- Name: weight_records weight_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_records
    ADD CONSTRAINT weight_records_pkey PRIMARY KEY (id);


--
-- Name: workout_exercise_logs workout_exercise_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercise_logs
    ADD CONSTRAINT workout_exercise_logs_pkey PRIMARY KEY (id);


--
-- Name: workout_logs workout_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_logs
    ADD CONSTRAINT workout_logs_pkey PRIMARY KEY (id);


--
-- Name: workout_plan_exercises workout_plan_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_exercises
    ADD CONSTRAINT workout_plan_exercises_pkey PRIMARY KEY (id);


--
-- Name: workout_plans workout_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_pkey PRIMARY KEY (id);


--
-- Name: idx_access_logs_check_in_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_check_in_at ON public.access_logs USING btree (check_in_at);


--
-- Name: idx_access_logs_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_profile_id ON public.access_logs USING btree (profile_id);


--
-- Name: idx_active_sessions_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_sessions_profile ON public.active_sessions USING btree (profile_id);


--
-- Name: idx_instructor_clients_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instructor_clients_status ON public.instructor_clients USING btree (client_id, link_status) WHERE ((link_status)::text = 'pending'::text);


--
-- Name: idx_licenses_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_tenant ON public.licenses USING btree (tenant_id);


--
-- Name: idx_password_reset_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_codes_code ON public.password_reset_codes USING btree (code);


--
-- Name: idx_password_reset_codes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_codes_expires ON public.password_reset_codes USING btree (expires_at);


--
-- Name: idx_password_reset_codes_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_codes_username ON public.password_reset_codes USING btree (username);


--
-- Name: idx_payment_plans_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plans_client_id ON public.payment_plans USING btree (client_id);


--
-- Name: idx_payment_plans_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_plans_created_by ON public.payment_plans USING btree (created_by);


--
-- Name: idx_payments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_tenant ON public.payments USING btree (tenant_id);


--
-- Name: idx_personal_records_achieved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personal_records_achieved_at ON public.personal_records USING btree (achieved_at DESC);


--
-- Name: idx_personal_records_profile_exercise; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personal_records_profile_exercise ON public.personal_records USING btree (profile_id, exercise_id);


--
-- Name: idx_pre_generated_accounts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pre_generated_accounts_tenant ON public.pre_generated_accounts USING btree (tenant_id);


--
-- Name: idx_pre_generated_accounts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pre_generated_accounts_type ON public.pre_generated_accounts USING btree (account_type, is_used);


--
-- Name: idx_pre_generated_accounts_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pre_generated_accounts_username ON public.pre_generated_accounts USING btree (username);


--
-- Name: idx_profiles_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_city ON public.profiles USING btree (city);


--
-- Name: idx_profiles_cpf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_cpf ON public.profiles USING btree (cpf);


--
-- Name: idx_profiles_cpf_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_profiles_cpf_unique ON public.profiles USING btree (cpf) WHERE (cpf IS NOT NULL);


--
-- Name: idx_profiles_created_by_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_created_by_admin ON public.profiles USING btree (created_by_admin);


--
-- Name: idx_profiles_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_tenant ON public.profiles USING btree (tenant_id);


--
-- Name: idx_workout_plans_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workout_plans_assigned_to ON public.workout_plans USING btree (assigned_to);


--
-- Name: idx_workout_plans_scheduled_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workout_plans_scheduled_date ON public.workout_plans USING btree (scheduled_date);


--
-- Name: licenses update_licenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: master_credentials update_master_credentials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_master_credentials_updated_at BEFORE UPDATE ON public.master_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_theme_preferences update_user_theme_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_theme_preferences_updated_at BEFORE UPDATE ON public.user_theme_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workout_plans update_workout_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: access_logs access_logs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: access_logs access_logs_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.profiles(id);


--
-- Name: active_sessions active_sessions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_sessions
    ADD CONSTRAINT active_sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: exercise_favorites exercise_favorites_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_favorites
    ADD CONSTRAINT exercise_favorites_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;


--
-- Name: exercise_favorites exercise_favorites_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_favorites
    ADD CONSTRAINT exercise_favorites_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: exercises exercises_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: exercises exercises_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: payments fk_payments_plan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_plan_id FOREIGN KEY (plan_id) REFERENCES public.payment_plans(id) ON DELETE SET NULL;


--
-- Name: hydration_records hydration_records_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hydration_records
    ADD CONSTRAINT hydration_records_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: hydration_settings hydration_settings_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hydration_settings
    ADD CONSTRAINT hydration_settings_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: instructor_clients instructor_clients_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_clients
    ADD CONSTRAINT instructor_clients_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: instructor_clients instructor_clients_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_clients
    ADD CONSTRAINT instructor_clients_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: licenses licenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: licenses licenses_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: licenses licenses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: master_credentials master_credentials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_credentials
    ADD CONSTRAINT master_credentials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: meal_plans meal_plans_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: meal_plans meal_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_plans
    ADD CONSTRAINT meal_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: notifications notifications_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: payment_plans payment_plans_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plans
    ADD CONSTRAINT payment_plans_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payment_plans payment_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plans
    ADD CONSTRAINT payment_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: payment_plans payment_plans_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plans
    ADD CONSTRAINT payment_plans_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.profiles(id);


--
-- Name: payment_plans payment_plans_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plans
    ADD CONSTRAINT payment_plans_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: payments payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id);


--
-- Name: payments payments_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.profiles(id);


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: personal_records personal_records_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT personal_records_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;


--
-- Name: personal_records personal_records_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT personal_records_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: personal_records personal_records_workout_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT personal_records_workout_log_id_fkey FOREIGN KEY (workout_log_id) REFERENCES public.workout_logs(id) ON DELETE SET NULL;


--
-- Name: pre_generated_accounts pre_generated_accounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_generated_accounts
    ADD CONSTRAINT pre_generated_accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: pre_generated_accounts pre_generated_accounts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_generated_accounts
    ADD CONSTRAINT pre_generated_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: pre_generated_accounts pre_generated_accounts_used_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_generated_accounts
    ADD CONSTRAINT pre_generated_accounts_used_by_profile_id_fkey FOREIGN KEY (used_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_created_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_created_by_admin_fkey FOREIGN KEY (created_by_admin) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_theme_preferences user_theme_preferences_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_theme_preferences
    ADD CONSTRAINT user_theme_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: weight_records weight_records_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_records
    ADD CONSTRAINT weight_records_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: workout_exercise_logs workout_exercise_logs_workout_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercise_logs
    ADD CONSTRAINT workout_exercise_logs_workout_log_id_fkey FOREIGN KEY (workout_log_id) REFERENCES public.workout_logs(id) ON DELETE CASCADE;


--
-- Name: workout_exercise_logs workout_exercise_logs_workout_plan_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercise_logs
    ADD CONSTRAINT workout_exercise_logs_workout_plan_exercise_id_fkey FOREIGN KEY (workout_plan_exercise_id) REFERENCES public.workout_plan_exercises(id) ON DELETE CASCADE;


--
-- Name: workout_logs workout_logs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_logs
    ADD CONSTRAINT workout_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: workout_logs workout_logs_workout_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_logs
    ADD CONSTRAINT workout_logs_workout_plan_id_fkey FOREIGN KEY (workout_plan_id) REFERENCES public.workout_plans(id);


--
-- Name: workout_plan_exercises workout_plan_exercises_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_exercises
    ADD CONSTRAINT workout_plan_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;


--
-- Name: workout_plan_exercises workout_plan_exercises_workout_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plan_exercises
    ADD CONSTRAINT workout_plan_exercises_workout_plan_id_fkey FOREIGN KEY (workout_plan_id) REFERENCES public.workout_plans(id) ON DELETE CASCADE;


--
-- Name: workout_plans workout_plans_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: workout_plans workout_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.can_insert_profile(auth.uid()));


--
-- Name: access_logs Admins can manage all access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all access logs" ON public.access_logs USING (public.is_admin_or_higher(auth.uid()));


--
-- Name: instructor_clients Admins can manage all links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all links" ON public.instructor_clients USING (public.is_admin_or_higher(auth.uid()));


--
-- Name: active_sessions Admins can manage all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all sessions" ON public.active_sessions USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));


--
-- Name: user_roles Admins can manage non-master roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage non-master roles" ON public.user_roles USING ((public.is_admin_or_higher(auth.uid()) AND (role <> 'master'::public.app_role)));


--
-- Name: pre_generated_accounts Admins can manage tenant accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tenant accounts" ON public.pre_generated_accounts USING ((public.is_admin_or_higher(auth.uid()) AND (tenant_id = public.get_current_tenant_id())));


--
-- Name: licenses Admins can manage tenant licenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tenant licenses" ON public.licenses USING ((public.is_admin_or_higher(auth.uid()) AND ((tenant_id = public.get_current_tenant_id()) OR public.is_master(auth.uid()))));


--
-- Name: payment_plans Admins can manage tenant payment plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tenant payment plans" ON public.payment_plans USING ((public.is_admin_or_higher(auth.uid()) AND ((tenant_id = public.get_current_tenant_id()) OR public.is_master(auth.uid()))));


--
-- Name: payments Admins can manage tenant payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tenant payments" ON public.payments USING ((public.is_admin_or_higher(auth.uid()) AND ((tenant_id = public.get_current_tenant_id()) OR public.is_master(auth.uid()))));


--
-- Name: notifications Admins can send notifications to any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can send notifications to any profile" ON public.notifications FOR INSERT WITH CHECK (public.is_admin_or_higher(auth.uid()));


--
-- Name: notifications Admins can send tenant notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can send tenant notifications" ON public.notifications FOR INSERT WITH CHECK ((public.is_admin_or_higher(auth.uid()) AND (tenant_id = public.get_current_tenant_id())));


--
-- Name: tenants Admins can update own tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update own tenant" ON public.tenants FOR UPDATE USING (((id = public.get_current_tenant_id()) AND public.is_admin_or_higher(auth.uid())));


--
-- Name: profiles Admins can update tenant profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update tenant profiles" ON public.profiles FOR UPDATE USING ((public.is_admin_or_higher(auth.uid()) AND ((tenant_id = public.get_current_tenant_id()) OR public.is_master(auth.uid()))));


--
-- Name: tenants Admins can view own tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view own tenant" ON public.tenants FOR SELECT USING ((id = public.get_current_tenant_id()));


--
-- Name: profiles Admins can view profiles they created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view profiles they created" ON public.profiles FOR SELECT USING (((created_by_admin = public.get_current_profile_id()) OR public.is_master(auth.uid())));


--
-- Name: profiles Admins can view tenant profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view tenant profiles" ON public.profiles FOR SELECT USING ((public.is_admin_or_higher(auth.uid()) AND ((tenant_id = public.get_current_tenant_id()) OR public.is_master(auth.uid()))));


--
-- Name: notifications Clients can send notifications to linked instructors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can send notifications to linked instructors" ON public.notifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.client_id = public.get_current_profile_id()) AND (ic.instructor_id = notifications.profile_id) AND (ic.is_active = true)))));


--
-- Name: instructor_clients Clients can unlink themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can unlink themselves" ON public.instructor_clients FOR UPDATE USING ((client_id = public.get_current_profile_id()));


--
-- Name: profiles Clients can view instructors with pending link requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view instructors with pending link requests" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.instructor_id = profiles.id) AND (ic.client_id = public.get_current_profile_id()) AND ((ic.link_status)::text = 'pending'::text) AND (ic.is_active = true)))));


--
-- Name: instructor_clients Clients can view own links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view own links" ON public.instructor_clients FOR SELECT USING ((client_id = public.get_current_profile_id()));


--
-- Name: payment_plans Clients can view own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view own plans" ON public.payment_plans FOR SELECT USING ((client_id = public.get_current_profile_id()));


--
-- Name: exercises Everyone can view system exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view system exercises" ON public.exercises FOR SELECT USING ((is_system = true));


--
-- Name: workout_plans Instructors can manage assigned plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can manage assigned plans" ON public.workout_plans USING ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.instructor_id = public.get_current_profile_id()) AND (ic.client_id = workout_plans.assigned_to) AND (ic.is_active = true)))));


--
-- Name: instructor_clients Instructors can manage own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can manage own clients" ON public.instructor_clients USING ((instructor_id = public.get_current_profile_id()));


--
-- Name: payment_plans Instructors can manage own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can manage own plans" ON public.payment_plans USING (((instructor_id = public.get_current_profile_id()) OR (created_by = public.get_current_profile_id())));


--
-- Name: payments Instructors can manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can manage payments" ON public.payments USING ((instructor_id = public.get_current_profile_id()));


--
-- Name: profiles Instructors can search clients by username for linking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can search clients by username for linking" ON public.profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::public.app_role)))) AND (NOT (id IN ( SELECT instructor_clients.client_id
   FROM public.instructor_clients
  WHERE ((instructor_clients.instructor_id = public.get_current_profile_id()) AND (instructor_clients.is_active = true)))))));


--
-- Name: notifications Instructors can send notifications to linked clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can send notifications to linked clients" ON public.notifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.instructor_id = public.get_current_profile_id()) AND (ic.client_id = notifications.profile_id) AND (ic.is_active = true) AND ((ic.link_status)::text = 'accepted'::text)))));


--
-- Name: profiles Instructors can view clients with pending link requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can view clients with pending link requests" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.client_id = profiles.id) AND (ic.instructor_id = public.get_current_profile_id()) AND ((ic.link_status)::text = 'pending'::text) AND (ic.is_active = true)))));


--
-- Name: access_logs Instructors can view linked client access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can view linked client access logs" ON public.access_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.instructor_id = public.get_current_profile_id()) AND (ic.client_id = access_logs.profile_id) AND (ic.is_active = true)))));


--
-- Name: workout_exercise_logs Instructors can view linked client exercise logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can view linked client exercise logs" ON public.workout_exercise_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.workout_logs wl
     JOIN public.instructor_clients ic ON ((ic.client_id = wl.profile_id)))
  WHERE ((wl.id = workout_exercise_logs.workout_log_id) AND (ic.instructor_id = public.get_current_profile_id()) AND (ic.is_active = true)))));


--
-- Name: personal_records Instructors can view linked client records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can view linked client records" ON public.personal_records FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.instructor_id = public.get_current_profile_id()) AND (ic.client_id = personal_records.profile_id) AND (ic.is_active = true)))));


--
-- Name: weight_records Instructors can view linked client records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can view linked client records" ON public.weight_records FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.instructor_id = public.get_current_profile_id()) AND (ic.client_id = weight_records.profile_id) AND (ic.is_active = true)))));


--
-- Name: profiles Instructors can view linked clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Instructors can view linked clients" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.instructor_clients ic
  WHERE ((ic.instructor_id = public.get_current_profile_id()) AND (ic.client_id = profiles.id) AND (ic.is_active = true)))));


--
-- Name: licenses Masters can delete licenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can delete licenses" ON public.licenses FOR DELETE USING (public.is_master(auth.uid()));


--
-- Name: profiles Masters can delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can delete profiles" ON public.profiles FOR DELETE USING (public.is_master(auth.uid()));


--
-- Name: master_credentials Masters can manage all master credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can manage all master credentials" ON public.master_credentials USING (public.is_master(auth.uid()));


--
-- Name: pre_generated_accounts Masters can manage all pre-generated accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can manage all pre-generated accounts" ON public.pre_generated_accounts USING (public.is_master(auth.uid()));


--
-- Name: user_roles Masters can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can manage all roles" ON public.user_roles USING (public.is_master(auth.uid()));


--
-- Name: tenants Masters can manage all tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can manage all tenants" ON public.tenants USING (public.is_master(auth.uid()));


--
-- Name: password_reset_codes Masters can manage password reset codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Masters can manage password reset codes" ON public.password_reset_codes USING (public.is_master(auth.uid()));


--
-- Name: workout_plans Users can delete own created plans only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own created plans only" ON public.workout_plans FOR DELETE USING (((created_by = public.get_current_profile_id()) AND ((is_instructor_plan IS NULL) OR (is_instructor_plan = false))));


--
-- Name: workout_exercise_logs Users can delete own non-instructor exercise logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own non-instructor exercise logs" ON public.workout_exercise_logs FOR DELETE USING ((workout_log_id IN ( SELECT wl.id
   FROM (public.workout_logs wl
     LEFT JOIN public.workout_plans wp ON ((wl.workout_plan_id = wp.id)))
  WHERE ((wl.profile_id = public.get_current_profile_id()) AND ((wp.is_instructor_plan IS NULL) OR (wp.is_instructor_plan = false))))));


--
-- Name: workout_logs Users can delete own non-instructor workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own non-instructor workout logs" ON public.workout_logs FOR DELETE USING (((profile_id = public.get_current_profile_id()) AND ((workout_plan_id IS NULL) OR (NOT (EXISTS ( SELECT 1
   FROM public.workout_plans wp
  WHERE ((wp.id = workout_logs.workout_plan_id) AND (wp.is_instructor_plan = true))))))));


--
-- Name: workout_exercise_logs Users can insert own exercise logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own exercise logs" ON public.workout_exercise_logs FOR INSERT WITH CHECK ((workout_log_id IN ( SELECT workout_logs.id
   FROM public.workout_logs
  WHERE (workout_logs.profile_id = public.get_current_profile_id()))));


--
-- Name: workout_logs Users can insert own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own workout logs" ON public.workout_logs FOR INSERT WITH CHECK ((profile_id = public.get_current_profile_id()));


--
-- Name: workout_plans Users can insert own workout plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own workout plans" ON public.workout_plans FOR INSERT WITH CHECK ((created_by = public.get_current_profile_id()));


--
-- Name: workout_plan_exercises Users can manage exercises in own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage exercises in own plans" ON public.workout_plan_exercises USING ((workout_plan_id IN ( SELECT workout_plans.id
   FROM public.workout_plans
  WHERE ((workout_plans.created_by = public.get_current_profile_id()) OR (workout_plans.assigned_to = public.get_current_profile_id())))));


--
-- Name: exercises Users can manage own exercises; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own exercises" ON public.exercises USING ((created_by = public.get_current_profile_id()));


--
-- Name: exercise_favorites Users can manage own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own favorites" ON public.exercise_favorites USING ((profile_id = public.get_current_profile_id())) WITH CHECK ((profile_id = public.get_current_profile_id()));


--
-- Name: hydration_records Users can manage own hydration records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own hydration records" ON public.hydration_records USING ((profile_id = public.get_current_profile_id()));


--
-- Name: hydration_settings Users can manage own hydration settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own hydration settings" ON public.hydration_settings USING ((profile_id = public.get_current_profile_id()));


--
-- Name: meal_plans Users can manage own meal plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own meal plans" ON public.meal_plans USING (((created_by = public.get_current_profile_id()) OR (assigned_to = public.get_current_profile_id())));


--
-- Name: notifications Users can manage own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own notifications" ON public.notifications USING ((profile_id = public.get_current_profile_id()));


--
-- Name: personal_records Users can manage own personal records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own personal records" ON public.personal_records USING ((profile_id = public.get_current_profile_id())) WITH CHECK ((profile_id = public.get_current_profile_id()));


--
-- Name: user_theme_preferences Users can manage own theme preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own theme preferences" ON public.user_theme_preferences USING ((profile_id = public.get_current_profile_id())) WITH CHECK ((profile_id = public.get_current_profile_id()));


--
-- Name: weight_records Users can manage own weight records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own weight records" ON public.weight_records USING ((profile_id = public.get_current_profile_id()));


--
-- Name: workout_exercise_logs Users can update own exercise logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own exercise logs" ON public.workout_exercise_logs FOR UPDATE USING ((workout_log_id IN ( SELECT workout_logs.id
   FROM public.workout_logs
  WHERE (workout_logs.profile_id = public.get_current_profile_id()))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: workout_logs Users can update own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own workout logs" ON public.workout_logs FOR UPDATE USING ((profile_id = public.get_current_profile_id()));


--
-- Name: workout_plans Users can update own workout plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own workout plans" ON public.workout_plans FOR UPDATE USING (((created_by = public.get_current_profile_id()) OR (assigned_to = public.get_current_profile_id())));


--
-- Name: active_sessions Users can view and manage own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view and manage own sessions" ON public.active_sessions USING ((profile_id = public.get_current_profile_id())) WITH CHECK ((profile_id = public.get_current_profile_id()));


--
-- Name: access_logs Users can view own access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own access logs" ON public.access_logs FOR SELECT USING ((profile_id = public.get_current_profile_id()));


--
-- Name: workout_exercise_logs Users can view own exercise logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own exercise logs" ON public.workout_exercise_logs FOR SELECT USING ((workout_log_id IN ( SELECT workout_logs.id
   FROM public.workout_logs
  WHERE (workout_logs.profile_id = public.get_current_profile_id()))));


--
-- Name: licenses Users can view own license; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own license" ON public.licenses FOR SELECT USING ((profile_id = public.get_current_profile_id()));


--
-- Name: payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING ((client_id = public.get_current_profile_id()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: workout_logs Users can view own workout logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own workout logs" ON public.workout_logs FOR SELECT USING ((profile_id = public.get_current_profile_id()));


--
-- Name: workout_plans Users can view own workout plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own workout plans" ON public.workout_plans FOR SELECT USING (((created_by = public.get_current_profile_id()) OR (assigned_to = public.get_current_profile_id())));


--
-- Name: access_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: active_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exercise_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

--
-- Name: hydration_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hydration_records ENABLE ROW LEVEL SECURITY;

--
-- Name: hydration_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hydration_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: instructor_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instructor_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: licenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

--
-- Name: master_credentials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.master_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: meal_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: personal_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

--
-- Name: pre_generated_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pre_generated_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_theme_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: weight_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_exercise_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_plan_exercises; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

--
-- Name: workout_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;