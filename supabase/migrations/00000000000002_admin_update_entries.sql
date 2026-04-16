-- Migration : admin_update_entries
-- Date       : 2026-04-15
-- Contexte   : Bug découvert depuis le panneau Supervision — un super_admin
--              ne pouvait pas valider/rejeter une entry dont il n'était ni
--              le supervisor_id ni lié à l'étudiant via supervisor_assignments.
--              Les policies UPDATE existantes sur entries :
--                - entries_update_own             → auth.uid() = user_id
--                - entries_update_supervisor      → auth.uid() = supervisor_id
--                - entries_supervisor_validate    → lien supervisor_assignments
--                - entries_service_role           → service_role uniquement
--              Aucune n'accorde d'accès aux rôles admin/superadmin/developer.
--              Le server action validateEntry() utilise createClient() (cookie,
--              soumis au RLS), donc l'UPDATE était silencieusement bloqué
--              et retournait success sans toucher la base.
--
-- Objectif   : Ajouter entries_update_admin symétrique à entries_admin_view
--              pour permettre aux rôles élevés d'updater les entries :
--                - superadmin : accès global
--                - developer  : accès global
--                - admin      : scopé à son hôpital (hospital_id == get_user_hospital_id)

CREATE POLICY entries_update_admin ON public.entries
  FOR UPDATE
  TO authenticated
  USING (
    (public.get_user_role(auth.uid()) = ANY (ARRAY[
      'superadmin'::public.user_role,
      'developer'::public.user_role
    ]))
    OR (
      public.get_user_role(auth.uid()) = 'admin'::public.user_role
      AND public.get_user_hospital_id(auth.uid()) = hospital_id
    )
  )
  WITH CHECK (
    (public.get_user_role(auth.uid()) = ANY (ARRAY[
      'superadmin'::public.user_role,
      'developer'::public.user_role
    ]))
    OR (
      public.get_user_role(auth.uid()) = 'admin'::public.user_role
      AND public.get_user_hospital_id(auth.uid()) = hospital_id
    )
  );

COMMENT ON POLICY entries_update_admin ON public.entries IS
  'Permet aux rôles superadmin et developer d''updater n''importe quelle entry, et aux admins de leur hôpital. Requis pour le panneau Supervision où un super_admin doit pouvoir valider ou rejeter une intervention globalement, pas seulement celles dont il est le superviseur désigné.';
