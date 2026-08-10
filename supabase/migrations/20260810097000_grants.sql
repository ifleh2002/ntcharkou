-- =============================================================================
-- Ntcharkou — Privilèges explicites sur les tables
--
-- Supabase accorde ces droits automatiquement via ALTER DEFAULT PRIVILEGES,
-- mais on les pose explicitement : la sécurité réelle est portée par RLS, et
-- une politique sans GRANT (ou l'inverse) est une source de bugs silencieux.
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- --- Référentiel : lecture pour tous ----------------------------------------
grant select on public.regions to anon, authenticated;
grant select on public.cities  to anon, authenticated;

-- --- Contenu public (le filtrage par statut est fait par RLS) ---------------
grant select on public.land_listings to anon, authenticated;
grant select on public.land_images   to anon, authenticated;
grant select on public.projects      to anon, authenticated;

-- --- Écriture réservée aux comptes connectés --------------------------------
grant select, insert, update          on public.profiles             to authenticated;
grant select, insert, update          on public.owner_profiles       to authenticated;
grant select, insert, update          on public.participant_profiles to authenticated;
grant select, insert, update, delete  on public.land_listings        to authenticated;
grant select, insert, update, delete  on public.land_images          to authenticated;
grant select, insert, update, delete  on public.land_documents       to authenticated;
grant select, insert, update, delete  on public.participant_requests to authenticated;
grant select, insert, update, delete  on public.projects             to authenticated;
grant select, insert, update, delete  on public.project_participants to authenticated;
grant select, insert, update, delete  on public.project_documents    to authenticated;
grant select, update                  on public.matches              to authenticated;
grant select, insert, delete          on public.favorites            to authenticated;
grant select, insert, update          on public.notifications        to authenticated;
grant select, insert                  on public.admin_actions        to authenticated;
grant select, insert, update          on public.reports              to authenticated;

-- Les documents de projet marqués publics restent lisibles sans compte.
grant select on public.project_documents to anon;

-- --- Séquences des références lisibles (TER-…, DEM-…, PRJ-…) ----------------
-- `assign_reference` s'exécute avec les droits de l'appelant : sans USAGE,
-- l'insertion d'un terrain échouerait.
grant usage on sequence public.land_reference_seq    to authenticated;
grant usage on sequence public.request_reference_seq to authenticated;
grant usage on sequence public.project_reference_seq to authenticated;
