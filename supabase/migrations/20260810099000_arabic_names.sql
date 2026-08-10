-- =============================================================================
-- Ntcharkou — Toponymie arabe
--
-- Les 12 régions portaient déjà leur nom arabe (migration 20260810094000).
-- Cette migration ajoute celui des 282 communes, et expose les deux graphies
-- dans les vues publiques pour que l'application choisisse selon la langue.
--
-- La toponymie marocaine connaît plusieurs graphies acceptables (notamment
-- pour les noms d'origine amazighe) : cette liste suit l'usage administratif
-- courant et gagne à être relue par un locuteur natif avant mise en production.
-- La colonne reste facultative — l'application retombe sur le nom français
-- lorsqu'elle est vide.
-- =============================================================================

update public.cities c
   set name_ar = v.name_ar
  from (values
  -- ===== Tanger-Tétouan-Al Hoceïma ==========================================
  ('tanger-tetouan-al-hoceima', 'Tanger',              'طنجة'),
  ('tanger-tetouan-al-hoceima', 'Tétouan',             'تطوان'),
  ('tanger-tetouan-al-hoceima', 'Al Hoceïma',          'الحسيمة'),
  ('tanger-tetouan-al-hoceima', 'Larache',             'العرائش'),
  ('tanger-tetouan-al-hoceima', 'Chefchaouen',         'شفشاون'),
  ('tanger-tetouan-al-hoceima', 'Ouezzane',            'وزان'),
  ('tanger-tetouan-al-hoceima', 'Ksar El Kébir',       'القصر الكبير'),
  ('tanger-tetouan-al-hoceima', 'Asilah',              'أصيلة'),
  ('tanger-tetouan-al-hoceima', 'Ksar Es-Seghir',      'القصر الصغير'),
  ('tanger-tetouan-al-hoceima', 'Martil',              'مرتيل'),
  ('tanger-tetouan-al-hoceima', 'M''diq',              'المضيق'),
  ('tanger-tetouan-al-hoceima', 'Fnideq',              'الفنيدق'),
  ('tanger-tetouan-al-hoceima', 'Oued Laou',           'واد لاو'),
  ('tanger-tetouan-al-hoceima', 'Bab Taza',            'باب تازة'),
  ('tanger-tetouan-al-hoceima', 'Zoumi',               'زومي'),
  ('tanger-tetouan-al-hoceima', 'Imzouren',            'إمزورن'),
  ('tanger-tetouan-al-hoceima', 'Bni Bouayach',        'بني بوعياش'),
  ('tanger-tetouan-al-hoceima', 'Targuist',            'ترجيست'),
  ('tanger-tetouan-al-hoceima', 'Ajdir',               'أجدير'),
  ('tanger-tetouan-al-hoceima', 'Jebha',               'الجبهة'),
  ('tanger-tetouan-al-hoceima', 'Bni Hadifa',          'بني حديفة'),
  ('tanger-tetouan-al-hoceima', 'Dar Chaoui',          'دار الشاوي'),

  -- ===== L'Oriental =========================================================
  ('oriental', 'Oujda',                    'وجدة'),
  ('oriental', 'Nador',                    'الناظور'),
  ('oriental', 'Berkane',                  'بركان'),
  ('oriental', 'Taourirt',                 'تاوريرت'),
  ('oriental', 'Guercif',                  'جرسيف'),
  ('oriental', 'Jerada',                   'جرادة'),
  ('oriental', 'Driouch',                  'الدريوش'),
  ('oriental', 'Figuig',                   'فجيج'),
  ('oriental', 'Bouarfa',                  'بوعرفة'),
  ('oriental', 'Saïdia',                   'السعيدية'),
  ('oriental', 'Ahfir',                    'أحفير'),
  ('oriental', 'Zaïo',                     'زايو'),
  ('oriental', 'Selouane',                 'سلوان'),
  ('oriental', 'Al Aaroui',                'العروي'),
  ('oriental', 'Beni Ansar',               'بني أنصار'),
  ('oriental', 'Ras El Ma',                'رأس الماء'),
  ('oriental', 'Ben Taïeb',                'بن الطيب'),
  ('oriental', 'Midar',                    'ميضار'),
  ('oriental', 'Aïn Beni Mathar',          'عين بني مطهر'),
  ('oriental', 'El Aïoun Sidi Mellouk',    'العيون سيدي ملوك'),
  ('oriental', 'Debdou',                   'دبدو'),
  ('oriental', 'Talsint',                  'تالسينت'),
  ('oriental', 'Tendrara',                 'تندرارة'),
  ('oriental', 'Bni Drar',                 'بني درار'),
  ('oriental', 'Naïma',                    'نعيمة'),
  ('oriental', 'Touissit',                 'تويسيت'),
  ('oriental', 'Sidi Slimane Echcharaa',   'سيدي سليمان الشراعة'),
  ('oriental', 'Madagh',                   'مداغ'),
  ('oriental', 'Aklim',                    'أقليم'),

  -- ===== Fès-Meknès =========================================================
  ('fes-meknes', 'Fès',                    'فاس'),
  ('fes-meknes', 'Meknès',                 'مكناس'),
  ('fes-meknes', 'Taza',                   'تازة'),
  ('fes-meknes', 'Sefrou',                 'صفرو'),
  ('fes-meknes', 'Ifrane',                 'إفران'),
  ('fes-meknes', 'El Hajeb',               'الحاجب'),
  ('fes-meknes', 'Moulay Yacoub',          'مولاي يعقوب'),
  ('fes-meknes', 'Taounate',               'تاونات'),
  ('fes-meknes', 'Boulemane',              'بولمان'),
  ('fes-meknes', 'Azrou',                  'أزرو'),
  ('fes-meknes', 'Agourai',                'أݣوراي'),
  ('fes-meknes', 'Aïn Taoujdate',          'عين تاوجطات'),
  ('fes-meknes', 'Moulay Idriss Zerhoun',  'مولاي إدريس زرهون'),
  ('fes-meknes', 'Boufakrane',             'بوفكران'),
  ('fes-meknes', 'Sebaa Ayoun',            'سبع عيون'),
  ('fes-meknes', 'Bhalil',                 'بهاليل'),
  ('fes-meknes', 'El Menzel',              'المنزل'),
  ('fes-meknes', 'Ribate El Kheir',        'رباط الخير'),
  ('fes-meknes', 'Imouzzer Kandar',        'إيموزار كندر'),
  ('fes-meknes', 'Imouzzer Marmoucha',     'إيموزار مرموشة'),
  ('fes-meknes', 'Missour',                'ميسور'),
  ('fes-meknes', 'Outat El Haj',           'أوطاط الحاج'),
  ('fes-meknes', 'Tissa',                  'تيسة'),
  ('fes-meknes', 'Karia Ba Mohamed',       'قرية با محمد'),
  ('fes-meknes', 'Ghafsaï',                'غفساي'),
  ('fes-meknes', 'Rhafsaï',                'رغيوة'),
  ('fes-meknes', 'Aïn Aïcha',              'عين عائشة'),
  ('fes-meknes', 'Thar Es-Souk',           'ثهار السوق'),
  ('fes-meknes', 'Tahla',                  'تاهلة'),
  ('fes-meknes', 'Oued Amlil',             'واد أمليل'),
  ('fes-meknes', 'Aknoul',                 'أكنول'),
  ('fes-meknes', 'Tizi Ouasli',            'تيزي وسلي'),
  ('fes-meknes', 'Matmata',                'مطماطة'),
  ('fes-meknes', 'Ouled Tayeb',            'أولاد الطيب'),

  -- ===== Rabat-Salé-Kénitra =================================================
  ('rabat-sale-kenitra', 'Rabat',                  'الرباط'),
  ('rabat-sale-kenitra', 'Salé',                   'سلا'),
  ('rabat-sale-kenitra', 'Kénitra',                'القنيطرة'),
  ('rabat-sale-kenitra', 'Témara',                 'تمارة'),
  ('rabat-sale-kenitra', 'Khémisset',              'الخميسات'),
  ('rabat-sale-kenitra', 'Sidi Kacem',             'سيدي قاسم'),
  ('rabat-sale-kenitra', 'Sidi Slimane',           'سيدي سليمان'),
  ('rabat-sale-kenitra', 'Skhirat',                'الصخيرات'),
  ('rabat-sale-kenitra', 'Harhoura',               'الهرهورة'),
  ('rabat-sale-kenitra', 'Aïn El Aouda',           'عين العودة'),
  ('rabat-sale-kenitra', 'Aïn Attig',              'عين عتيق'),
  ('rabat-sale-kenitra', 'Sidi Yahya Zaer',        'سيدي يحيى زعير'),
  ('rabat-sale-kenitra', 'Bouknadel',              'بوقنادل'),
  ('rabat-sale-kenitra', 'Mehdia',                 'المهدية'),
  ('rabat-sale-kenitra', 'Sidi Taïbi',             'سيدي الطيبي'),
  ('rabat-sale-kenitra', 'Sidi Allal Tazi',        'سيدي علال التازي'),
  ('rabat-sale-kenitra', 'Moulay Bousselham',      'مولاي بوسلهام'),
  ('rabat-sale-kenitra', 'Lalla Mimouna',          'لالة ميمونة'),
  ('rabat-sale-kenitra', 'Arbaoua',                'عرباوة'),
  ('rabat-sale-kenitra', 'Souk El Arbaa',          'سوق الأربعاء'),
  ('rabat-sale-kenitra', 'Sidi Yahya El Gharb',    'سيدي يحيى الغرب'),
  ('rabat-sale-kenitra', 'Mechra Bel Ksiri',       'مشرع بلقصيري'),
  ('rabat-sale-kenitra', 'Jorf El Melha',          'جرف الملحة'),
  ('rabat-sale-kenitra', 'Had Kourt',              'حد كورت'),
  ('rabat-sale-kenitra', 'Tiflet',                 'تيفلت'),
  ('rabat-sale-kenitra', 'Rommani',                'الرماني'),
  ('rabat-sale-kenitra', 'Maâziz',                 'معزيز'),
  ('rabat-sale-kenitra', 'Tiddas',                 'تيداس'),
  ('rabat-sale-kenitra', 'Oulmès',                 'أولماس'),
  ('rabat-sale-kenitra', 'Sidi Allal El Bahraoui', 'سيدي علال البحراوي'),
  ('rabat-sale-kenitra', 'Ezzhiliga',              'الزحيليكة'),
  ('rabat-sale-kenitra', 'Khemis Sidi Yahya',      'خميس سيدي يحيى'),

  -- ===== Béni Mellal-Khénifra ===============================================
  ('beni-mellal-khenifra', 'Béni Mellal',            'بني ملال'),
  ('beni-mellal-khenifra', 'Khouribga',              'خريبكة'),
  ('beni-mellal-khenifra', 'Khénifra',               'خنيفرة'),
  ('beni-mellal-khenifra', 'Azilal',                 'أزيلال'),
  ('beni-mellal-khenifra', 'Fquih Ben Salah',        'الفقيه بن صالح'),
  ('beni-mellal-khenifra', 'Kasba Tadla',            'قصبة تادلة'),
  ('beni-mellal-khenifra', 'El Ksiba',               'القصيبة'),
  ('beni-mellal-khenifra', 'Zaouiat Cheikh',         'زاوية الشيخ'),
  ('beni-mellal-khenifra', 'Souk Sebt Ouled Nemma',  'سوق السبت أولاد النمة'),
  ('beni-mellal-khenifra', 'Oulad Ayad',             'أولاد عياد'),
  ('beni-mellal-khenifra', 'Oulad M''Barek',         'أولاد مبارك'),
  ('beni-mellal-khenifra', 'Demnate',                'دمنات'),
  ('beni-mellal-khenifra', 'Afourer',                'أفورار'),
  ('beni-mellal-khenifra', 'Bzou',                   'بزو'),
  ('beni-mellal-khenifra', 'Ouaouizeght',            'واويزغت'),
  ('beni-mellal-khenifra', 'M''rirt',                'مريرت'),
  ('beni-mellal-khenifra', 'Aguelmous',              'أݣلموس'),
  ('beni-mellal-khenifra', 'El Kbab',                'الكباب'),
  ('beni-mellal-khenifra', 'Moulay Bouazza',         'مولاي بوعزة'),
  ('beni-mellal-khenifra', 'Aït Ishaq',              'آيت إسحاق'),
  ('beni-mellal-khenifra', 'Tighassaline',           'تيغسالين'),
  ('beni-mellal-khenifra', 'Oued Zem',               'وادي زم'),
  ('beni-mellal-khenifra', 'Boujaad',                'أبي الجعد'),
  ('beni-mellal-khenifra', 'Hattane',                'حطان'),

  -- ===== Casablanca-Settat ==================================================
  ('casablanca-settat', 'Casablanca',        'الدار البيضاء'),
  ('casablanca-settat', 'Mohammédia',        'المحمدية'),
  ('casablanca-settat', 'El Jadida',         'الجديدة'),
  ('casablanca-settat', 'Settat',            'سطات'),
  ('casablanca-settat', 'Berrechid',         'برشيد'),
  ('casablanca-settat', 'Benslimane',        'بنسليمان'),
  ('casablanca-settat', 'Sidi Bennour',      'سيدي بنور'),
  ('casablanca-settat', 'Nouaceur',          'النواصر'),
  ('casablanca-settat', 'Médiouna',          'مديونة'),
  ('casablanca-settat', 'Aïn Harrouda',      'عين حرودة'),
  ('casablanca-settat', 'Bouskoura',         'بوسكورة'),
  ('casablanca-settat', 'Dar Bouazza',       'دار بوعزة'),
  ('casablanca-settat', 'Tit Mellil',        'تيط مليل'),
  ('casablanca-settat', 'Lahraouyine',       'لهراويين'),
  ('casablanca-settat', 'Bouznika',          'بوزنيقة'),
  ('casablanca-settat', 'Deroua',            'الدروة'),
  ('casablanca-settat', 'Had Soualem',       'حد السوالم'),
  ('casablanca-settat', 'Sidi Rahal Chatai', 'سيدي رحال الشاطئ'),
  ('casablanca-settat', 'Azemmour',          'أزمور'),
  ('casablanca-settat', 'Bir Jdid',          'بئر الجديد'),
  ('casablanca-settat', 'Moulay Abdallah',   'مولاي عبد الله'),
  ('casablanca-settat', 'Oualidia',          'الوالدية'),
  ('casablanca-settat', 'Zemamra',           'الزمامرة'),
  ('casablanca-settat', 'Sidi Smaïl',        'سيدي إسماعيل'),
  ('casablanca-settat', 'Ben Ahmed',         'بن أحمد'),
  ('casablanca-settat', 'Guisser',           'ݣيسر'),
  ('casablanca-settat', 'El Borouj',         'البروج'),
  ('casablanca-settat', 'El Gara',           'الݣارة'),
  ('casablanca-settat', 'Oulad Abbou',       'أولاد عبو'),
  ('casablanca-settat', 'Oulad Saïd',        'أولاد سعيد'),
  ('casablanca-settat', 'Loulad',            'اللولاد'),
  ('casablanca-settat', 'Ras El Aïn',        'رأس العين'),
  ('casablanca-settat', 'Sidi Hajjaj',       'سيدي حجاج'),

  -- ===== Marrakech-Safi =====================================================
  ('marrakech-safi', 'Marrakech',              'مراكش'),
  ('marrakech-safi', 'Safi',                   'آسفي'),
  ('marrakech-safi', 'Essaouira',              'الصويرة'),
  ('marrakech-safi', 'El Kelâa des Sraghna',   'قلعة السراغنة'),
  ('marrakech-safi', 'Youssoufia',             'اليوسفية'),
  ('marrakech-safi', 'Chichaoua',              'شيشاوة'),
  ('marrakech-safi', 'Ben Guerir',             'بنجرير'),
  ('marrakech-safi', 'Tahannaout',             'تحناوت'),
  ('marrakech-safi', 'Aït Ourir',              'آيت أورير'),
  ('marrakech-safi', 'Amizmiz',                'أمزميز'),
  ('marrakech-safi', 'Moulay Brahim',          'مولاي إبراهيم'),
  ('marrakech-safi', 'Asni',                   'أسني'),
  ('marrakech-safi', 'Imintanoute',            'إمينتانوت'),
  ('marrakech-safi', 'Tamallalt',              'تاملالت'),
  ('marrakech-safi', 'El Attaouia',            'العطاوية'),
  ('marrakech-safi', 'Sidi Rahal',             'سيدي رحال'),
  ('marrakech-safi', 'Sidi Bou Othmane',       'سيدي بوعثمان'),
  ('marrakech-safi', 'Skhour Rehamna',         'صخور الرحامنة'),
  ('marrakech-safi', 'Sebt Gzoula',            'سبت اݣزولة'),
  ('marrakech-safi', 'Jemaa Shaim',            'جمعة سحيم'),
  ('marrakech-safi', 'Chemaïa',                'الشماعية'),
  ('marrakech-safi', 'Tamanar',                'تمنار'),
  ('marrakech-safi', 'Smimou',                 'سميمو'),
  ('marrakech-safi', 'Talmest',                'تالمست'),
  ('marrakech-safi', 'Ighoud',                 'إيغود'),
  ('marrakech-safi', 'Loudaya',                'الودايا'),

  -- ===== Drâa-Tafilalet =====================================================
  ('draa-tafilalet', 'Errachidia',        'الرشيدية'),
  ('draa-tafilalet', 'Ouarzazate',        'ورزازات'),
  ('draa-tafilalet', 'Zagora',            'زاݣورة'),
  ('draa-tafilalet', 'Tinghir',           'تنغير'),
  ('draa-tafilalet', 'Midelt',            'ميدلت'),
  ('draa-tafilalet', 'Erfoud',            'أرفود'),
  ('draa-tafilalet', 'Rissani',           'الريصاني'),
  ('draa-tafilalet', 'Goulmima',          'كلميمة'),
  ('draa-tafilalet', 'Tinejdad',          'تنجداد'),
  ('draa-tafilalet', 'Jorf',              'الجرف'),
  ('draa-tafilalet', 'Boudnib',           'بوذنيب'),
  ('draa-tafilalet', 'Er-Rich',           'الريش'),
  ('draa-tafilalet', 'Zaïda',             'زايدة'),
  ('draa-tafilalet', 'Itzer',             'إيتزر'),
  ('draa-tafilalet', 'Boumia',            'بومية'),
  ('draa-tafilalet', 'Taznakht',          'تازناخت'),
  ('draa-tafilalet', 'Skoura',            'سكورة'),
  ('draa-tafilalet', 'Agdz',              'أݣدز'),
  ('draa-tafilalet', 'Kelaat M''Gouna',   'قلعة مݣونة'),
  ('draa-tafilalet', 'Boumalne Dadès',    'بومالن دادس'),
  ('draa-tafilalet', 'Tagounite',         'تاݣونيت'),
  ('draa-tafilalet', 'Mhamid El Ghizlane','امحاميد الغزلان'),
  ('draa-tafilalet', 'Alnif',             'ألنيف'),
  ('draa-tafilalet', 'Tazarine',          'تازارين'),
  ('draa-tafilalet', 'Aoufous',           'أوفوس'),
  ('draa-tafilalet', 'Amerzgane',         'أمرزݣان'),

  -- ===== Souss-Massa ========================================================
  ('souss-massa', 'Agadir',                'أݣادير'),
  ('souss-massa', 'Inezgane',              'إنزݣان'),
  ('souss-massa', 'Taroudant',             'تارودانت'),
  ('souss-massa', 'Tiznit',                'تيزنيت'),
  ('souss-massa', 'Tata',                  'طاطا'),
  ('souss-massa', 'Biougra',               'بيوݣرى'),
  ('souss-massa', 'Aït Melloul',           'آيت ملول'),
  ('souss-massa', 'Dcheira El Jihadia',    'الدشيرة الجهادية'),
  ('souss-massa', 'Lqliaa',                'القليعة'),
  ('souss-massa', 'Temsia',                'تمسية'),
  ('souss-massa', 'Drarga',                'الدراركة'),
  ('souss-massa', 'Aourir',                'أورير'),
  ('souss-massa', 'Aït Baha',              'آيت باها'),
  ('souss-massa', 'Belfaa',                'بلفاع'),
  ('souss-massa', 'Sidi Bibi',             'سيدي بيبي'),
  ('souss-massa', 'Massa',                 'ماسة'),
  ('souss-massa', 'Oulad Teima',           'أولاد تايمة'),
  ('souss-massa', 'Aït Iaaza',             'آيت يعزة'),
  ('souss-massa', 'Ouled Berhil',          'أولاد برحيل'),
  ('souss-massa', 'Taliouine',             'تالوين'),
  ('souss-massa', 'Aoulouz',               'أولوز'),
  ('souss-massa', 'Igherm',                'إغرم'),
  ('souss-massa', 'Tafraout',              'تافراوت'),
  ('souss-massa', 'Foum Zguid',            'فم زݣيد'),
  ('souss-massa', 'Akka',                  'أقا'),
  ('souss-massa', 'Fam El Hisn',           'فم الحصن'),
  ('souss-massa', 'Tissint',               'تيسينت'),
  ('souss-massa', 'Arazane',               'أرازان'),

  -- ===== Guelmim-Oued Noun ==================================================
  ('guelmim-oued-noun', 'Guelmim',      'كلميم'),
  ('guelmim-oued-noun', 'Tan-Tan',      'طانطان'),
  ('guelmim-oued-noun', 'Sidi Ifni',    'سيدي إفني'),
  ('guelmim-oued-noun', 'Assa',         'أسا'),
  ('guelmim-oued-noun', 'Zag',          'الزاݣ'),
  ('guelmim-oued-noun', 'Bouizakarne',  'بويزكارن'),
  ('guelmim-oued-noun', 'El Ouatia',    'الوطية'),
  ('guelmim-oued-noun', 'Mirleft',      'ميرلفت'),
  ('guelmim-oued-noun', 'Lakhsas',      'لخصاص'),
  ('guelmim-oued-noun', 'Taghjijt',     'تاغجيجت'),
  ('guelmim-oued-noun', 'Abaynou',      'أباينو'),

  -- ===== Laâyoune-Sakia El Hamra ============================================
  ('laayoune-sakia-el-hamra', 'Laâyoune',     'العيون'),
  ('laayoune-sakia-el-hamra', 'Es-Semara',    'السمارة'),
  ('laayoune-sakia-el-hamra', 'Boujdour',     'بوجدور'),
  ('laayoune-sakia-el-hamra', 'Tarfaya',      'طرفاية'),
  ('laayoune-sakia-el-hamra', 'El Marsa',     'المرسى'),
  ('laayoune-sakia-el-hamra', 'Foum El Oued', 'فم الواد'),
  ('laayoune-sakia-el-hamra', 'Akhfennir',    'أخفنير'),
  ('laayoune-sakia-el-hamra', 'Daoura',       'الدورة'),
  ('laayoune-sakia-el-hamra', 'Jdiriya',      'الجديرية'),

  -- ===== Dakhla-Oued Ed-Dahab ===============================================
  ('dakhla-oued-ed-dahab', 'Dakhla',           'الداخلة'),
  ('dakhla-oued-ed-dahab', 'Aousserd',         'أوسرد'),
  ('dakhla-oued-ed-dahab', 'El Argoub',        'العركوب'),
  ('dakhla-oued-ed-dahab', 'Bir Anzarane',     'بئر أنزران'),
  ('dakhla-oued-ed-dahab', 'Bir Gandouz',      'بئر كندوز'),
  ('dakhla-oued-ed-dahab', 'Tichla',           'تيشلة'),
  ('dakhla-oued-ed-dahab', 'Gleibat El Foula', 'ݣليبات الفولة'),
  ('dakhla-oued-ed-dahab', 'Imlili',           'إمليلي')
) as v(region_code, name_fr, name_ar)
 where c.region_code = v.region_code and c.name_fr = v.name_fr;

-- --- Contrôle ---------------------------------------------------------------
do $$
declare
  missing integer;
begin
  select count(*) into missing from public.cities where name_ar is null;
  if missing > 0 then
    raise warning 'Villes sans nom arabe : % (l''application affichera le nom français)', missing;
  end if;
  raise notice 'Toponymie arabe : % villes renseignées',
    (select count(*) from public.cities where name_ar is not null);
end;
$$;

-- =============================================================================
-- Les vues publiques exposent désormais les deux graphies. L'application
-- choisit selon la langue et retombe sur le français si l'arabe manque.
-- =============================================================================

drop view if exists public.land_listings_public;

create view public.land_listings_public
with (security_invoker = on) as
  select
    l.id,
    l.reference,
    l.title,
    l.description,
    l.region_code,
    r.name_fr                          as region_name,
    coalesce(r.name_ar, r.name_fr)     as region_name_ar,
    l.city_id,
    coalesce(c.name_fr, l.city_other)  as city_name,
    coalesce(c.name_ar, c.name_fr, l.city_other) as city_name_ar,
    l.district,
    l.latitude,
    l.longitude,
    l.zoning,
    l.surface_m2,
    l.facade_m,
    l.depth_m,
    l.facade_count,
    l.road_width_m,
    l.legal_status,
    l.observations,
    l.price_per_m2,
    l.total_price,
    l.price_negotiable,
    l.has_water,
    l.has_electricity,
    l.has_sewage,
    l.has_telecom,
    l.has_gas,
    l.network_other,
    public.estimate_units(l.surface_m2, l.zoning, l.declared_units) as estimated_units,
    l.status,
    l.published_at,
    l.created_at,
    l.view_count,
    (
      select li.storage_path from public.land_images li
      where li.land_id = l.id
      order by li.sort_order, li.created_at
      limit 1
    ) as cover_image_path,
    (select count(*) from public.land_images li where li.land_id = l.id) as image_count
  from public.land_listings l
  join public.regions r on r.code = l.region_code
  left join public.cities c on c.id = l.city_id;

grant select on public.land_listings_public to anon, authenticated;

drop view if exists public.projects_public;

create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    p.summary,
    p.description,
    p.region_code,
    r.name_fr                       as region_name,
    coalesce(r.name_ar, r.name_fr)  as region_name_ar,
    p.city_id,
    c.name_fr                       as city_name,
    coalesce(c.name_ar, c.name_fr)  as city_name_ar,
    p.district,
    p.property_need,
    p.zoning,
    p.units_planned,
    p.participants_target,
    p.budget_per_unit,
    p.restricted_to_body,
    p.status,
    p.land_id,
    p.cover_image_path,
    p.opened_at,
    p.created_at,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'accepte'
    ) as participants_confirmed,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'candidature'
    ) as participants_pending
  from public.projects p
  join public.regions r on r.code = p.region_code
  left join public.cities c on c.id = p.city_id;

grant select on public.projects_public to anon, authenticated;
