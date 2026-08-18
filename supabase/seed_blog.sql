-- =============================================================================
-- Ntcharkou — Articles du blog
-- =============================================================================
-- Six articles de fond sur l'immobilier au Maroc, publies d'emblee, rediges
-- integralement dans les DEUX langues : titre, chapo, corps et questions
-- frequentes ont chacun leur version arabe. Sans corps arabe, la version arabe
-- du site affichait le francais en repli — lisible, mais pas traduit.
--
-- Le corps est en Markdown restreint, rendu par l'application avec
-- echappement — voir `src/lib/markdown.ts`.
--
-- Referencement : chaque article porte un `seo_title` et une `seo_description`
-- distincts du titre et du chapo. Le titre parle au lecteur deja arrive ; le
-- titre d'un resultat de recherche parle a quelqu'un qui hesite entre dix liens.
-- Les questions frequentes, elles, n'ont pas de colonne : elles sont deduites
-- des sous-titres se terminant par « ? » ou « ؟ », donc toujours presentes sur
-- la page qu'elles decrivent.
--
-- Contenu informatif : chaque article se termine par une mention rappelant
-- qu'il ne remplace pas un conseil professionnel.
--
-- PREREQUIS : migrations 17 (blog) et 18 (referencement) appliquees.
--
-- Rejouable, et surtout CORRECTIF : `on conflict (slug) do update` met a jour un
-- article deja charge. Un `do nothing` laisserait les six premiers articles sans
-- leur corps arabe, sans qu'aucun message ne le signale.
-- =============================================================================

insert into public.blog_posts
  (slug, title, title_ar, excerpt, excerpt_ar, body, body_ar,
   seo_title, seo_title_ar, seo_description, seo_description_ar,
   category, status)
values
  ('titre-foncier-melkia-requisition', 'Titre foncier, melkia, réquisition : lire le statut juridique d''un terrain', 'الرسم العقاري، الملكية، مطلب التحفيظ: قراءة الوضعية القانونية للأرض', 'Un terrain titré est immatriculé à la Conservation foncière et sa propriété est définitive ; une melkia atteste une possession sans la même sécurité ; une réquisition est une immatriculation encore en cours. Cette différence décide de la sécurité de l''achat, de l''accès au crédit et du délai avant de bâtir.', 'الأرض المحفَّظة مسجَّلة لدى المحافظة العقارية وملكيتها نهائية؛ والملكية تُثبت الحيازة دون الأمان نفسه؛ ومطلب التحفيظ مسطرة لم تكتمل بعد. هذا الفرق هو ما يحدد أمان الشراء، وإمكانية الحصول على قرض، ومدة الانتظار قبل البناء.', 'Au Maroc, deux terrains voisins peuvent relever de régimes juridiques différents. **Un terrain titré est immatriculé et sa propriété est définitive ; une melkia prouve une possession ; une réquisition est une immatriculation en cours.** Cette différence n''est pas administrative : elle change ce que vous achetez, ce qu''une banque acceptera de financer, et le délai avant de pouvoir bâtir.

## Le titre foncier : la situation la plus sûre

Un terrain immatriculé possède un **titre foncier**, numéro unique inscrit à la Conservation foncière. Ce titre est *définitif et inattaquable* : une fois l''immatriculation prononcée, personne ne peut plus revendiquer le terrain sur la base d''un droit antérieur.

Concrètement, cela vous permet de :

- vérifier vous-même la situation du bien en demandant un certificat de propriété ;
- connaître les hypothèques, servitudes et oppositions éventuelles, toutes inscrites sur le titre ;
- obtenir un crédit bancaire, les banques exigeant presque toujours ce régime.

C''est la situation à rechercher. Si le vendeur annonce un titre foncier, demandez-en le numéro et faites établir un certificat de propriété récent — de moins de trois mois.

## La melkia : un acte traditionnel

La **melkia** est un acte adoulaire attestant une possession, souvent ancienne, parfois transmise sur plusieurs générations. Elle a une valeur juridique réelle, mais elle ne procure pas la même sécurité qu''un titre : elle prouve une possession, pas une propriété opposable à tous.

Les difficultés classiques :

- l''indivision entre héritiers, parfois nombreux et dispersés ;
- les limites de la parcelle, décrites en termes de voisinage plutôt que par des coordonnées ;
- le refus quasi systématique des banques de financer l''acquisition.

Un terrain en melkia n''est pas à écarter, mais son acquisition demande une vérification approfondie et, le plus souvent, une procédure d''immatriculation préalable.

## La réquisition : une immatriculation en cours

Une **réquisition d''immatriculation** signifie que la procédure est engagée mais pas achevée. Le terrain est en transition : il deviendra titré si aucune opposition n''aboutit.

Deux questions à poser avant tout engagement :

1. À quelle date la réquisition a-t-elle été déposée ?
2. Des oppositions ont-elles été formées, et où en sont-elles ?

Une réquisition ancienne sans opposition est plutôt rassurante. Une réquisition récente, ou grevée d''oppositions, appelle la prudence.

## Ce qu''il faut retenir

> Le prix au mètre carré ne se compare qu''entre terrains de statut comparable. Un terrain en melkia affiché 30 % moins cher qu''un terrain titré voisin n''est pas une bonne affaire : c''est le prix du risque et du délai.

Avant tout versement, même d''une avance, faites vérifier le statut par un notaire. Cette vérification coûte peu au regard de ce qu''elle protège.

## Questions fréquentes

### Une banque finance-t-elle l''achat d''un terrain en melkia ?

Très rarement. La quasi-totalité des établissements exigent un titre foncier, parce qu''une melkia ne permet pas d''inscrire une hypothèque de premier rang de manière incontestable. Si le financement est nécessaire, l''immatriculation préalable du terrain devient une condition, pas une option.

### Combien de temps dure une procédure d''immatriculation ?

De quelques mois à plusieurs années. Le facteur déterminant n''est pas l''administration mais les oppositions : une réquisition sans opposition avance à un rythme prévisible, une réquisition contestée attend une décision de justice.

### Comment vérifier qu''un titre foncier correspond bien au terrain visité ?

Le certificat de propriété porte la contenance, la situation et le plan du bien. Comparez-les au terrain sur place, et faites confirmer la correspondance par un géomètre si le plan est ancien ou si les limites ne sont pas matérialisées.

### Que se passe-t-il si une opposition est formée sur une réquisition ?

La procédure est suspendue le temps que la juridiction tranche. Le terrain reste vendable, mais l''acquéreur reprend le litige à son compte. Acheter dans cette situation revient à acheter un procès en même temps qu''un terrain.

### Un certificat de propriété de six mois est-il encore valable ?

Il reste lisible, mais il ne prouve plus rien : une hypothèque ou une opposition a pu être inscrite entre-temps. Exigez un certificat de moins de trois mois, et faites-le renouveler juste avant la signature définitive.

---

*Cet article est informatif et ne remplace pas un conseil juridique. Les règles et les délais évoluent : faites confirmer votre situation par un professionnel.*', 'في المغرب، قد تخضع أرضان متجاورتان لنظامين قانونيين مختلفين. **الأرض المحفَّظة مسجَّلة وملكيتها نهائية؛ والملكية تُثبت الحيازة؛ ومطلب التحفيظ مسطرة لم تنته بعد.** وهذا الفرق ليس إجرائياً فحسب: فهو يغيّر ما تشتريه فعلاً، وما يقبل البنك تمويله، والمدة التي تفصلك عن البناء.

## الرسم العقاري: الوضع الأكثر أماناً

الأرض المحفَّظة لها **رسم عقاري**، وهو رقم فريد مسجَّل لدى المحافظة العقارية. وهذا الرسم *نهائي ولا يقبل الطعن*: فبمجرد صدور قرار التحفيظ، لا يمكن لأحد أن يدّعي ملكية الأرض استناداً إلى حق سابق.

وهذا يتيح لك عملياً:

- التحقق بنفسك من وضعية العقار بطلب شهادة الملكية؛
- الاطلاع على الرهون والارتفاقات والتعرضات، فكلها مقيَّدة في الرسم؛
- الحصول على قرض بنكي، إذ تشترط الأبناك هذا النظام في الغالب الأعم.

هذه هي الوضعية التي ينبغي البحث عنها. وإذا أعلن البائع أن الأرض محفَّظة، فاطلب رقم الرسم واستخرج شهادة ملكية حديثة — لا يتجاوز عمرها ثلاثة أشهر.

## الملكية: عقد عدلي تقليدي

**الملكية** عقد عدلي يُثبت الحيازة، وغالباً ما تكون قديمة ومتوارثة عبر أجيال. ولها قيمة قانونية فعلية، لكنها لا توفر الأمان نفسه الذي يوفره الرسم العقاري: فهي تُثبت حيازة، لا ملكية نافذة في مواجهة الجميع.

والصعوبات المعتادة هي:

- الشياع بين الورثة، وقد يكونون كثيرين ومتفرقين؛
- حدود القطعة الموصوفة بالجوار لا بالإحداثيات؛
- رفض الأبناك تمويل الاقتناء في أغلب الحالات.

الأرض في وضعية ملكية ليست مرفوضة بالضرورة، لكن اقتناءها يستلزم تحققاً معمَّقاً، ومسطرة تحفيظ مسبقة في أغلب الأحيان.

## مطلب التحفيظ: مسطرة جارية

**مطلب التحفيظ** يعني أن المسطرة انطلقت ولم تكتمل. فالأرض في وضع انتقالي: ستصبح محفَّظة إذا لم يُقبل أي تعرض.

سؤالان ينبغي طرحهما قبل أي التزام:

1. متى أُودع مطلب التحفيظ؟
2. هل قُدِّمت تعرضات، وما مآلها؟

مطلب قديم دون تعرضات مؤشر مطمئن نسبياً. أما مطلب حديث، أو مثقل بتعرضات، فيستدعي الحذر.

## ما ينبغي تذكره

> لا يُقارن ثمن المتر المربع إلا بين أراضٍ متماثلة الوضعية. فأرض في وضعية ملكية معروضة بأقل بـ 30 % من أرض محفَّظة مجاورة ليست صفقة رابحة: ذلك هو ثمن المخاطرة والانتظار.

قبل أي أداء، ولو كان تسبيقاً، اطلب من موثق التحقق من الوضعية. فكلفة هذا التحقق زهيدة قياساً بما يحميه.

## أسئلة شائعة

### هل يموّل البنك شراء أرض في وضعية ملكية؟

نادراً جداً. فأغلب المؤسسات تشترط رسماً عقارياً، لأن الملكية لا تتيح تقييد رهن من الدرجة الأولى بصفة لا تقبل المنازعة. وإذا كان التمويل ضرورياً، صار تحفيظ الأرض شرطاً لا خياراً.

### كم تستغرق مسطرة التحفيظ؟

من بضعة أشهر إلى عدة سنوات. والعامل الحاسم ليس الإدارة بل التعرضات: فمطلب بلا تعرض يسير بوتيرة متوقعة، ومطلب متنازع فيه ينتظر حكماً قضائياً.

### كيف أتحقق من أن الرسم العقاري يخص فعلاً الأرض التي عاينتها؟

تحمل شهادة الملكية المساحة والموقع وتصميم العقار. قارنها بالأرض على عين المكان، واطلب من مهندس مساح تأكيد المطابقة إذا كان التصميم قديماً أو كانت الحدود غير مادية.

### ماذا يحدث إذا قُدِّم تعرض على مطلب التحفيظ؟

تتوقف المسطرة إلى حين بتّ القضاء. وتبقى الأرض قابلة للبيع، لكن المشتري يتحمل النزاع. والشراء في هذه الحال شراء لدعوى قضائية مع الأرض.

### هل تبقى شهادة ملكية عمرها ستة أشهر صالحة؟

تبقى مقروءة، لكنها لم تعد تُثبت شيئاً: فقد يكون رهن أو تعرض قد قُيِّد في هذه المدة. اشترط شهادة لا يتجاوز عمرها ثلاثة أشهر، وجدِّدها قبيل التوقيع النهائي.

---

*هذا المقال إخباري ولا يغني عن استشارة قانونية. القواعد والآجال تتغير: اطلب من مهني تأكيد وضعيتك.*', 'Titre foncier, melkia ou réquisition : quelle différence ?', 'الرسم العقاري أم الملكية أم مطلب التحفيظ: ما الفرق؟', 'Titre foncier, melkia, réquisition d''immatriculation : ce que chaque régime change pour la sécurité de l''achat, le crédit bancaire et le délai de construction au Maroc.', 'الرسم العقاري والملكية ومطلب التحفيظ: ما يغيّره كل نظام في أمان الشراء والقرض البنكي ومدة البناء بالمغرب.', 'reglementation'::public.blog_category, 'publie'),
  ('comprendre-le-zonage-urbain', 'R+2, R+4, villa, lotissement : ce que le zonage vous autorise à construire', 'ر+2، ر+4، فيلا، تجزئة: ما يسمح لك به التخصيص العمراني بالبناء', 'Le zonage fixe la hauteur, la densité et la destination admises sur une parcelle. Un même terrain de 1 000 m² peut porter deux logements ou vingt selon sa zone : c''est la première chose à vérifier, avant même le prix.', 'يحدد التخصيص العمراني العلو والكثافة والاستعمال المسموح به في القطعة. وقد تحمل أرض واحدة مساحتها 1000 م² سكنين أو عشرين حسب منطقتها: فهو أول ما ينبغي التحقق منه، قبل الثمن.', 'Deux terrains de surface identique, dans la même ville, peuvent avoir des capacités constructibles très différentes. Ce qui les sépare tient en un mot : le zonage. **Il fixe la hauteur autorisée, la part du terrain que le bâtiment peut couvrir, les reculs obligatoires et la destination admise.**

## Ce que dit le plan d''aménagement

Chaque commune urbaine dispose d''un plan d''aménagement qui découpe le territoire en zones. Pour chacune, il fixe :

- la **hauteur maximale**, souvent exprimée en nombre d''étages ;
- le **coefficient d''occupation du sol** — la part de la parcelle que l''emprise du bâtiment peut couvrir ;
- les **reculs** obligatoires par rapport à la voie et aux limites voisines ;
- la **destination** admise : habitat, commerce, industrie, activité mixte.

Ces règles ne se négocient pas. Elles conditionnent le nombre de logements que votre terrain peut réellement porter.

## Les zonages que vous rencontrerez

**R+2, R+3, R+4** désignent un rez-de-chaussée surmonté de deux, trois ou quatre étages. Plus l''indice est élevé, plus la capacité est importante — et plus le prix au mètre carré du terrain l''est aussi.

**Villa** correspond à l''habitat individuel : une construction par lot, avec des reculs importants et une emprise au sol limitée. La densité est faible, le cadre plus résidentiel.

**Lotissement** désigne un terrain destiné à être divisé en lots viabilisés, puis vendus séparément. C''est une opération d''aménagement, soumise à autorisation et à la réalisation préalable des voiries et des réseaux.

**Immeuble** vise le collectif, avec des règles de stationnement et d''espaces communs propres.

## Estimer une capacité, honnêtement

Une estimation rapide part de la surface, du nombre de niveaux autorisés et d''une surface moyenne par logement. Elle donne un ordre de grandeur, pas un chiffre.

Ce que cette estimation ignore, et qui la réduit toujours :

- les circulations, cages d''escalier et locaux techniques ;
- les reculs et l''emprise au sol maximale ;
- les places de stationnement exigées ;
- la forme de la parcelle, qui peut rendre une partie inconstructible.

Comptez sur un architecte pour passer de l''ordre de grandeur au projet réel. L''écart entre les deux est rarement négligeable.

## Vérifier avant d''acheter

La **note de renseignements urbanistiques**, délivrée par l''agence urbaine, indique le zonage applicable à une parcelle précise. C''est le document qui fait foi — pas la parole du vendeur, ni ce qui a été construit sur le terrain d''en face il y a dix ans.

> Un zonage annoncé mais non vérifié est la source la plus fréquente de déception à l''achat d''un terrain.

## Questions fréquentes

### Que signifie exactement R+4 ?

Un rez-de-chaussée surmonté de quatre étages, soit cinq niveaux au total. L''indice décrit le nombre de niveaux, pas la surface constructible : celle-ci dépend aussi du coefficient d''occupation du sol et des reculs imposés dans la zone.

### Le zonage d''un terrain peut-il changer ?

Oui, lors de la révision du plan d''aménagement de la commune. C''est un processus long et public. Il ne faut jamais acheter en pariant sur une révision favorable : rien ne garantit qu''elle intervienne, ni dans quel sens.

### Peut-on construire un immeuble sur un terrain classé villa ?

Non. La destination et la densité de la zone s''imposent, et une autorisation de construire non conforme est refusée. Bâtir malgré tout expose à une démolition et à des sanctions.

### Comment connaître le zonage d''une parcelle précise ?

En demandant la note de renseignements urbanistiques auprès de l''agence urbaine dont dépend la commune. C''est le seul document qui engage l''administration sur le zonage applicable à une parcelle identifiée.

### Un terrain agricole peut-il devenir constructible ?

Seulement si le plan d''aménagement le prévoit, ou par une procédure de dérogation qui reste exceptionnelle et incertaine. Un terrain agricole se paie au prix agricole : toute autre valorisation est une spéculation.

---

*Cet article est informatif. Les règles d''urbanisme varient d''une commune à l''autre et évoluent : consultez l''agence urbaine compétente.*', 'قد تختلف الطاقة الاستيعابية لأرضين متساويتي المساحة في المدينة نفسها اختلافاً كبيراً. وما يفصل بينهما كلمة واحدة: التخصيص العمراني. **فهو يحدد العلو المسموح به، ونسبة الأرض التي يمكن أن يغطيها البناء، والتراجعات الإجبارية، والاستعمال المقبول.**

## ماذا يقول تصميم التهيئة

لكل جماعة حضرية تصميم تهيئة يقسّم المجال إلى مناطق، ويحدد لكل منها:

- **العلو الأقصى**، ويُعبَّر عنه غالباً بعدد الطوابق؛
- **معامل استغلال الأرض** — أي نسبة القطعة التي يمكن أن يشغلها البناء؛
- **التراجعات** الإجبارية عن الطريق وعن حدود الجوار؛
- **الاستعمال** المسموح به: سكن، تجارة، صناعة، نشاط مختلط.

وهذه القواعد غير قابلة للتفاوض. وهي التي تحدد عدد الوحدات السكنية التي يمكن لأرضك أن تحملها فعلاً.

## التخصيصات التي ستصادفها

**ر+2، ر+3، ر+4** تعني طابقاً أرضياً تعلوه طابقان أو ثلاثة أو أربعة. وكلما ارتفع الرقم ارتفعت الطاقة الاستيعابية — وارتفع معها ثمن المتر المربع للأرض.

**الفيلا** تقابل السكن الفردي: بناء واحد في كل بقعة، بتراجعات واسعة ومساحة أرضية محدودة. فالكثافة ضعيفة والإطار أكثر سكنية.

**التجزئة** تعني أرضاً مخصصة للتقسيم إلى بقع مجهَّزة تُباع منفصلة. وهي عملية تهيئة تخضع للترخيص ولإنجاز الطرق والشبكات مسبقاً.

**العمارة** تخص السكن الجماعي، بقواعد خاصة للوقوف والأجزاء المشتركة.

## تقدير الطاقة الاستيعابية بصدق

التقدير السريع ينطلق من المساحة وعدد الطوابق المسموح بها ومتوسط مساحة الوحدة. وهو يعطي ترتيب حجم، لا رقماً.

وما يغفله هذا التقدير، وهو ما يُنقصه دائماً:

- الممرات وبيوت الدرج والمحلات التقنية؛
- التراجعات والمساحة الأرضية القصوى؛
- أماكن الوقوف المفروضة؛
- شكل القطعة، الذي قد يجعل جزءاً منها غير قابل للبناء.

اعتمد على مهندس معماري للانتقال من ترتيب الحجم إلى المشروع الفعلي. فالفارق بينهما نادراً ما يكون هيناً.

## التحقق قبل الشراء

**شهادة المعلومات التعميرية**، التي تسلّمها الوكالة الحضرية، تبيّن التخصيص المطبَّق على قطعة محددة. وهي الوثيقة الحجة — لا كلام البائع، ولا ما بُني في الأرض المقابلة قبل عشر سنوات.

> التخصيص المعلن غير المتحقق منه هو أكثر أسباب خيبة الأمل شيوعاً عند شراء أرض.

## أسئلة شائعة

### ماذا تعني ر+4 بالضبط؟

طابق أرضي تعلوه أربعة طوابق، أي خمسة مستويات إجمالاً. والرقم يصف عدد المستويات لا المساحة القابلة للبناء: فهذه تتوقف أيضاً على معامل استغلال الأرض والتراجعات المفروضة في المنطقة.

### هل يمكن أن يتغير تخصيص أرض؟

نعم، عند مراجعة تصميم التهيئة الخاص بالجماعة. وهي مسطرة طويلة وعلنية. ولا ينبغي أبداً الشراء رهاناً على مراجعة مواتية: فلا شيء يضمن وقوعها ولا اتجاهها.

### هل يمكن بناء عمارة في أرض مصنَّفة فيلا؟

لا. فاستعمال المنطقة وكثافتها ملزمان، ورخصة البناء غير المطابقة تُرفض. والبناء رغم ذلك يعرّض للهدم وللعقوبات.

### كيف أعرف تخصيص قطعة بعينها؟

بطلب شهادة المعلومات التعميرية من الوكالة الحضرية التي تتبع لها الجماعة. وهي الوثيقة الوحيدة التي تلزم الإدارة بشأن التخصيص المطبَّق على قطعة محددة.

### هل يمكن أن تصبح أرض فلاحية قابلة للبناء؟

فقط إذا نص على ذلك تصميم التهيئة، أو عبر مسطرة استثناء تبقى نادرة وغير مؤكدة. والأرض الفلاحية تُشترى بثمن فلاحي: وأي تثمين آخر مضاربة.

---

*هذا المقال إخباري. قواعد التعمير تختلف من جماعة إلى أخرى وتتغير: راجع الوكالة الحضرية المختصة.*', 'Zonage urbain au Maroc : R+2, R+4, villa, lotissement', 'التخصيص العمراني بالمغرب: ر+2، ر+4، فيلا، تجزئة', 'Ce que signifient R+2, R+3, R+4, villa, lotissement et immeuble dans un plan d''aménagement marocain, et comment estimer la capacité réelle d''un terrain.', 'ما تعنيه ر+2 وَر+3 وَر+4 والفيلا والتجزئة والعمارة في تصميم التهيئة بالمغرب، وكيف تُقدَّر الطاقة الاستيعابية الفعلية للأرض.', 'reglementation'::public.blog_category, 'publie'),
  ('note-de-renseignements-urbanistiques', 'La note de renseignements urbanistiques : le document à demander en premier', 'شهادة المعلومات التعميرية: الوثيقة التي ينبغي طلبها أولاً', 'Délivrée par l''agence urbaine, elle indique noir sur blanc le zonage, la hauteur admise, les servitudes et les réserves qui pèsent sur une parcelle précise. Aucune visite, aucune promesse ne la remplace — et elle se demande avant de signer, pas après.', 'تسلّمها الوكالة الحضرية، وتبيّن بوضوح التخصيص والعلو المسموح به والارتفاقات والتحملات التي تثقل قطعة محددة. ولا تغني عنها أي زيارة أو وعد — وتُطلب قبل التوقيع لا بعده.', 'Avant de discuter d''un prix, il y a un document à obtenir. **La note de renseignements urbanistiques indique, pour une parcelle identifiée, le zonage applicable, la hauteur et la densité autorisées, les servitudes et les réserves.** Elle est peu coûteuse, s''obtient en quelques jours, et évite l''essentiel des mauvaises surprises.

## Ce qu''elle contient

La note de renseignements urbanistiques est délivrée par l''agence urbaine. Pour une parcelle identifiée, elle précise :

- la zone du plan d''aménagement dont elle relève ;
- la hauteur et la densité autorisées ;
- les servitudes qui la grèvent — passage, alignement, canalisation ;
- les éventuelles réserves : voie projetée, espace vert, équipement public.

C''est ce dernier point qui surprend le plus souvent. Un terrain peut être partiellement frappé d''une réserve pour un élargissement de voirie prévu au plan, sans que rien ne le laisse voir sur place.

## Comment la demander

La démarche se fait auprès de l''agence urbaine de la préfecture ou de la province concernée. Il faut généralement :

1. l''identification précise de la parcelle — numéro de titre foncier ou plan de situation ;
2. une demande écrite ;
3. le règlement des frais.

Le propriétaire peut la demander, mais rien n''empêche un acquéreur sérieux de le faire, avec l''accord du vendeur.

## L''utiliser pour négocier

La note ne sert pas seulement à se rassurer : elle donne des arguments.

- Un zonage moins favorable qu''annoncé justifie une révision du prix.
- Une réserve partielle réduit la surface réellement constructible, donc la valeur.
- Une servitude de passage peut contraindre l''implantation du bâtiment.

> Demandez la note avant de signer un compromis, pas après. Une fois engagé, votre marge de discussion se réduit fortement.

## Les autres pièces à réunir

La note complète, mais ne remplace pas :

- le **certificat de propriété**, pour le statut juridique et les inscriptions ;
- le **plan de bornage**, pour les limites exactes ;
- les **attestations de raccordement** aux réseaux d''eau, d''électricité et d''assainissement.

L''ensemble de ces pièces constitue le dossier minimal d''un achat foncier sérieux. Aucune n''est facultative.

## Questions fréquentes

### Qui peut demander une note de renseignements urbanistiques ?

Le propriétaire, mais aussi toute personne en mesure d''identifier précisément la parcelle. Un acquéreur la demande couramment avec l''accord du vendeur ; un vendeur sérieux la fournit spontanément.

### Combien de temps faut-il pour l''obtenir ?

Quelques jours à quelques semaines selon l''agence urbaine et la complétude du dossier. Ce délai est court comparé à ce qu''il évite : anticipez-le plutôt que de le découvrir la veille d''un compromis.

### La note garantit-elle l''obtention d''une autorisation de construire ?

Non. Elle indique ce que le plan autorise ; l''autorisation dépend en plus du projet lui-même, de sa conformité au règlement et de l''avis des services concernés. C''est une condition nécessaire, pas suffisante.

### Que faire si la note révèle une réserve sur une partie du terrain ?

Faites-en chiffrer l''effet : la surface frappée de réserve n''est pas constructible et, le plus souvent, sa valeur est très inférieure. C''est un motif légitime de révision du prix, ou de renoncement.

### La note remplace-t-elle le certificat de propriété ?

Non, les deux documents ne disent pas la même chose. La note traite de l''urbanisme — ce qui est constructible ; le certificat de propriété traite du droit — qui est propriétaire et quelles charges pèsent sur le bien.

---

*Cet article est informatif. Les modalités varient selon les agences urbaines : renseignez-vous auprès de celle dont dépend votre parcelle.*', 'قبل التفاوض في الثمن، ثمة وثيقة ينبغي الحصول عليها. **تبيّن شهادة المعلومات التعميرية، بالنسبة لقطعة محددة، التخصيص المطبَّق والعلو والكثافة المسموح بهما والارتفاقات والتحملات.** وهي زهيدة الكلفة، تُستخرج في أيام، وتجنّب أغلب المفاجآت السيئة.

## ماذا تتضمن

تسلّم الوكالة الحضرية شهادة المعلومات التعميرية. وهي تحدد، لقطعة معيَّنة:

- المنطقة التي تنتمي إليها في تصميم التهيئة؛
- العلو والكثافة المسموح بهما؛
- الارتفاقات التي تثقلها — المرور، التصفيف، القنوات؛
- التحملات المحتملة: طريق مزمعة، مساحة خضراء، تجهيز عمومي.

وهذه النقطة الأخيرة هي أكثر ما يفاجئ. فقد تكون أرض مثقلة جزئياً بتحمّل من أجل توسيع طريق منصوص عليه في التصميم، دون أن يظهر منه شيء على عين المكان.

## كيف تُطلب

تتم المسطرة لدى الوكالة الحضرية للعمالة أو الإقليم المعني. ويلزم عموماً:

1. تحديد دقيق للقطعة — رقم الرسم العقاري أو تصميم الموقع؛
2. طلب كتابي؛
3. أداء الرسوم.

يمكن للمالك أن يطلبها، ولا شيء يمنع مشترياً جاداً من طلبها بموافقة البائع.

## استعمالها في التفاوض

الشهادة لا تفيد في الاطمئنان فحسب: بل تمنح حججاً.

- تخصيص أقل مواتاة مما أُعلن يبرر مراجعة الثمن.
- تحمّل جزئي يقلّص المساحة القابلة للبناء فعلاً، ومن ثم القيمة.
- ارتفاق مرور قد يقيّد موقع البناء.

> اطلب الشهادة قبل توقيع الوعد بالبيع لا بعده. فبمجرد الالتزام يضيق هامش النقاش كثيراً.

## الوثائق الأخرى الواجب جمعها

الشهادة تُكمل ولا تعوّض:

- **شهادة الملكية**، للوضعية القانونية والتقييدات؛
- **تصميم التحديد**، للحدود الدقيقة؛
- **شهادات الربط** بشبكات الماء والكهرباء والتطهير.

وتشكّل هذه الوثائق مجتمعةً الحد الأدنى لملف اقتناء عقاري جاد. ولا واحدة منها اختيارية.

## أسئلة شائعة

### من يمكنه طلب شهادة المعلومات التعميرية؟

المالك، وكذلك كل من يستطيع تحديد القطعة بدقة. والمشتري يطلبها عادةً بموافقة البائع؛ والبائع الجاد يقدّمها من تلقاء نفسه.

### كم يستغرق الحصول عليها؟

من أيام إلى أسابيع حسب الوكالة الحضرية واكتمال الملف. وهذا الأجل قصير قياساً بما يجنّبه: استبقه بدل اكتشافه عشية توقيع الوعد بالبيع.

### هل تضمن الشهادة الحصول على رخصة البناء؟

لا. فهي تبيّن ما يسمح به التصميم؛ أما الرخصة فتتوقف كذلك على المشروع نفسه ومطابقته للضابطة ورأي المصالح المعنية. فهي شرط لازم لا كافٍ.

### ماذا أفعل إذا كشفت الشهادة عن تحمّل يشمل جزءاً من الأرض؟

اطلب تقدير أثره: فالمساحة المثقلة بتحمّل غير قابلة للبناء، وقيمتها أدنى بكثير في الغالب. وهذا سبب مشروع لمراجعة الثمن أو للعدول عن الشراء.

### هل تعوّض الشهادة شهادة الملكية؟

لا، فالوثيقتان لا تقولان الشيء نفسه. الشهادة التعميرية تتناول التعمير — ما يمكن بناؤه؛ وشهادة الملكية تتناول الحق — من هو المالك وما التحملات المثقلة للعقار.

---

*هذا المقال إخباري. تختلف الإجراءات بين الوكالات الحضرية: استفسر لدى الوكالة التي تتبع لها قطعتك.*', 'Note de renseignements urbanistiques : à quoi elle sert', 'شهادة المعلومات التعميرية: فيمَ تفيد وكيف تُطلب', 'Ce que contient la note de renseignements urbanistiques, comment la demander à l''agence urbaine, et comment s''en servir pour négocier le prix d''un terrain.', 'ما تتضمنه شهادة المعلومات التعميرية، وكيف تُطلب من الوكالة الحضرية، وكيف تُستعمل للتفاوض في ثمن الأرض.', 'conseils'::public.blog_category, 'publie'),
  ('logement-participatif-principe', 'Le logement participatif : mutualiser un terrain pour bâtir à plusieurs', 'السكن التشاركي: تقاسم أرض للبناء جماعياً', 'Plusieurs ménages achètent ensemble un terrain qu''aucun ne pourrait s''offrir seul, y font construire un ensemble de logements, puis se répartissent les unités. L''économie va de 20 à 35 % sur des projets comparables ; la réussite tient à la méthode.', 'تشتري عدة أسر أرضاً معاً يعجز كل منها عن اقتنائها بمفرده، ثم تبني عليها مجموعة سكنية وتتقاسم الوحدات. ويتراوح التوفير بين 20 و35 % في مشاريع مماثلة، والنجاح رهين بالمنهجية.', 'Le foncier bien situé est cher, et il se vend en grandes parcelles. Un ménage seul en est écarté ; un groupe de vingt ne l''est plus. **Le logement participatif consiste à acquérir un terrain à plusieurs, à y faire construire un ensemble de logements, puis à se répartir les unités — chacun devenant propriétaire de la sienne.**

## Le principe

Plusieurs ménages se regroupent pour acquérir un terrain, y faire construire un ensemble de logements, puis se répartir les unités. Chacun devient propriétaire de son logement.

L''économie vient de trois sources :

- **le foncier**, acheté en gros plutôt qu''au détail ;
- **la construction**, dont le coût au mètre carré baisse avec le volume ;
- **la marge du promoteur**, qui n''existe pas puisque le groupe est son propre maître d''ouvrage.

Ces trois effets cumulés expliquent des écarts de 20 à 35 % par rapport au marché sur des projets comparables.

## Ce qui fait réussir un projet

L''expérience des opérations abouties fait ressortir quelques constantes.

**Un terrain vérifié avant tout engagement.** Statut juridique, zonage, réseaux, réserves : le dossier doit être complet avant que quiconque ne verse un dirham.

**Un groupe homogène sur l''essentiel.** Les participants n''ont pas besoin de se ressembler, mais ils doivent s''accorder sur le niveau de finition, le calendrier et le budget. C''est là que naissent la plupart des blocages.

**Un cadre juridique dès le départ.** Coopérative d''habitation ou société civile immobilière : la forme importe moins que le fait d''en avoir une, avec des règles écrites de décision, de sortie et de répartition.

**Un maître d''œuvre professionnel.** Architecte et bureau de contrôle ne sont pas des options. Un groupe de particuliers ne pilote pas un chantier.

## Les points de vigilance

> Le logement participatif n''est pas un achat, c''est un projet. Il demande du temps, de la disponibilité et une tolérance à l''imprévu.

Trois risques reviennent :

1. **Le désistement.** Un participant qui se retire en cours de route laisse une part à reprendre. Le règlement doit prévoir ce cas dès le premier jour.
2. **Le dépassement.** Les coûts de construction évoluent. Une provision est indispensable.
3. **Le délai.** Entre la constitution du groupe et la livraison, il faut compter en années, pas en mois.

## Comment Ntcharkou intervient

La plateforme vérifie les terrains proposés, instruit chaque projet et n''ouvre aux adhésions que ceux dont le dossier est complet. Le prix participatif et le prix du marché sont affichés côte à côte, pour que l''économie annoncée soit vérifiable.

L''ouverture d''un projet reste une décision administrative : un terrain ne devient pas un projet parce qu''il a suscité de l''intérêt, mais parce que son dossier a été instruit.

## Questions fréquentes

### Combien coûte réellement un logement participatif ?

L''écart observé va de 20 à 35 % sous le prix du marché sur des projets comparables, selon la part du foncier dans le budget et le niveau de finition retenu. Sur chaque projet publié, le prix participatif et le prix du marché sont affichés côte à côte pour que l''écart soit vérifiable, et non annoncé.

### Que se passe-t-il si un participant se retire ?

Sa part est proposée aux autres membres, puis à de nouveaux candidats. C''est pourquoi le règlement doit fixer dès la constitution du groupe les conditions de sortie, le délai de préavis et le sort des sommes déjà versées.

### Quel statut juridique choisir pour le groupe ?

La coopérative d''habitation et la société civile immobilière sont les deux formes courantes. Le choix compte moins que le fait d''en adopter une avant tout versement, avec des statuts écrits qui traitent de la décision, de la sortie et de la répartition des lots.

### Combien de temps dure un projet participatif ?

Comptez en années, pas en mois : constitution du groupe, acquisition, autorisations, chantier, livraison. Un projet annoncé comme rapide doit susciter la méfiance plutôt que l''enthousiasme.

### Peut-on emprunter pour financer sa part ?

Oui, mais les conditions dépendent du statut du groupe et de l''avancement du projet. Une coopérative constituée et un terrain titré facilitent nettement le financement ; l''inverse le rend difficile.

---

*Cet article présente un principe général. Chaque projet a ses conditions propres, détaillées sur sa fiche.*', 'العقار في المواقع الجيدة غالٍ، ويُباع في قطع كبيرة. فالأسرة الواحدة مستبعدة منه؛ أما مجموعة من عشرين أسرة فلا. **والسكن التشاركي هو اقتناء أرض جماعياً، وبناء مجموعة سكنية عليها، ثم تقاسم الوحدات — فيصبح كل واحد مالكاً لوحدته.**

## المبدأ

تتجمع عدة أسر لاقتناء أرض، وبناء مجموعة سكنية عليها، ثم تقاسم الوحدات. ويصبح كل واحد مالكاً لسكنه.

ويأتي التوفير من ثلاثة مصادر:

- **العقار**، يُشترى بالجملة لا بالتقسيط؛
- **البناء**، إذ تنخفض كلفة المتر المربع كلما زاد الحجم؛
- **هامش المنعش العقاري**، وهو منعدم لأن المجموعة هي صاحبة المشروع.

وتفسّر هذه العوامل الثلاثة مجتمعةً فوارق تتراوح بين 20 و35 % مقارنة بالسوق في مشاريع مماثلة.

## ما يُنجح المشروع

تُبرز تجربة العمليات المكتملة بعض الثوابت.

**أرض متحقَّق منها قبل أي التزام.** الوضعية القانونية، التخصيص، الشبكات، التحملات: يجب أن يكتمل الملف قبل أن يؤدي أحد درهماً واحداً.

**مجموعة متجانسة في الجوهر.** لا يلزم أن يتشابه المشاركون، لكن عليهم الاتفاق على مستوى التشطيب والجدولة والميزانية. فمن هنا تنشأ أغلب حالات الجمود.

**إطار قانوني منذ البداية.** تعاونية سكنية أو شركة مدنية عقارية: الشكل أقل أهمية من وجوده أصلاً، بقواعد مكتوبة للقرار والانسحاب والتوزيع.

**إشراف تقني مهني.** المهندس المعماري ومكتب المراقبة ليسا خياراً. فمجموعة من الأفراد لا تقود ورشاً.

## نقاط اليقظة

> السكن التشاركي ليس شراءً بل مشروعاً. وهو يتطلب وقتاً وتفرغاً وقدرة على تحمل غير المتوقع.

وتتكرر ثلاثة مخاطر:

1. **الانسحاب.** المشارك الذي ينسحب في الطريق يترك حصة يجب استرجاعها. وينبغي أن ينص النظام على هذه الحالة منذ اليوم الأول.
2. **تجاوز الكلفة.** كلفة البناء تتغير. والاحتياطي ضروري.
3. **الأجل.** بين تكوين المجموعة والتسليم، يُحسب بالسنوات لا بالأشهر.

## كيف تتدخل نتشاركو

تتحقق المنصة من الأراضي المقترحة، وتدرس كل مشروع، ولا تفتح باب الانخراط إلا للمشاريع المكتملة الملف. ويُعرض الثمن التشاركي وثمن السوق جنباً إلى جنب، ليكون التوفير المعلن قابلاً للتحقق.

ويبقى فتح مشروع قراراً إدارياً: فالأرض لا تصير مشروعاً لأنها أثارت اهتماماً، بل لأن ملفها دُرس.

## أسئلة شائعة

### كم يكلّف السكن التشاركي فعلاً؟

يتراوح الفارق الملاحَظ بين 20 و35 % دون ثمن السوق في مشاريع مماثلة، حسب حصة العقار في الميزانية ومستوى التشطيب المعتمد. وفي كل مشروع منشور، يُعرض الثمن التشاركي وثمن السوق جنباً إلى جنب ليكون الفارق قابلاً للتحقق لا مجرد إعلان.

### ماذا يحدث إذا انسحب أحد المشاركين؟

تُعرض حصته على باقي الأعضاء ثم على مترشحين جدد. ولهذا يجب أن يحدد النظام منذ تكوين المجموعة شروط الانسحاب وأجل الإشعار ومصير المبالغ المؤداة.

### ما الشكل القانوني الذي تختاره المجموعة؟

التعاونية السكنية والشركة المدنية العقارية هما الشكلان الشائعان. والاختيار أقل أهمية من اعتماد أحدهما قبل أي أداء، بنظام أساسي مكتوب يعالج القرار والانسحاب وتوزيع البقع.

### كم يستغرق مشروع تشاركي؟

احسبه بالسنوات لا بالأشهر: تكوين المجموعة، الاقتناء، الرخص، الورش، التسليم. والمشروع الذي يُعلَن سريعاً ينبغي أن يثير الحذر لا الحماس.

### هل يمكن الاقتراض لتمويل الحصة؟

نعم، لكن الشروط تتوقف على وضع المجموعة وتقدم المشروع. فتعاونية مؤسَّسة وأرض محفَّظة تسهّلان التمويل كثيراً؛ والعكس يجعله صعباً.

---

*يعرض هذا المقال مبدأً عاماً. ولكل مشروع شروطه الخاصة المفصَّلة في بطاقته.*', 'Logement participatif au Maroc : principe et conditions', 'السكن التشاركي بالمغرب: المبدأ والشروط', 'Comment fonctionne le logement participatif au Maroc : achat groupé du foncier, maîtrise d''ouvrage collective, cadre juridique, économies réalisées et risques à couvrir.', 'كيف يشتغل السكن التشاركي بالمغرب: الشراء الجماعي للعقار، الإشراف الجماعي، الإطار القانوني، التوفير المحقَّق والمخاطر الواجب تغطيتها.', 'participatif'::public.blog_category, 'publie'),
  ('financer-son-projet-immobilier', 'Financer un terrain au Maroc : apport, crédit et coopérative', 'تمويل أرض بالمغرب: المساهمة الذاتية، القرض، والتعاونية', 'Le crédit foncier obéit à d''autres règles que le crédit logement : apport souvent de 30 à 40 %, durée plus courte, titre foncier presque toujours exigé. Voici ce que les banques regardent, et les alternatives quand elles disent non.', 'يخضع القرض العقاري لقواعد غير قواعد قرض السكن: مساهمة ذاتية تتراوح غالباً بين 30 و40 %، ومدة أقصر، ورسم عقاري شبه إلزامي. إليك ما تنظر إليه الأبناك، والبدائل حين ترفض.', 'Financer l''achat d''un terrain nu n''est pas financer l''achat d''un logement. **Attendez-vous à un apport personnel plus élevé — souvent 30 à 40 % —, à une durée de remboursement plus courte, et à l''exigence d''un titre foncier.** Les conditions sont plus strictes, et beaucoup d''acquéreurs le découvrent tard.

## Ce que les banques regardent

Un terrain nu ne produit pas de revenu et se revend moins facilement qu''un appartement. Les établissements financiers en tiennent compte.

Attendez-vous à :

- un **apport personnel plus élevé** que pour un logement, souvent de l''ordre de 30 à 40 % ;
- une **durée de remboursement plus courte** ;
- une exigence de **titre foncier** — la melkia est presque toujours refusée ;
- parfois, l''obligation de construire dans un délai fixé.

Le taux d''endettement admis reste la règle habituelle : l''ensemble de vos mensualités ne doit pas dépasser une part de vos revenus nets, généralement autour de 40 %.

## Le crédit acquisition-construction

Certaines banques proposent un financement couvrant à la fois le terrain et la construction, débloqué par tranches selon l''avancement du chantier.

Ses avantages :

- un seul dossier, un seul taux ;
- un déblocage progressif, donc des intérêts calculés au fur et à mesure ;
- une durée alignée sur celle d''un crédit logement classique.

Sa contrainte : le projet de construction doit être défini dès le départ — plans, devis, calendrier. Ce n''est pas un financement pour acheter d''abord et réfléchir ensuite.

## La coopérative d''habitation

La coopérative permet à un groupe d''acquérir et de construire collectivement. Elle présente des atouts propres :

- une capacité d''emprunt collective supérieure à la somme des capacités individuelles ;
- des coûts de construction mutualisés ;
- un cadre juridique éprouvé pour la répartition des lots.

Elle demande en contrepartie une organisation rigoureuse : statuts, assemblées, comptabilité, et un engagement dans la durée.

## Les frais à prévoir au-delà du prix

Le prix affiché n''est pas ce que vous paierez. Comptez en plus :

1. les **droits d''enregistrement** ;
2. les frais de **conservation foncière** ;
3. les **honoraires du notaire** et la TVA correspondante ;
4. les frais de **bornage** si les limites doivent être établies ;
5. le **raccordement aux réseaux**, quand il n''est pas déjà réalisé.

Ces postes représentent une part non négligeable du budget. Faites-les chiffrer avant de vous engager, pas après.

> Un plan de financement qui n''intègre pas les frais annexes n''est pas un plan de financement.

## Questions fréquentes

### Quel apport faut-il pour acheter un terrain ?

Comptez un apport nettement supérieur à celui d''un achat de logement, souvent de l''ordre de 30 à 40 % du prix. Un terrain nu ne produit aucun revenu et se revend plus lentement : la banque compense ce risque par l''apport et par une durée plus courte.

### Peut-on obtenir un crédit sur un terrain en melkia ?

C''est très difficile. La plupart des établissements exigent un titre foncier pour pouvoir inscrire une garantie incontestable. L''immatriculation préalable est souvent la seule voie pour rendre le financement possible.

### Qu''est-ce qu''un crédit acquisition-construction ?

Un financement unique couvrant le terrain puis les travaux, débloqué par tranches selon l''avancement du chantier. Il suppose un projet défini dès le départ — plans, devis, calendrier — et non un achat suivi d''une réflexion.

### Quels frais s''ajoutent au prix du terrain ?

Droits d''enregistrement, conservation foncière, honoraires de notaire et TVA, bornage si les limites doivent être établies, et raccordement aux réseaux. Faites chiffrer l''ensemble avant de vous engager : c''est ce total, et non le prix affiché, qu''il faut comparer entre plusieurs terrains.

### Une coopérative emprunte-t-elle plus facilement qu''un particulier ?

Sa capacité collective dépasse la somme des capacités individuelles, ce qui ouvre des projets inaccessibles à chacun séparément. En contrepartie, la banque examine les statuts, la gouvernance et la solidité du groupe autant que les revenus de ses membres.

---

*Cet article est informatif. Les taux, quotités et barèmes évoluent : faites établir des simulations par plusieurs établissements et confirmez les frais auprès d''un notaire.*', 'تمويل شراء أرض عارية ليس كتمويل شراء سكن. **توقّع مساهمة ذاتية أعلى — تتراوح غالباً بين 30 و40 % —، ومدة سداد أقصر، واشتراط رسم عقاري.** فالشروط أكثر صرامة، ويكتشف ذلك كثير من المقتنين متأخرين.

## ما تنظر إليه الأبناك

الأرض العارية لا تدرّ دخلاً ويصعب بيعها مقارنة بشقة. والمؤسسات المالية تأخذ ذلك بعين الاعتبار.

فتوقّع:

- **مساهمة ذاتية أعلى** مما يُطلب لسكن، غالباً في حدود 30 إلى 40 %؛
- **مدة سداد أقصر**؛
- اشتراط **رسم عقاري** — والملكية تُرفض في أغلب الحالات؛
- أحياناً، إلزاماً بالبناء داخل أجل محدد.

ويبقى معدل المديونية المقبول هو القاعدة المعتادة: ألا يتجاوز مجموع أقساطك الشهرية نسبة من دخلك الصافي، حوالي 40 % عموماً.

## قرض الاقتناء والبناء

تقترح بعض الأبناك تمويلاً يغطي الأرض والبناء معاً، يُصرف على أشطر حسب تقدم الورش.

ومزاياه:

- ملف واحد ونسبة فائدة واحدة؛
- صرف تدريجي، فتُحتسب الفوائد تباعاً؛
- مدة موازية لمدة قرض السكن العادي.

وقيده: أن يكون مشروع البناء محدداً منذ البداية — تصاميم، تقديرات، جدولة. فهو ليس تمويلاً للشراء أولاً والتفكير لاحقاً.

## التعاونية السكنية

تتيح التعاونية لمجموعة أن تقتني وتبني جماعياً. ولها مزايا خاصة:

- قدرة اقتراض جماعية تفوق مجموع القدرات الفردية؛
- كلفة بناء مشتركة؛
- إطار قانوني مجرَّب لتوزيع البقع.

وتتطلب في المقابل تنظيماً صارماً: نظام أساسي، جموع عامة، محاسبة، والتزام على المدى الطويل.

## المصاريف الواجب توقعها فوق الثمن

الثمن المعروض ليس ما ستؤديه. فاحسب زيادةً على ذلك:

1. **رسوم التسجيل**؛
2. مصاريف **المحافظة العقارية**؛
3. **أتعاب الموثق** والضريبة على القيمة المضافة المقابلة؛
4. مصاريف **التحديد** إذا لزم إقامة الحدود؛
5. **الربط بالشبكات** إذا لم يكن منجزاً.

وتمثل هذه البنود حصة غير هينة من الميزانية. فاطلب تقديرها قبل الالتزام لا بعده.

> خطة تمويل لا تدمج المصاريف الإضافية ليست خطة تمويل.

## أسئلة شائعة

### ما المساهمة الذاتية اللازمة لشراء أرض؟

احسب مساهمة أعلى بكثير من مساهمة شراء سكن، غالباً في حدود 30 إلى 40 % من الثمن. فالأرض العارية لا تدرّ دخلاً ويبطؤ بيعها: والبنك يعوّض هذه المخاطرة بالمساهمة وبمدة أقصر.

### هل يمكن الحصول على قرض بضمان أرض في وضعية ملكية؟

ذلك صعب جداً. فأغلب المؤسسات تشترط رسماً عقارياً لتقييد ضمانة لا تقبل المنازعة. والتحفيظ المسبق هو السبيل الوحيد غالباً لجعل التمويل ممكناً.

### ما هو قرض الاقتناء والبناء؟

تمويل واحد يغطي الأرض ثم الأشغال، يُصرف على أشطر حسب تقدم الورش. ويفترض مشروعاً محدداً منذ البداية — تصاميم وتقديرات وجدولة — لا شراءً يعقبه تفكير.

### ما المصاريف التي تُضاف إلى ثمن الأرض؟

رسوم التسجيل، والمحافظة العقارية، وأتعاب الموثق والضريبة على القيمة المضافة، والتحديد إذا لزم إقامة الحدود، والربط بالشبكات. اطلب تقدير المجموع قبل الالتزام: فهذا المجموع، لا الثمن المعروض، هو ما ينبغي مقارنته بين عدة أراضٍ.

### هل تقترض التعاونية أيسر من الفرد؟

قدرتها الجماعية تفوق مجموع القدرات الفردية، مما يفتح مشاريع يتعذر على كل فرد بلوغها منفرداً. وفي المقابل، يفحص البنك النظام الأساسي والحكامة ومتانة المجموعة بقدر ما يفحص دخل أعضائها.

---

*هذا المقال إخباري. الأسعار والنسب والتعريفات تتغير: اطلب محاكاة من عدة مؤسسات وأكّد المصاريف لدى موثق.*', 'Financer l''achat d''un terrain au Maroc : ce qu''exigent les banques', 'تمويل شراء أرض بالمغرب: ما تشترطه الأبناك', 'Apport exigé, durée, crédit acquisition-construction, coopérative d''habitation et frais annexes : ce qu''il faut savoir pour financer un terrain nu au Maroc.', 'المساهمة المطلوبة والمدة وقرض الاقتناء والبناء والتعاونية السكنية والمصاريف الإضافية: ما ينبغي معرفته لتمويل أرض عارية بالمغرب.', 'financement'::public.blog_category, 'publie'),
  ('acheter-un-terrain-les-verifications', 'Acheter un terrain : les huit vérifications à ne pas sauter', 'شراء أرض: ثمانية تحققات لا ينبغي إغفالها', 'Statut juridique, identité du vendeur, zonage, limites, réseaux, accès, topographie, frais totaux : huit points à vérifier dans cet ordre, avant de négocier le prix. Chacun a déjà coûté cher à quelqu''un.', 'الوضعية القانونية، هوية البائع، التخصيص، الحدود، الشبكات، المنفذ، التضاريس، المصاريف الإجمالية: ثماني نقاط تُتحقَّق بهذا الترتيب قبل التفاوض في الثمن. وكل واحدة منها كلّفت أحدهم غالياً.', 'Il n''y a pas de secret à l''achat d''un terrain : il y a une liste, et la discipline de la dérouler entièrement avant de signer. **Statut juridique, identité du vendeur, zonage, limites, réseaux, accès, topographie, frais totaux — dans cet ordre.**

## 1. Le statut juridique

Titre foncier, melkia ou réquisition. Demandez un certificat de propriété récent et lisez-le : il porte les hypothèques, les servitudes et les oppositions.

## 2. L''identité du vendeur

Le vendeur est-il bien le propriétaire inscrit ? En cas d''indivision — fréquente dans les successions — **tous** les indivisaires doivent consentir. Une seule signature manquante et la vente est fragile.

## 3. Le zonage

Demandez la note de renseignements urbanistiques. Elle seule dit ce qui est constructible. Ce que le voisin a bâti ne prouve rien.

## 4. Les limites réelles

Le bornage établit les limites exactes. Un écart de quelques mètres sur une façade change la constructibilité — et la valeur. Faites-le vérifier par un géomètre quand le plan est ancien.

## 5. Les réseaux

Eau potable, électricité, assainissement. Vérifiez non pas leur présence dans le quartier, mais la **distance et le coût du raccordement** jusqu''à votre parcelle. L''écart entre les deux se chiffre parfois en dizaines de milliers de dirhams.

## 6. L''accès

Le terrain est-il desservi par une voie publique ? Un accès qui traverse la propriété d''autrui suppose une servitude de passage écrite et inscrite. Sans elle, l''accès peut être remis en cause.

## 7. La topographie

Une pente, une zone humide, un remblai ancien renchérissent les fondations. Un terrain plat et un terrain accidenté au même prix ne coûtent pas la même chose à construire.

## 8. Les frais totaux

Additionnez droits d''enregistrement, conservation foncière, honoraires, bornage et raccordements. Comparez ce total, et non le prix affiché, entre plusieurs terrains.

## L''ordre compte

> Vérifiez le statut et le zonage **avant** de négocier le prix. Ces deux points déterminent ce que vaut le terrain ; les découvrir après avoir signé un compromis vous laisse sans marge.

Un vendeur sérieux comprend ces demandes et fournit les pièces. Un vendeur qui s''en agace vous renseigne déjà.

## Questions fréquentes

### Quels documents demander au vendeur d''un terrain ?

Le certificat de propriété de moins de trois mois, la note de renseignements urbanistiques, le plan de bornage et, s''il existe, les attestations de raccordement aux réseaux. Un vendeur qui ne peut fournir aucune de ces pièces vend un terrain dont il ne connaît pas lui-même la situation.

### Peut-on acheter un terrain en indivision ?

Oui, mais tous les indivisaires doivent consentir à la vente. Une signature manquante rend l''opération attaquable, y compris des années plus tard. Dans une succession nombreuse, faites établir la liste complète des héritiers par un notaire avant tout versement.

### Faut-il faire borner un terrain avant de l''acheter ?

Quand le plan est ancien ou que les limites ne sont pas matérialisées, oui. Un écart de quelques mètres sur une façade change la surface constructible et la valeur. Le coût d''un géomètre est sans commune mesure avec celui d''un litige de limites.

### Comment vérifier le coût du raccordement aux réseaux ?

Ne vous fiez pas à la présence des réseaux dans le quartier : demandez aux régies concernées un devis de raccordement pour votre parcelle. La distance à parcourir et la nature des travaux font toute la différence, parfois plusieurs dizaines de milliers de dirhams.

### Que risque-t-on à verser une avance avant les vérifications ?

De payer pour un terrain que vous ne pourrez ni financer ni construire, et de devoir en récupérer le prix. Aucune vérification ne coûte plus cher qu''une avance versée sur un terrain qui ne convient pas.

---

*Cet article est informatif et ne remplace pas l''accompagnement d''un notaire ou d''un conseil juridique.*', 'لا سرّ في شراء أرض: بل قائمة، وانضباط في استيفائها كاملةً قبل التوقيع. **الوضعية القانونية، هوية البائع، التخصيص، الحدود، الشبكات، المنفذ، التضاريس، المصاريف الإجمالية — بهذا الترتيب.**

## 1. الوضعية القانونية

رسم عقاري أو ملكية أو مطلب تحفيظ. اطلب شهادة ملكية حديثة واقرأها: فهي تحمل الرهون والارتفاقات والتعرضات.

## 2. هوية البائع

هل البائع هو المالك المقيَّد فعلاً؟ وفي حالة الشياع — وهي شائعة في التركات — يجب أن يوافق **جميع** الشركاء. فتوقيع واحد ناقص يجعل البيع هشاً.

## 3. التخصيص العمراني

اطلب شهادة المعلومات التعميرية. فهي وحدها تبيّن ما يمكن بناؤه. وما بناه الجار لا يُثبت شيئاً.

## 4. الحدود الفعلية

التحديد يقيم الحدود الدقيقة. وفارق بضعة أمتار في واجهة يغيّر إمكانية البناء — والقيمة. اطلب من مهندس مساح التحقق منها إذا كان التصميم قديماً.

## 5. الشبكات

الماء الصالح للشرب، الكهرباء، التطهير. تحقق لا من وجودها في الحي، بل من **المسافة وكلفة الربط** إلى قطعتك. فالفارق بين الاثنين يُقدَّر أحياناً بعشرات الآلاف من الدراهم.

## 6. المنفذ

هل الأرض متصلة بطريق عمومية؟ المنفذ الذي يعبر ملك الغير يستلزم ارتفاق مرور مكتوباً ومقيَّداً. وبدونه قد يُنازَع في المنفذ.

## 7. التضاريس

الانحدار أو المنطقة الرطبة أو الردم القديم ترفع كلفة الأساسات. فأرض مستوية وأرض وعرة بالثمن نفسه لا تكلّفان الشيء نفسه في البناء.

## 8. المصاريف الإجمالية

اجمع رسوم التسجيل والمحافظة العقارية والأتعاب والتحديد والربط. وقارن هذا المجموع، لا الثمن المعروض، بين عدة أراضٍ.

## الترتيب مهم

> تحقق من الوضعية والتخصيص **قبل** التفاوض في الثمن. فهاتان النقطتان تحددان قيمة الأرض؛ واكتشافهما بعد توقيع وعد بالبيع يتركك بلا هامش.

البائع الجاد يتفهم هذه الطلبات ويقدّم الوثائق. والبائع الذي يتضايق منها يكون قد أخبرك بما يكفي.

## أسئلة شائعة

### ما الوثائق التي أطلبها من بائع أرض؟

شهادة الملكية التي لا يتجاوز عمرها ثلاثة أشهر، وشهادة المعلومات التعميرية، وتصميم التحديد، وشهادات الربط بالشبكات إن وُجدت. والبائع الذي لا يستطيع تقديم أي من هذه الوثائق يبيع أرضاً لا يعرف هو نفسه وضعيتها.

### هل يمكن شراء أرض في الشياع؟

نعم، لكن على جميع الشركاء الموافقة على البيع. فتوقيع ناقص يجعل العملية قابلة للطعن، ولو بعد سنوات. وفي تركة كثيرة الورثة، اطلب من موثق إعداد لائحة كاملة بالورثة قبل أي أداء.

### هل يجب تحديد الأرض قبل شرائها؟

إذا كان التصميم قديماً أو الحدود غير مادية، فنعم. ففارق بضعة أمتار في واجهة يغيّر المساحة القابلة للبناء والقيمة. وكلفة المهندس المساح لا تُقارن بكلفة نزاع في الحدود.

### كيف أتحقق من كلفة الربط بالشبكات؟

لا تكتفِ بوجود الشبكات في الحي: اطلب من الوكالات المعنية تقديراً لكلفة الربط إلى قطعتك. فالمسافة وطبيعة الأشغال تصنعان الفارق، وقد يبلغ عشرات الآلاف من الدراهم.

### ما مخاطر أداء تسبيق قبل التحققات؟

أن تدفع ثمن أرض لن تستطيع تمويلها ولا البناء عليها، ثم تضطر إلى استرجاع الثمن. فما من تحقق يكلّف أكثر من تسبيق أُدّي على أرض غير مناسبة.

---

*هذا المقال إخباري ولا يغني عن مواكبة موثق أو مستشار قانوني.*', 'Acheter un terrain au Maroc : 8 vérifications avant de signer', 'شراء أرض بالمغرب: 8 تحققات قبل التوقيع', 'La liste des huit vérifications à mener avant d''acheter un terrain au Maroc, dans l''ordre, et les documents à exiger du vendeur à chaque étape.', 'قائمة التحققات الثمانية الواجب إنجازها قبل شراء أرض بالمغرب، بالترتيب، والوثائق الواجب طلبها من البائع في كل مرحلة.', 'conseils'::public.blog_category, 'publie')
on conflict (slug) do update set
  title              = excluded.title,
  title_ar           = excluded.title_ar,
  excerpt            = excluded.excerpt,
  excerpt_ar         = excluded.excerpt_ar,
  body               = excluded.body,
  body_ar            = excluded.body_ar,
  seo_title          = excluded.seo_title,
  seo_title_ar       = excluded.seo_title_ar,
  seo_description    = excluded.seo_description,
  seo_description_ar = excluded.seo_description_ar,
  category           = excluded.category;

-- L'auteur est le premier compte administrateur, s'il en existe un.
update public.blog_posts
   set author_id = (select id from public.profiles where role = 'admin' order by created_at limit 1)
 where author_id is null;

-- Controle : chaque article doit avoir un corps arabe non vide, sinon la
-- version arabe du site retombe silencieusement sur le francais.
do $$
declare
  manquants integer;
begin
  select count(*) into manquants
    from public.blog_posts
   where btrim(coalesce(body_ar, '')) = '';

  if manquants > 0 then
    raise warning 'Articles sans corps arabe : % — la version arabe affichera le francais.', manquants;
  end if;
end;
$$;

select
  slug,
  category,
  reading_minutes,
  status,
  (btrim(coalesce(body_ar, '')) <> '') as arabe
from public.blog_posts
order by created_at;
