


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."agency_status" AS ENUM (
    'active',
    'pending',
    'suspended',
    'deleted'
);


ALTER TYPE "public"."agency_status" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'agency_admin',
    'employee',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_default_skills"("_agency_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.agency_skills (agency_id, skill_template_id)
  SELECT _agency_id, id FROM public.skill_templates WHERE is_default = true AND is_active = true
  ON CONFLICT DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."assign_default_skills"("_agency_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_callbacks"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.webhook_callbacks
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_callbacks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_agency_ids"("_user_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT agency_id
  FROM public.user_roles
  WHERE user_id = _user_id AND role = 'agency_admin'
  AND agency_id IS NOT NULL;
$$;


ALTER FUNCTION "public"."get_admin_agency_ids"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_agencies"("_user_id" "uuid") RETURNS TABLE("agency_id" "uuid", "role" "public"."app_role")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ur.agency_id, ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
    AND ur.agency_id IS NOT NULL
  ORDER BY ur.created_at
$$;


ALTER FUNCTION "public"."get_user_agencies"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_agency_id"("_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    -- Use profiles.agency_id if it exists AND the user actually has a role there
    (
      SELECT p.agency_id
      FROM public.profiles p
      INNER JOIN public.user_roles ur
        ON ur.user_id = p.user_id AND ur.agency_id = p.agency_id
      WHERE p.user_id = _user_id
        AND p.agency_id IS NOT NULL
      LIMIT 1
    ),
    -- Otherwise pick the first agency from user_roles
    (
      SELECT ur.agency_id
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.agency_id IS NOT NULL
      ORDER BY ur.created_at
      LIMIT 1
    )
  )
$$;


ALTER FUNCTION "public"."get_user_agency_id"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_invitation_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only log when accepted_at changes from NULL to a value
  IF OLD.accepted_at IS NULL AND NEW.accepted_at IS NOT NULL THEN
    INSERT INTO public.invitation_activity (
      invitation_id,
      agency_id,
      action,
      target_email,
      metadata
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      'accepted',
      NEW.email,
      jsonb_build_object('role', NEW.role, 'accepted_at', NEW.accepted_at)
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_invitation_accepted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_agency_by_slug"("_slug" "text") RETURNS TABLE("agency_id" "uuid", "agency_name" "text", "is_member" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _agency_id UUID;
  _agency_name TEXT;
  _is_member BOOLEAN;
BEGIN
  -- Look up the agency by slug
  SELECT a.id, a.name INTO _agency_id, _agency_name
  FROM public.agencies a
  WHERE a.slug = _slug
  LIMIT 1;

  IF _agency_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if the calling user has a role in this agency
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.agency_id = _agency_id
  ) INTO _is_member;

  RETURN QUERY SELECT _agency_id, _agency_name, _is_member;
END;
$$;


ALTER FUNCTION "public"."resolve_agency_by_slug"("_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_active_agency"("_user_id" "uuid", "_agency_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Admins can switch to any agency
  IF public.has_role(_user_id, 'admin') THEN
    UPDATE public.profiles SET agency_id = _agency_id WHERE user_id = _user_id;
    RETURN;
  END IF;

  -- Non-admins must have a role in the agency
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND agency_id = _agency_id
  ) THEN
    RAISE EXCEPTION 'User does not have a role in this agency';
  END IF;

  UPDATE public.profiles SET agency_id = _agency_id WHERE user_id = _user_id;
END;
$$;


ALTER FUNCTION "public"."switch_active_agency"("_user_id" "uuid", "_agency_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_belongs_to_agency"("_user_id" "uuid", "_agency_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND agency_id = _agency_id
  )
$$;


ALTER FUNCTION "public"."user_belongs_to_agency"("_user_id" "uuid", "_agency_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#0f172a'::"text",
    "secondary_color" "text" DEFAULT '#f59e0b'::"text",
    "domain" "text",
    "status" "public"."agency_status" DEFAULT 'pending'::"public"."agency_status" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "text"
);


ALTER TABLE "public"."agencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agency_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "skill_template_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agency_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_skill_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_skill_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitation_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invitation_id" "uuid" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_email" "text",
    "target_email" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invitation_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reminder_count" integer DEFAULT 0,
    "last_reminder_at" timestamp with time zone
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agency_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "phone" "text",
    "two_factor_enabled" boolean DEFAULT false,
    "two_factor_secret" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recovery_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recovery_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#6366f1'::"text",
    "icon" "text" DEFAULT 'folder'::"text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skill_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "category" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_system_prompt" "text",
    "llm" "text",
    "ai_skill_id" "uuid"
);


ALTER TABLE "public"."skill_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_id" "uuid"
);


ALTER TABLE "public"."skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "agency_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_callbacks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "message" "text",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "retrieved_at" timestamp with time zone
);


ALTER TABLE "public"."webhook_callbacks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "webhook_id" "text" NOT NULL,
    "command" "text" NOT NULL,
    "skill" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "response_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "queue_order" integer,
    "input_method" "text" DEFAULT 'typed'::"text"
);


ALTER TABLE "public"."workflow_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workflow_history"."input_method" IS 'How the command was entered: typed, voice, or imported';



ALTER TABLE ONLY "public"."agencies"
    ADD CONSTRAINT "agencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencies"
    ADD CONSTRAINT "agencies_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."agency_skills"
    ADD CONSTRAINT "agency_skills_agency_id_skill_template_id_key" UNIQUE ("agency_id", "skill_template_id");



ALTER TABLE ONLY "public"."agency_skills"
    ADD CONSTRAINT "agency_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_skill_options"
    ADD CONSTRAINT "ai_skill_options_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ai_skill_options"
    ADD CONSTRAINT "ai_skill_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_activity"
    ADD CONSTRAINT "invitation_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."recovery_codes"
    ADD CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_categories"
    ADD CONSTRAINT "skill_categories_agency_id_name_key" UNIQUE ("agency_id", "name");



ALTER TABLE ONLY "public"."skill_categories"
    ADD CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_templates"
    ADD CONSTRAINT "skill_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."skill_templates"
    ADD CONSTRAINT "skill_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_agency_id_name_key" UNIQUE ("agency_id", "name");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_agency_id_key" UNIQUE ("user_id", "role", "agency_id");



ALTER TABLE ONLY "public"."webhook_callbacks"
    ADD CONSTRAINT "webhook_callbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_callbacks"
    ADD CONSTRAINT "webhook_callbacks_webhook_id_key" UNIQUE ("webhook_id");



ALTER TABLE ONLY "public"."workflow_history"
    ADD CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_invitation_activity_agency_id" ON "public"."invitation_activity" USING "btree" ("agency_id");



CREATE INDEX "idx_invitation_activity_created_at" ON "public"."invitation_activity" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_invitation_activity_invitation_id" ON "public"."invitation_activity" USING "btree" ("invitation_id");



CREATE INDEX "idx_invitations_agency" ON "public"."invitations" USING "btree" ("agency_id");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_reminder_candidates" ON "public"."invitations" USING "btree" ("accepted_at", "created_at", "reminder_count") WHERE ("accepted_at" IS NULL);



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_recovery_codes_user_id" ON "public"."recovery_codes" USING "btree" ("user_id");



CREATE INDEX "idx_skills_agency_active" ON "public"."skills" USING "btree" ("agency_id", "is_active");



CREATE INDEX "idx_webhook_callbacks_webhook_id" ON "public"."webhook_callbacks" USING "btree" ("webhook_id");



CREATE INDEX "idx_workflow_history_created_at" ON "public"."workflow_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_workflow_history_queue" ON "public"."workflow_history" USING "btree" ("user_id", "status", "queue_order") WHERE ("status" = 'queued'::"text");



CREATE INDEX "idx_workflow_history_user_id" ON "public"."workflow_history" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trigger_log_invitation_accepted" AFTER UPDATE ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."log_invitation_accepted"();



CREATE OR REPLACE TRIGGER "update_agencies_updated_at" BEFORE UPDATE ON "public"."agencies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_skill_categories_updated_at" BEFORE UPDATE ON "public"."skill_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_skills_updated_at" BEFORE UPDATE ON "public"."skills" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agency_skills"
    ADD CONSTRAINT "agency_skills_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_skills"
    ADD CONSTRAINT "agency_skills_skill_template_id_fkey" FOREIGN KEY ("skill_template_id") REFERENCES "public"."skill_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitation_activity"
    ADD CONSTRAINT "invitation_activity_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitation_activity"
    ADD CONSTRAINT "invitation_activity_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_categories"
    ADD CONSTRAINT "skill_categories_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skill_templates"
    ADD CONSTRAINT "skill_templates_ai_skill_id_fkey" FOREIGN KEY ("ai_skill_id") REFERENCES "public"."ai_skill_options"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can assign initial roles" ON "public"."user_roles" FOR INSERT WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role")));



CREATE POLICY "Admins can manage ai_skill_options" ON "public"."ai_skill_options" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage roles" ON "public"."user_roles" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role") AND ("agency_id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids")))));



CREATE POLICY "Admins can manage skill templates" ON "public"."skill_templates" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all workflow history" ON "public"."workflow_history" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Agency admins can manage invitations" ON "public"."invitations" USING (((("agency_id" = "public"."get_user_agency_id"("auth"."uid"())) AND "public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role")) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Agency admins can manage skill categories" ON "public"."skill_categories" USING (((("agency_id" = "public"."get_user_agency_id"("auth"."uid"())) AND "public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role")) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Agency admins can manage skills" ON "public"."skills" USING (((("agency_id" = "public"."get_user_agency_id"("auth"."uid"())) AND "public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role")) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Agency admins can manage their agency skills" ON "public"."agency_skills" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("agency_id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids"))));



CREATE POLICY "Agency admins can update their agencies" ON "public"."agencies" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids"))));



CREATE POLICY "Agency admins can view invitation activity" ON "public"."invitation_activity" FOR SELECT USING (((("agency_id" = "public"."get_user_agency_id"("auth"."uid"())) AND "public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role")) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Agency admins can view workflow history of their agency" ON "public"."workflow_history" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "workflow_history"."user_id") AND ("p"."agency_id" IS NOT NULL) AND ("p"."agency_id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids")))))));



CREATE POLICY "Allow authenticated users to read callbacks" ON "public"."webhook_callbacks" FOR SELECT USING (true);



CREATE POLICY "Allow insert invitation activity" ON "public"."invitation_activity" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert for callbacks" ON "public"."webhook_callbacks" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow updates for callbacks" ON "public"."webhook_callbacks" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view ai_skill_options" ON "public"."ai_skill_options" FOR SELECT USING (true);



CREATE POLICY "Anyone can view invitation by token" ON "public"."invitations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view skill templates" ON "public"."skill_templates" FOR SELECT USING (true);



CREATE POLICY "Service role can insert activity" ON "public"."invitation_activity" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create agencies" ON "public"."agencies" FOR INSERT WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role")));



CREATE POLICY "Users can delete their own recovery codes" ON "public"."recovery_codes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own recovery codes" ON "public"."recovery_codes" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own workflow history" ON "public"."workflow_history" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role") AND ("agency_id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids")))));



CREATE POLICY "Users can update their own recovery codes" ON "public"."recovery_codes" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own workflow history" ON "public"."workflow_history" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view active skills in their agency" ON "public"."skills" FOR SELECT USING ((("agency_id" = "public"."get_user_agency_id"("auth"."uid"())) AND ("is_active" = true)));



CREATE POLICY "Users can view profiles in their agency" ON "public"."profiles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role") AND ("agency_id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids")))));



CREATE POLICY "Users can view skill categories in their agency" ON "public"."skill_categories" FOR SELECT USING (("agency_id" = "public"."get_user_agency_id"("auth"."uid"())));



CREATE POLICY "Users can view their agencies" ON "public"."agencies" FOR SELECT USING ((("id" IN ( SELECT "ur"."agency_id"
   FROM "public"."user_roles" "ur"
  WHERE ("ur"."user_id" = "auth"."uid"()))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids"))));



CREATE POLICY "Users can view their agency skills" ON "public"."agency_skills" FOR SELECT USING ((("agency_id" IN ( SELECT "ur"."agency_id"
   FROM "public"."user_roles" "ur"
  WHERE ("ur"."user_id" = "auth"."uid"()))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Users can view their own recovery codes" ON "public"."recovery_codes" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("public"."has_role"("auth"."uid"(), 'agency_admin'::"public"."app_role") AND ("agency_id" IN ( SELECT "public"."get_admin_agency_ids"("auth"."uid"()) AS "get_admin_agency_ids")))));



ALTER TABLE "public"."agencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agency_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_skill_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recovery_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_callbacks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_history" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."assign_default_skills"("_agency_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_default_skills"("_agency_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_default_skills"("_agency_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_callbacks"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_callbacks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_callbacks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_agency_ids"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_agency_ids"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_agency_ids"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_agencies"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_agencies"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_agencies"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_agency_id"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_agency_id"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_agency_id"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_invitation_accepted"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_invitation_accepted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_invitation_accepted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_agency_by_slug"("_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_agency_by_slug"("_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_agency_by_slug"("_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_active_agency"("_user_id" "uuid", "_agency_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."switch_active_agency"("_user_id" "uuid", "_agency_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_active_agency"("_user_id" "uuid", "_agency_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_belongs_to_agency"("_user_id" "uuid", "_agency_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_belongs_to_agency"("_user_id" "uuid", "_agency_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_belongs_to_agency"("_user_id" "uuid", "_agency_id" "uuid") TO "service_role";












SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;









GRANT ALL ON TABLE "public"."agencies" TO "anon";
GRANT ALL ON TABLE "public"."agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."agencies" TO "service_role";



GRANT ALL ON TABLE "public"."agency_skills" TO "anon";
GRANT ALL ON TABLE "public"."agency_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."agency_skills" TO "service_role";



GRANT ALL ON TABLE "public"."ai_skill_options" TO "anon";
GRANT ALL ON TABLE "public"."ai_skill_options" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_skill_options" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_activity" TO "anon";
GRANT ALL ON TABLE "public"."invitation_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_activity" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recovery_codes" TO "anon";
GRANT ALL ON TABLE "public"."recovery_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."recovery_codes" TO "service_role";



GRANT ALL ON TABLE "public"."skill_categories" TO "anon";
GRANT ALL ON TABLE "public"."skill_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_categories" TO "service_role";



GRANT ALL ON TABLE "public"."skill_templates" TO "anon";
GRANT ALL ON TABLE "public"."skill_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_templates" TO "service_role";



GRANT ALL ON TABLE "public"."skills" TO "anon";
GRANT ALL ON TABLE "public"."skills" TO "authenticated";
GRANT ALL ON TABLE "public"."skills" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_callbacks" TO "anon";
GRANT ALL ON TABLE "public"."webhook_callbacks" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_callbacks" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_history" TO "anon";
GRANT ALL ON TABLE "public"."workflow_history" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_history" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































