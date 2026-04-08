-- Migration : Ajout avatar, date de naissance, rôle developer, storage bucket avatars
-- À exécuter dans le SQL Editor de Supabase Dashboard

-- 1. Ajout colonnes profil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 2. Créer le bucket storage pour les avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Politique storage : les utilisateurs peuvent uploader leur propre avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 4. Mettre à jour la fonction get_user_role() pour inclure le rôle developer
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- 5. Mettre à jour les politiques RLS pour inclure le rôle developer
-- (Les politiques existantes utilisent get_user_role() IN ('admin', 'superadmin'), il faut ajouter 'developer')

-- Profils : admin peut modifier les profils
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'superadmin', 'developer'));

-- Hôpitaux : admin write
DROP POLICY IF EXISTS "hospitals_admin_write" ON hospitals;
CREATE POLICY "hospitals_admin_write" ON hospitals
  FOR ALL
  USING (get_user_role() IN ('admin', 'superadmin', 'developer'));

-- DES Objectives : admin write
DROP POLICY IF EXISTS "des_objectives_admin_write" ON des_objectives;
CREATE POLICY "des_objectives_admin_write" ON des_objectives
  FOR ALL
  USING (get_user_role() IN ('admin', 'superadmin', 'developer'));

-- Spécialités : admin write
DROP POLICY IF EXISTS "specialties_admin_write" ON specialties;
CREATE POLICY "specialties_admin_write" ON specialties
  FOR ALL
  USING (get_user_role() IN ('admin', 'superadmin', 'developer'));

-- Procédures : admin write
DROP POLICY IF EXISTS "procedures_admin_write" ON procedures;
CREATE POLICY "procedures_admin_write" ON procedures
  FOR ALL
  USING (get_user_role() IN ('admin', 'superadmin', 'developer'));

-- DES Registry : admin write
DROP POLICY IF EXISTS "des_registry_admin_write" ON des_registry;
CREATE POLICY "des_registry_admin_write" ON des_registry
  FOR ALL
  USING (get_user_role() IN ('admin', 'superadmin', 'developer'));

-- 6. Définir le premier utilisateur comme developer (votre compte)
-- Décommentez et remplacez YOUR_EMAIL par votre email
-- UPDATE profiles SET role = 'developer' WHERE email = 'YOUR_EMAIL';
