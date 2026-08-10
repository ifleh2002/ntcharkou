-- =============================================================================
-- Ntcharkou — Migration 5/5 : referentiel geographique du Maroc
-- 12 regions administratives et principales villes.
-- =============================================================================

insert into public.regions (code, name_fr, name_ar, sort_order) values
  ('tanger-tetouan-al-hoceima', 'Tanger-Tétouan-Al Hoceïma', 'طنجة تطوان الحسيمة',  1),
  ('oriental',                  'L''Oriental',                'الشرق',               2),
  ('fes-meknes',                'Fès-Meknès',                 'فاس مكناس',           3),
  ('rabat-sale-kenitra',        'Rabat-Salé-Kénitra',         'الرباط سلا القنيطرة', 4),
  ('beni-mellal-khenifra',      'Béni Mellal-Khénifra',       'بني ملال خنيفرة',     5),
  ('casablanca-settat',         'Casablanca-Settat',          'الدار البيضاء سطات',  6),
  ('marrakech-safi',            'Marrakech-Safi',             'مراكش آسفي',          7),
  ('draa-tafilalet',            'Drâa-Tafilalet',             'درعة تافيلالت',       8),
  ('souss-massa',               'Souss-Massa',                'سوس ماسة',            9),
  ('guelmim-oued-noun',         'Guelmim-Oued Noun',          'كلميم واد نون',      10),
  ('laayoune-sakia-el-hamra',   'Laâyoune-Sakia El Hamra',    'العيون الساقية الحمراء', 11),
  ('dakhla-oued-ed-dahab',      'Dakhla-Oued Ed-Dahab',       'الداخلة وادي الذهب',  12)
on conflict (code) do nothing;

insert into public.cities (region_code, name_fr, is_major) values
  -- Tanger-Tétouan-Al Hoceïma
  ('tanger-tetouan-al-hoceima', 'Tanger',        true),
  ('tanger-tetouan-al-hoceima', 'Tétouan',       true),
  ('tanger-tetouan-al-hoceima', 'Al Hoceïma',    true),
  ('tanger-tetouan-al-hoceima', 'Larache',       false),
  ('tanger-tetouan-al-hoceima', 'Chefchaouen',   false),
  ('tanger-tetouan-al-hoceima', 'Ksar El Kébir', false),
  ('tanger-tetouan-al-hoceima', 'Fnideq',        false),
  ('tanger-tetouan-al-hoceima', 'Martil',        false),
  ('tanger-tetouan-al-hoceima', 'Asilah',        false),
  ('tanger-tetouan-al-hoceima', 'Ouezzane',      false),

  -- L'Oriental
  ('oriental', 'Oujda',      true),
  ('oriental', 'Nador',      true),
  ('oriental', 'Berkane',    false),
  ('oriental', 'Taourirt',   false),
  ('oriental', 'Jerada',     false),
  ('oriental', 'Driouch',    false),
  ('oriental', 'Guercif',    false),
  ('oriental', 'Saïdia',     false),
  ('oriental', 'Figuig',     false),

  -- Fès-Meknès
  ('fes-meknes', 'Fès',            true),
  ('fes-meknes', 'Meknès',         true),
  ('fes-meknes', 'Taza',           false),
  ('fes-meknes', 'Sefrou',         false),
  ('fes-meknes', 'Ifrane',         false),
  ('fes-meknes', 'Moulay Yacoub',  false),
  ('fes-meknes', 'El Hajeb',       false),
  ('fes-meknes', 'Taounate',       false),
  ('fes-meknes', 'Boulemane',      false),

  -- Rabat-Salé-Kénitra
  ('rabat-sale-kenitra', 'Rabat',        true),
  ('rabat-sale-kenitra', 'Salé',         true),
  ('rabat-sale-kenitra', 'Kénitra',      true),
  ('rabat-sale-kenitra', 'Témara',       true),
  ('rabat-sale-kenitra', 'Skhirat',      false),
  ('rabat-sale-kenitra', 'Khémisset',    false),
  ('rabat-sale-kenitra', 'Sidi Kacem',   false),
  ('rabat-sale-kenitra', 'Sidi Slimane', false),
  ('rabat-sale-kenitra', 'Tiflet',       false),
  ('rabat-sale-kenitra', 'Bouknadel',    false),

  -- Béni Mellal-Khénifra
  ('beni-mellal-khenifra', 'Béni Mellal',  true),
  ('beni-mellal-khenifra', 'Khénifra',     false),
  ('beni-mellal-khenifra', 'Khouribga',    true),
  ('beni-mellal-khenifra', 'Fquih Ben Salah', false),
  ('beni-mellal-khenifra', 'Azilal',       false),
  ('beni-mellal-khenifra', 'Kasba Tadla',  false),
  ('beni-mellal-khenifra', 'Oued Zem',     false),

  -- Casablanca-Settat
  ('casablanca-settat', 'Casablanca',      true),
  ('casablanca-settat', 'Mohammédia',      true),
  ('casablanca-settat', 'Settat',          true),
  ('casablanca-settat', 'El Jadida',       true),
  ('casablanca-settat', 'Berrechid',       false),
  ('casablanca-settat', 'Benslimane',      false),
  ('casablanca-settat', 'Bouskoura',       false),
  ('casablanca-settat', 'Dar Bouazza',     false),
  ('casablanca-settat', 'Nouaceur',        false),
  ('casablanca-settat', 'Médiouna',        false),
  ('casablanca-settat', 'Azemmour',        false),
  ('casablanca-settat', 'Sidi Bennour',    false),

  -- Marrakech-Safi
  ('marrakech-safi', 'Marrakech',     true),
  ('marrakech-safi', 'Safi',          true),
  ('marrakech-safi', 'Essaouira',     true),
  ('marrakech-safi', 'El Kelâa des Sraghna', false),
  ('marrakech-safi', 'Youssoufia',    false),
  ('marrakech-safi', 'Chichaoua',     false),
  ('marrakech-safi', 'Ben Guerir',    false),
  ('marrakech-safi', 'Amizmiz',       false),

  -- Drâa-Tafilalet
  ('draa-tafilalet', 'Errachidia',  true),
  ('draa-tafilalet', 'Ouarzazate',  true),
  ('draa-tafilalet', 'Zagora',      false),
  ('draa-tafilalet', 'Tinghir',     false),
  ('draa-tafilalet', 'Midelt',      false),
  ('draa-tafilalet', 'Erfoud',      false),

  -- Souss-Massa
  ('souss-massa', 'Agadir',           true),
  ('souss-massa', 'Inezgane',         true),
  ('souss-massa', 'Aït Melloul',      false),
  ('souss-massa', 'Taroudant',        false),
  ('souss-massa', 'Tiznit',           false),
  ('souss-massa', 'Ouarzazate Massa', false),
  ('souss-massa', 'Tata',             false),
  ('souss-massa', 'Chtouka Aït Baha', false),

  -- Guelmim-Oued Noun
  ('guelmim-oued-noun', 'Guelmim',    true),
  ('guelmim-oued-noun', 'Tan-Tan',    false),
  ('guelmim-oued-noun', 'Sidi Ifni',  false),
  ('guelmim-oued-noun', 'Assa-Zag',   false),

  -- Laâyoune-Sakia El Hamra
  ('laayoune-sakia-el-hamra', 'Laâyoune',  true),
  ('laayoune-sakia-el-hamra', 'Boujdour',  false),
  ('laayoune-sakia-el-hamra', 'Tarfaya',   false),
  ('laayoune-sakia-el-hamra', 'Es-Semara', false),

  -- Dakhla-Oued Ed-Dahab
  ('dakhla-oued-ed-dahab', 'Dakhla',    true),
  ('dakhla-oued-ed-dahab', 'Aousserd',  false)
on conflict (region_code, name_fr) do nothing;
