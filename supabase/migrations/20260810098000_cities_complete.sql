-- =============================================================================
-- Ntcharkou — Référentiel géographique complet
--
-- Les 12 régions administratives du Maroc étaient déjà en place (migration
-- 20260810094000). Cette migration remplace la sélection de villes principales
-- par l'ensemble des communes urbaines / municipalités du Royaume, région par
-- région — 283 entrées, chaque région étant pourvue.
--
-- Portée retenue : les communes urbaines (municipalités). Les communes rurales,
-- douars et centres délégués n'y figurent pas ; le formulaire propriétaire
-- prévoit pour cela le champ libre « Autre ville / commune » (`city_other`).
-- Ajouter une localité manquante ne demande qu'une ligne dans ce fichier ou une
-- insertion depuis le back-office.
--
-- `is_major` distingue les chefs-lieux de région et de province : l'interface
-- s'en sert pour les mettre en avant dans les listes.
-- =============================================================================

-- --- Corrections du jeu initial ---------------------------------------------
-- Trois entrées à retirer : « Ouarzazate Massa » n'existe pas, tandis que
-- « Chtouka Aït Baha » et « Assa-Zag » sont des provinces et non des villes
-- (leurs chefs-lieux, Biougra et Assa, figurent bien dans la liste ci-dessous).
delete from public.cities
 where (region_code = 'souss-massa' and name_fr in ('Ouarzazate Massa', 'Chtouka Aït Baha'))
    or (region_code = 'guelmim-oued-noun' and name_fr = 'Assa-Zag');

-- --- Ajout des communes urbaines --------------------------------------------
insert into public.cities (region_code, name_fr, is_major) values

  -- ===== 1. Tanger-Tétouan-Al Hoceïma =======================================
  ('tanger-tetouan-al-hoceima', 'Tanger',              true),
  ('tanger-tetouan-al-hoceima', 'Tétouan',             true),
  ('tanger-tetouan-al-hoceima', 'Al Hoceïma',          true),
  ('tanger-tetouan-al-hoceima', 'Larache',             true),
  ('tanger-tetouan-al-hoceima', 'Chefchaouen',         true),
  ('tanger-tetouan-al-hoceima', 'Ouezzane',            true),
  ('tanger-tetouan-al-hoceima', 'Ksar El Kébir',       false),
  ('tanger-tetouan-al-hoceima', 'Asilah',              false),
  ('tanger-tetouan-al-hoceima', 'Ksar Es-Seghir',      false),
  ('tanger-tetouan-al-hoceima', 'Martil',              false),
  ('tanger-tetouan-al-hoceima', 'M''diq',              false),
  ('tanger-tetouan-al-hoceima', 'Fnideq',              false),
  ('tanger-tetouan-al-hoceima', 'Oued Laou',           false),
  ('tanger-tetouan-al-hoceima', 'Bab Taza',            false),
  ('tanger-tetouan-al-hoceima', 'Zoumi',               false),
  ('tanger-tetouan-al-hoceima', 'Imzouren',            false),
  ('tanger-tetouan-al-hoceima', 'Bni Bouayach',        false),
  ('tanger-tetouan-al-hoceima', 'Targuist',            false),
  ('tanger-tetouan-al-hoceima', 'Ajdir',               false),
  ('tanger-tetouan-al-hoceima', 'Jebha',               false),
  ('tanger-tetouan-al-hoceima', 'Bni Hadifa',          false),
  ('tanger-tetouan-al-hoceima', 'Dar Chaoui',          false),

  -- ===== 2. L'Oriental =======================================================
  ('oriental', 'Oujda',                    true),
  ('oriental', 'Nador',                    true),
  ('oriental', 'Berkane',                  true),
  ('oriental', 'Taourirt',                 true),
  ('oriental', 'Guercif',                  true),
  ('oriental', 'Jerada',                   true),
  ('oriental', 'Driouch',                  true),
  ('oriental', 'Figuig',                   true),
  ('oriental', 'Bouarfa',                  false),
  ('oriental', 'Saïdia',                   false),
  ('oriental', 'Ahfir',                    false),
  ('oriental', 'Zaïo',                     false),
  ('oriental', 'Selouane',                 false),
  ('oriental', 'Al Aaroui',                false),
  ('oriental', 'Beni Ansar',               false),
  ('oriental', 'Ras El Ma',                false),
  ('oriental', 'Ben Taïeb',                false),
  ('oriental', 'Midar',                    false),
  ('oriental', 'Aïn Beni Mathar',          false),
  ('oriental', 'El Aïoun Sidi Mellouk',    false),
  ('oriental', 'Debdou',                   false),
  ('oriental', 'Talsint',                  false),
  ('oriental', 'Tendrara',                 false),
  ('oriental', 'Bni Drar',                 false),
  ('oriental', 'Naïma',                    false),
  ('oriental', 'Touissit',                 false),
  ('oriental', 'Sidi Slimane Echcharaa',   false),
  ('oriental', 'Madagh',                   false),
  ('oriental', 'Aklim',                    false),

  -- ===== 3. Fès-Meknès =======================================================
  ('fes-meknes', 'Fès',                    true),
  ('fes-meknes', 'Meknès',                 true),
  ('fes-meknes', 'Taza',                   true),
  ('fes-meknes', 'Sefrou',                 true),
  ('fes-meknes', 'Ifrane',                 true),
  ('fes-meknes', 'El Hajeb',               true),
  ('fes-meknes', 'Moulay Yacoub',          true),
  ('fes-meknes', 'Taounate',               true),
  ('fes-meknes', 'Boulemane',              true),
  ('fes-meknes', 'Azrou',                  false),
  ('fes-meknes', 'Agourai',                false),
  ('fes-meknes', 'Aïn Taoujdate',          false),
  ('fes-meknes', 'Moulay Idriss Zerhoun',  false),
  ('fes-meknes', 'Boufakrane',             false),
  ('fes-meknes', 'Sebaa Ayoun',            false),
  ('fes-meknes', 'Bhalil',                 false),
  ('fes-meknes', 'El Menzel',              false),
  ('fes-meknes', 'Ribate El Kheir',        false),
  ('fes-meknes', 'Imouzzer Kandar',        false),
  ('fes-meknes', 'Imouzzer Marmoucha',     false),
  ('fes-meknes', 'Missour',                false),
  ('fes-meknes', 'Outat El Haj',           false),
  ('fes-meknes', 'Tissa',                  false),
  ('fes-meknes', 'Karia Ba Mohamed',       false),
  ('fes-meknes', 'Ghafsaï',                false),
  ('fes-meknes', 'Rhafsaï',                false),
  ('fes-meknes', 'Aïn Aïcha',              false),
  ('fes-meknes', 'Thar Es-Souk',           false),
  ('fes-meknes', 'Tahla',                  false),
  ('fes-meknes', 'Oued Amlil',             false),
  ('fes-meknes', 'Aknoul',                 false),
  ('fes-meknes', 'Tizi Ouasli',            false),
  ('fes-meknes', 'Matmata',                false),
  ('fes-meknes', 'Ouled Tayeb',            false),

  -- ===== 4. Rabat-Salé-Kénitra ==============================================
  ('rabat-sale-kenitra', 'Rabat',                  true),
  ('rabat-sale-kenitra', 'Salé',                   true),
  ('rabat-sale-kenitra', 'Kénitra',                true),
  ('rabat-sale-kenitra', 'Témara',                 true),
  ('rabat-sale-kenitra', 'Khémisset',              true),
  ('rabat-sale-kenitra', 'Sidi Kacem',             true),
  ('rabat-sale-kenitra', 'Sidi Slimane',           true),
  ('rabat-sale-kenitra', 'Skhirat',                false),
  ('rabat-sale-kenitra', 'Harhoura',               false),
  ('rabat-sale-kenitra', 'Aïn El Aouda',           false),
  ('rabat-sale-kenitra', 'Aïn Attig',              false),
  ('rabat-sale-kenitra', 'Sidi Yahya Zaer',        false),
  ('rabat-sale-kenitra', 'Bouknadel',              false),
  ('rabat-sale-kenitra', 'Mehdia',                 false),
  ('rabat-sale-kenitra', 'Sidi Taïbi',             false),
  ('rabat-sale-kenitra', 'Sidi Allal Tazi',        false),
  ('rabat-sale-kenitra', 'Moulay Bousselham',      false),
  ('rabat-sale-kenitra', 'Lalla Mimouna',          false),
  ('rabat-sale-kenitra', 'Arbaoua',                false),
  ('rabat-sale-kenitra', 'Souk El Arbaa',          false),
  ('rabat-sale-kenitra', 'Sidi Yahya El Gharb',    false),
  ('rabat-sale-kenitra', 'Mechra Bel Ksiri',       false),
  ('rabat-sale-kenitra', 'Jorf El Melha',          false),
  ('rabat-sale-kenitra', 'Had Kourt',              false),
  ('rabat-sale-kenitra', 'Tiflet',                 false),
  ('rabat-sale-kenitra', 'Rommani',                false),
  ('rabat-sale-kenitra', 'Maâziz',                 false),
  ('rabat-sale-kenitra', 'Tiddas',                 false),
  ('rabat-sale-kenitra', 'Oulmès',                 false),
  ('rabat-sale-kenitra', 'Sidi Allal El Bahraoui', false),
  ('rabat-sale-kenitra', 'Ezzhiliga',              false),
  ('rabat-sale-kenitra', 'Khemis Sidi Yahya',      false),

  -- ===== 5. Béni Mellal-Khénifra ============================================
  ('beni-mellal-khenifra', 'Béni Mellal',            true),
  ('beni-mellal-khenifra', 'Khouribga',              true),
  ('beni-mellal-khenifra', 'Khénifra',               true),
  ('beni-mellal-khenifra', 'Azilal',                 true),
  ('beni-mellal-khenifra', 'Fquih Ben Salah',        true),
  ('beni-mellal-khenifra', 'Kasba Tadla',            false),
  ('beni-mellal-khenifra', 'El Ksiba',               false),
  ('beni-mellal-khenifra', 'Zaouiat Cheikh',         false),
  ('beni-mellal-khenifra', 'Souk Sebt Ouled Nemma',  false),
  ('beni-mellal-khenifra', 'Oulad Ayad',             false),
  ('beni-mellal-khenifra', 'Oulad M''Barek',         false),
  ('beni-mellal-khenifra', 'Demnate',                false),
  ('beni-mellal-khenifra', 'Afourer',                false),
  ('beni-mellal-khenifra', 'Bzou',                   false),
  ('beni-mellal-khenifra', 'Ouaouizeght',            false),
  ('beni-mellal-khenifra', 'M''rirt',                false),
  ('beni-mellal-khenifra', 'Aguelmous',              false),
  ('beni-mellal-khenifra', 'El Kbab',                false),
  ('beni-mellal-khenifra', 'Moulay Bouazza',         false),
  ('beni-mellal-khenifra', 'Aït Ishaq',              false),
  ('beni-mellal-khenifra', 'Tighassaline',           false),
  ('beni-mellal-khenifra', 'Oued Zem',               false),
  ('beni-mellal-khenifra', 'Boujaad',                false),
  ('beni-mellal-khenifra', 'Hattane',                false),

  -- ===== 6. Casablanca-Settat ===============================================
  ('casablanca-settat', 'Casablanca',        true),
  ('casablanca-settat', 'Mohammédia',        true),
  ('casablanca-settat', 'El Jadida',         true),
  ('casablanca-settat', 'Settat',            true),
  ('casablanca-settat', 'Berrechid',         true),
  ('casablanca-settat', 'Benslimane',        true),
  ('casablanca-settat', 'Sidi Bennour',      true),
  ('casablanca-settat', 'Nouaceur',          true),
  ('casablanca-settat', 'Médiouna',          true),
  ('casablanca-settat', 'Aïn Harrouda',      false),
  ('casablanca-settat', 'Bouskoura',         false),
  ('casablanca-settat', 'Dar Bouazza',       false),
  ('casablanca-settat', 'Tit Mellil',        false),
  ('casablanca-settat', 'Lahraouyine',       false),
  ('casablanca-settat', 'Bouznika',          false),
  ('casablanca-settat', 'Deroua',            false),
  ('casablanca-settat', 'Had Soualem',       false),
  ('casablanca-settat', 'Sidi Rahal Chatai', false),
  ('casablanca-settat', 'Azemmour',          false),
  ('casablanca-settat', 'Bir Jdid',          false),
  ('casablanca-settat', 'Moulay Abdallah',   false),
  ('casablanca-settat', 'Oualidia',          false),
  ('casablanca-settat', 'Zemamra',           false),
  ('casablanca-settat', 'Sidi Smaïl',        false),
  ('casablanca-settat', 'Ben Ahmed',         false),
  ('casablanca-settat', 'Guisser',           false),
  ('casablanca-settat', 'El Borouj',         false),
  ('casablanca-settat', 'El Gara',           false),
  ('casablanca-settat', 'Oulad Abbou',       false),
  ('casablanca-settat', 'Oulad Saïd',        false),
  ('casablanca-settat', 'Loulad',            false),
  ('casablanca-settat', 'Ras El Aïn',        false),
  ('casablanca-settat', 'Sidi Hajjaj',       false),

  -- ===== 7. Marrakech-Safi ==================================================
  ('marrakech-safi', 'Marrakech',              true),
  ('marrakech-safi', 'Safi',                   true),
  ('marrakech-safi', 'Essaouira',              true),
  ('marrakech-safi', 'El Kelâa des Sraghna',   true),
  ('marrakech-safi', 'Youssoufia',             true),
  ('marrakech-safi', 'Chichaoua',              true),
  ('marrakech-safi', 'Ben Guerir',             true),
  ('marrakech-safi', 'Tahannaout',             true),
  ('marrakech-safi', 'Aït Ourir',              false),
  ('marrakech-safi', 'Amizmiz',                false),
  ('marrakech-safi', 'Moulay Brahim',          false),
  ('marrakech-safi', 'Asni',                   false),
  ('marrakech-safi', 'Imintanoute',            false),
  ('marrakech-safi', 'Tamallalt',              false),
  ('marrakech-safi', 'El Attaouia',            false),
  ('marrakech-safi', 'Sidi Rahal',             false),
  ('marrakech-safi', 'Sidi Bou Othmane',       false),
  ('marrakech-safi', 'Skhour Rehamna',         false),
  ('marrakech-safi', 'Sebt Gzoula',            false),
  ('marrakech-safi', 'Jemaa Shaim',            false),
  ('marrakech-safi', 'Chemaïa',                false),
  ('marrakech-safi', 'Tamanar',                false),
  ('marrakech-safi', 'Smimou',                 false),
  ('marrakech-safi', 'Talmest',                false),
  ('marrakech-safi', 'Ighoud',                 false),
  ('marrakech-safi', 'Loudaya',                false),

  -- ===== 8. Drâa-Tafilalet ==================================================
  ('draa-tafilalet', 'Errachidia',        true),
  ('draa-tafilalet', 'Ouarzazate',        true),
  ('draa-tafilalet', 'Zagora',            true),
  ('draa-tafilalet', 'Tinghir',           true),
  ('draa-tafilalet', 'Midelt',            true),
  ('draa-tafilalet', 'Erfoud',            false),
  ('draa-tafilalet', 'Rissani',           false),
  ('draa-tafilalet', 'Goulmima',          false),
  ('draa-tafilalet', 'Tinejdad',          false),
  ('draa-tafilalet', 'Jorf',              false),
  ('draa-tafilalet', 'Boudnib',           false),
  ('draa-tafilalet', 'Er-Rich',           false),
  ('draa-tafilalet', 'Zaïda',             false),
  ('draa-tafilalet', 'Itzer',             false),
  ('draa-tafilalet', 'Boumia',            false),
  ('draa-tafilalet', 'Taznakht',          false),
  ('draa-tafilalet', 'Skoura',            false),
  ('draa-tafilalet', 'Agdz',              false),
  ('draa-tafilalet', 'Kelaat M''Gouna',   false),
  ('draa-tafilalet', 'Boumalne Dadès',    false),
  ('draa-tafilalet', 'Tagounite',         false),
  ('draa-tafilalet', 'Mhamid El Ghizlane',false),
  ('draa-tafilalet', 'Alnif',             false),
  ('draa-tafilalet', 'Tazarine',          false),
  ('draa-tafilalet', 'Aoufous',           false),
  ('draa-tafilalet', 'Amerzgane',         false),

  -- ===== 9. Souss-Massa =====================================================
  ('souss-massa', 'Agadir',                true),
  ('souss-massa', 'Inezgane',              true),
  ('souss-massa', 'Taroudant',             true),
  ('souss-massa', 'Tiznit',                true),
  ('souss-massa', 'Tata',                  true),
  ('souss-massa', 'Biougra',               true),
  ('souss-massa', 'Aït Melloul',           false),
  ('souss-massa', 'Dcheira El Jihadia',    false),
  ('souss-massa', 'Lqliaa',                false),
  ('souss-massa', 'Temsia',                false),
  ('souss-massa', 'Drarga',                false),
  ('souss-massa', 'Aourir',                false),
  ('souss-massa', 'Aït Baha',              false),
  ('souss-massa', 'Belfaa',                false),
  ('souss-massa', 'Sidi Bibi',             false),
  ('souss-massa', 'Massa',                 false),
  ('souss-massa', 'Oulad Teima',           false),
  ('souss-massa', 'Aït Iaaza',             false),
  ('souss-massa', 'Ouled Berhil',          false),
  ('souss-massa', 'Taliouine',             false),
  ('souss-massa', 'Aoulouz',               false),
  ('souss-massa', 'Igherm',                false),
  ('souss-massa', 'Tafraout',              false),
  ('souss-massa', 'Foum Zguid',            false),
  ('souss-massa', 'Akka',                  false),
  ('souss-massa', 'Fam El Hisn',           false),
  ('souss-massa', 'Tissint',               false),
  ('souss-massa', 'Arazane',               false),

  -- ===== 10. Guelmim-Oued Noun ==============================================
  ('guelmim-oued-noun', 'Guelmim',      true),
  ('guelmim-oued-noun', 'Tan-Tan',      true),
  ('guelmim-oued-noun', 'Sidi Ifni',    true),
  ('guelmim-oued-noun', 'Assa',         true),
  ('guelmim-oued-noun', 'Zag',          false),
  ('guelmim-oued-noun', 'Bouizakarne',  false),
  ('guelmim-oued-noun', 'El Ouatia',    false),
  ('guelmim-oued-noun', 'Mirleft',      false),
  ('guelmim-oued-noun', 'Lakhsas',      false),
  ('guelmim-oued-noun', 'Taghjijt',     false),
  ('guelmim-oued-noun', 'Abaynou',      false),

  -- ===== 11. Laâyoune-Sakia El Hamra ========================================
  ('laayoune-sakia-el-hamra', 'Laâyoune',    true),
  ('laayoune-sakia-el-hamra', 'Es-Semara',   true),
  ('laayoune-sakia-el-hamra', 'Boujdour',    true),
  ('laayoune-sakia-el-hamra', 'Tarfaya',     true),
  ('laayoune-sakia-el-hamra', 'El Marsa',    false),
  ('laayoune-sakia-el-hamra', 'Foum El Oued',false),
  ('laayoune-sakia-el-hamra', 'Akhfennir',   false),
  ('laayoune-sakia-el-hamra', 'Daoura',      false),
  ('laayoune-sakia-el-hamra', 'Jdiriya',     false),

  -- ===== 12. Dakhla-Oued Ed-Dahab ===========================================
  ('dakhla-oued-ed-dahab', 'Dakhla',           true),
  ('dakhla-oued-ed-dahab', 'Aousserd',         true),
  ('dakhla-oued-ed-dahab', 'El Argoub',        false),
  ('dakhla-oued-ed-dahab', 'Bir Anzarane',     false),
  ('dakhla-oued-ed-dahab', 'Bir Gandouz',      false),
  ('dakhla-oued-ed-dahab', 'Tichla',           false),
  ('dakhla-oued-ed-dahab', 'Gleibat El Foula', false),
  ('dakhla-oued-ed-dahab', 'Imlili',           false)

on conflict (region_code, name_fr) do update
  set is_major = excluded.is_major;

-- --- Contrôle : les 12 régions doivent toutes être pourvues -----------------
do $$
declare
  orphan text;
  total  integer;
begin
  select string_agg(r.code, ', ') into orphan
  from public.regions r
  where not exists (select 1 from public.cities c where c.region_code = r.code);

  if orphan is not null then
    raise exception 'Régions sans aucune ville : %', orphan;
  end if;

  select count(*) into total from public.cities;
  raise notice 'Référentiel : % régions, % villes',
    (select count(*) from public.regions), total;
end;
$$;
