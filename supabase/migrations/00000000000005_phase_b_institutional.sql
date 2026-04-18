-- Migration : phase_b_institutional
-- Date       : 2026-04-18
-- Contexte   : Phase B — modèle institutionnel (spec docs/SPEC-INSTITUTIONAL-MODEL.md)
-- Objet      : Créer les tables services / stages / settings / inscriptions,
--              étendre profiles/entries, backfiller les DES existants, poser RLS.
--
-- Dépendance : la migration 00000000000004_phase_b_enums.sql doit être
--              exécutée AVANT (valeurs enum service_chief / institution_admin).
--
-- Tables créées :
--   hospital_services         — services chirurgicaux d'un hôpital (1..N par hôpital)
--   stage_assignments         — affectations stage (historique + courant)
--   hospital_settings         — personnalisation (couleurs, forfait max_services)
--   institution_registrations — demandes d'inscription institutionnelle (verified)
--
-- Colonnes ajoutées :
--   profiles.home_hospital_id  — hôpital de RÉFÉRENCE (permanent, contrôle suppression)
--   profiles.service_id        — service actuel (stage ou poste)
--   entries.service_id         — service dans lequel l'intervention a eu lieu
--   hospitals.logo_url         — déjà ajouté hors migration, on normalise ici IF NOT EXISTS

-- =============================================================================
-- 1. Normaliser hospitals.logo_url (ajouté en session 13 via API)
-- =============================================================================

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;

COMMENT ON COLUMN public.hospitals.logo_url IS
  'URL publique du logo de l''hôpital dans le bucket hospital-logos. Null = aucun logo.';

-- =============================================================================
-- 2. Table hospital_services
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hospital_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  chief_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hospital_services_name_unique_per_hospital UNIQUE (hospital_id, name)
);

CREATE INDEX IF NOT EXISTS idx_hospital_services_hospital
  ON public.hospital_services(hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospital_services_chief
  ON public.hospital_services(chief_id);

COMMENT ON TABLE public.hospital_services IS
  'Services chirurgicaux rattachés à un hôpital. Chaque service a un chef (service_chief).';

-- =============================================================================
-- 3. Extension profiles — home_hospital_id + service_id
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.hospital_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_home_hospital
  ON public.profiles(home_hospital_id);

CREATE INDEX IF NOT EXISTS idx_profiles_service
  ON public.profiles(service_id);

COMMENT ON COLUMN public.profiles.home_hospital_id IS
  'Hôpital de RÉFÉRENCE permanent du DES. Seul l''admin de cet hôpital peut supprimer/révoquer le DES. Distinct de hospital_id (hôpital de stage courant).';

COMMENT ON COLUMN public.profiles.service_id IS
  'Service actuel du DES (stage ou poste). Null si pas encore affecté. Mis à jour à chaque changement de stage.';

-- =============================================================================
-- 4. Extension entries — service_id (contexte de l'intervention)
-- =============================================================================

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.hospital_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_service
  ON public.entries(service_id);

COMMENT ON COLUMN public.entries.service_id IS
  'Service dans lequel l''intervention a eu lieu. Permet le scoping des statistiques par service.';

-- =============================================================================
-- 5. Table stage_assignments (historique des stages)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  des_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.hospital_services(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  is_current boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_assignments_date_coherence CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Un seul stage "en cours" par DES
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_assignments_one_current_per_des
  ON public.stage_assignments(des_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_stage_assignments_hospital
  ON public.stage_assignments(hospital_id);

CREATE INDEX IF NOT EXISTS idx_stage_assignments_service
  ON public.stage_assignments(service_id);

CREATE INDEX IF NOT EXISTS idx_stage_assignments_des
  ON public.stage_assignments(des_id);

COMMENT ON TABLE public.stage_assignments IS
  'Historique des stages d''un DES. is_current = true ↔ stage actuellement en cours (un seul par DES). Les stages passés (end_date renseignée) sont conservés pour l''historique.';

-- =============================================================================
-- 6. Table hospital_settings (personnalisation visuelle + forfait)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hospital_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL UNIQUE REFERENCES public.hospitals(id) ON DELETE CASCADE,
  primary_color text NOT NULL DEFAULT '#4f6fff',
  secondary_color text NOT NULL DEFAULT '#34d399',
  accent_color text NOT NULL DEFAULT '#fbbf24',
  plan_tier text NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
  max_services int NOT NULL DEFAULT 3 CHECK (max_services > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hospital_settings_hospital
  ON public.hospital_settings(hospital_id);

COMMENT ON TABLE public.hospital_settings IS
  'Paramètres par hôpital : couleurs, forfait institutionnel et limite de services. Forfaits : starter (3 services), pro (6), enterprise (illimité via max_services élevé).';

-- =============================================================================
-- 7. Table institution_registrations (workflow verified)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.institution_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'Bénin',
  institutional_id text NOT NULL,
  institutional_id_type text NOT NULL CHECK (
    institutional_id_type IN ('ordre_medical', 'rccm', 'agrement', 'autre')
  ),
  justificatif_url text,
  rector_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rector_email text NOT NULL,
  rector_full_name text NOT NULL,
  rector_phone text,
  status text NOT NULL DEFAULT 'pending_verification' CHECK (
    status IN ('pending_verification', 'verified', 'rejected')
  ),
  rejection_reason text,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_registrations_status
  ON public.institution_registrations(status);

CREATE INDEX IF NOT EXISTS idx_institution_registrations_rector
  ON public.institution_registrations(rector_user_id);

COMMENT ON TABLE public.institution_registrations IS
  'Demandes d''inscription institutionnelle. Workflow : pending_verification → verified (par developer) → création hôpital + promotion rector en institution_admin. Identifiant vérifiable obligatoire pour bloquer les inscriptions frauduleuses.';

-- =============================================================================
-- 8. Backfill : profiles.home_hospital_id = hospital_id pour les DES existants
-- =============================================================================

-- Règle : pour tout profil déjà affecté à un hôpital (hospital_id non null)
-- et dont home_hospital_id est encore null, on recopie la valeur actuelle.
-- Cela rend la suppression/modification conforme au nouveau modèle immédiatement.

UPDATE public.profiles
SET home_hospital_id = hospital_id
WHERE hospital_id IS NOT NULL
  AND home_hospital_id IS NULL;

-- =============================================================================
-- 9. RLS — hospital_services
-- =============================================================================

ALTER TABLE public.hospital_services ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié rattaché au même hôpital (home ou stage)
-- + tous les admins / developer
CREATE POLICY hospital_services_select ON public.hospital_services
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin')
    OR hospital_id IN (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT home_hospital_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Écriture : developer, institution_admin (scoping via app layer), admin legacy
CREATE POLICY hospital_services_insert ON public.hospital_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin')
  );

CREATE POLICY hospital_services_update ON public.hospital_services
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin')
  );

CREATE POLICY hospital_services_delete ON public.hospital_services
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'superadmin', 'developer')
  );

-- =============================================================================
-- 10. RLS — stage_assignments
-- =============================================================================

ALTER TABLE public.stage_assignments ENABLE ROW LEVEL SECURITY;

-- Un DES voit ses propres stages ; admins voient tout
CREATE POLICY stage_assignments_select ON public.stage_assignments
  FOR SELECT
  TO authenticated
  USING (
    des_id = auth.uid()
    OR public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin', 'service_chief', 'supervisor')
  );

CREATE POLICY stage_assignments_insert ON public.stage_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin', 'service_chief')
  );

CREATE POLICY stage_assignments_update ON public.stage_assignments
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin', 'service_chief')
  );

CREATE POLICY stage_assignments_delete ON public.stage_assignments
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'superadmin', 'developer')
  );

-- =============================================================================
-- 11. RLS — hospital_settings
-- =============================================================================

ALTER TABLE public.hospital_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY hospital_settings_select ON public.hospital_settings
  FOR SELECT
  TO authenticated
  USING (true); -- Lecture publique (couleurs = thème visible partout)

CREATE POLICY hospital_settings_insert ON public.hospital_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin')
  );

CREATE POLICY hospital_settings_update ON public.hospital_settings
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'superadmin', 'developer', 'institution_admin')
  );

-- =============================================================================
-- 12. RLS — institution_registrations
-- =============================================================================

ALTER TABLE public.institution_registrations ENABLE ROW LEVEL SECURITY;

-- Le recteur voit sa propre demande, le developer voit tout, nul autre
CREATE POLICY institution_registrations_select ON public.institution_registrations
  FOR SELECT
  TO authenticated
  USING (
    rector_user_id = auth.uid()
    OR public.get_user_role() = 'developer'
  );

-- N'importe quel utilisateur authentifié peut créer une demande (son recteur_user_id)
CREATE POLICY institution_registrations_insert ON public.institution_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rector_user_id = auth.uid()
    OR public.get_user_role() = 'developer'
  );

-- Seul le developer peut modifier le statut (verified / rejected)
CREATE POLICY institution_registrations_update ON public.institution_registrations
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() = 'developer'
  );

-- =============================================================================
-- 13. Trigger : maintenir updated_at sur hospital_services et hospital_settings
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at_phase_b()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hospital_services_set_updated_at ON public.hospital_services;
CREATE TRIGGER hospital_services_set_updated_at
  BEFORE UPDATE ON public.hospital_services
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_phase_b();

DROP TRIGGER IF EXISTS hospital_settings_set_updated_at ON public.hospital_settings;
CREATE TRIGGER hospital_settings_set_updated_at
  BEFORE UPDATE ON public.hospital_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_phase_b();

-- =============================================================================
-- 14. Bootstrap hospital_settings pour les hôpitaux existants
-- =============================================================================

INSERT INTO public.hospital_settings (hospital_id)
SELECT h.id
FROM public.hospitals h
LEFT JOIN public.hospital_settings s ON s.hospital_id = h.id
WHERE s.id IS NULL;
