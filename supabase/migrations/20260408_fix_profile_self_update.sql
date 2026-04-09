-- Fix : permettre à TOUT utilisateur authentifié de modifier son propre profil
-- Corrige l'erreur RLS "new row violates row-level security policy" sur upload avatar / update profil

-- Politique : un utilisateur peut modifier son propre profil (champs non-sensibles)
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
