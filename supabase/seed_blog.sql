-- =============================================================================
-- Ntcharkou — Articles du blog
-- =============================================================================
-- Six articles de fond sur l'immobilier au Maroc, publies d'emblee. Ils sont
-- modifiables et supprimables depuis le back-office (/admin/blog) comme
-- n'importe quel article redige ensuite : rien ici n'est fige.
--
-- Le corps est en Markdown restreint, rendu par l'application avec
-- echappement — voir `src/lib/markdown.ts`.
--
-- Contenu informatif : chaque article se termine par une mention rappelant
-- qu'il ne remplace pas un conseil professionnel.
--
-- Rejouable : `on conflict (slug) do nothing`.
-- =============================================================================

insert into public.blog_posts
  (slug, title, title_ar, excerpt, excerpt_ar, body, category, status)
values
  ('titre-foncier-melkia-requisition', 'Titre foncier, melkia, réquisition : lire le statut juridique d''un terrain', 'الرسم العقاري، الملكية، مطلب التحفيظ: قراءة الوضعية القانونية للأرض', 'Le statut juridique conditionne tout : la sécurité de l''achat, l''accès au crédit, la possibilité de construire. Voici comment lire les trois régimes que vous rencontrerez le plus souvent.', 'الوضعية القانونية تحدد كل شيء: أمان الشراء، الحصول على القرض، وإمكانية البناء. إليك كيف تقرأ الأنظمة الثلاثة الأكثر تداولاً.', 'Au Maroc, deux terrains voisins peuvent relever de régimes juridiques différents. Cette différence n''est pas administrative : elle change ce que vous achetez, ce qu''une banque acceptera de financer, et le délai avant de pouvoir bâtir.

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

---

*Cet article est informatif et ne remplace pas un conseil juridique. Les règles et les délais évoluent : faites confirmer votre situation par un professionnel.*', 'reglementation'::public.blog_category, 'publie'),
  ('comprendre-le-zonage-urbain', 'R+2, R+4, villa, lotissement : ce que le zonage vous autorise à construire', 'ر+2، ر+4، فيلا، تجزئة: ما يسمح لك به التخصيص العمراني بالبناء', 'Un même terrain de 1 000 m² peut porter deux logements ou vingt selon sa zone. Le zonage est la première chose à vérifier — avant même le prix.', 'قد تحمل أرض واحدة مساحتها 1000 م² سكنين أو عشرين حسب منطقتها. التخصيص العمراني أول ما ينبغي التحقق منه — قبل الثمن.', 'Deux terrains de surface identique, dans la même ville, peuvent avoir des capacités constructibles très différentes. Ce qui les sépare tient en un mot : le zonage.

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

---

*Cet article est informatif. Les règles d''urbanisme varient d''une commune à l''autre et évoluent : consultez l''agence urbaine compétente.*', 'reglementation'::public.blog_category, 'publie'),
  ('note-de-renseignements-urbanistiques', 'La note de renseignements urbanistiques : le document à demander en premier', 'شهادة المعلومات التعميرية: الوثيقة التي ينبغي طلبها أولاً', 'Elle indique noir sur blanc ce que vous pouvez construire sur une parcelle donnée. Aucune visite, aucune promesse ne la remplace.', 'تبيّن بوضوح ما يمكنك بناؤه على قطعة محددة. ولا تغني عنها أي زيارة أو وعد.', 'Avant de discuter d''un prix, il y a un document à obtenir. Il est peu coûteux, s''obtient en quelques jours, et évite l''essentiel des mauvaises surprises.

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

---

*Cet article est informatif. Les modalités varient selon les agences urbaines : renseignez-vous auprès de celle dont dépend votre parcelle.*', 'conseils'::public.blog_category, 'publie'),
  ('logement-participatif-principe', 'Le logement participatif : mutualiser un terrain pour bâtir à plusieurs', 'السكن التشاركي: تقاسم أرض للبناء جماعياً', 'Acheter à plusieurs un terrain qu''aucun ne pourrait s''offrir seul, puis y construire un ensemble de logements. Le principe est simple ; la réussite tient à la méthode.', 'شراء أرض جماعياً يعجز كل فرد عن اقتنائها بمفرده، ثم بناء مجموعة سكنية عليها. المبدأ بسيط، والنجاح رهين بالمنهجية.', 'Le foncier bien situé est cher, et il se vend en grandes parcelles. Un ménage seul en est écarté ; un groupe de vingt ne l''est plus. C''est l''idée du logement participatif.

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

---

*Cet article présente un principe général. Chaque projet a ses conditions propres, détaillées sur sa fiche.*', 'participatif'::public.blog_category, 'publie'),
  ('financer-son-projet-immobilier', 'Financer un terrain au Maroc : apport, crédit et coopérative', 'تمويل أرض بالمغرب: المساهمة الذاتية، القرض، والتعاونية', 'Le crédit foncier obéit à d''autres règles que le crédit logement. Voici ce que les banques regardent, et les alternatives quand elles disent non.', 'يخضع القرض العقاري لقواعد غير قواعد قرض السكن. إليك ما تنظر إليه الأبناك، والبدائل حين ترفض.', 'Financer l''achat d''un terrain nu n''est pas financer l''achat d''un logement. Les conditions sont plus strictes, et beaucoup d''acquéreurs le découvrent tard.

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

---

*Cet article est informatif. Les taux, quotités et barèmes évoluent : faites établir des simulations par plusieurs établissements et confirmez les frais auprès d''un notaire.*', 'financement'::public.blog_category, 'publie'),
  ('acheter-un-terrain-les-verifications', 'Acheter un terrain : les huit vérifications à ne pas sauter', 'شراء أرض: ثمانية تحققات لا ينبغي إغفالها', 'Une liste courte, dans l''ordre où il faut la dérouler. Chacun de ces points a déjà coûté cher à quelqu''un.', 'قائمة مختصرة، بالترتيب الذي ينبغي اتباعه. كل نقطة منها كلّفت أحدهم غالياً.', 'Il n''y a pas de secret à l''achat d''un terrain : il y a une liste, et la discipline de la dérouler entièrement avant de signer.

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

---

*Cet article est informatif et ne remplace pas l''accompagnement d''un notaire ou d''un conseil juridique.*', 'conseils'::public.blog_category, 'publie')
on conflict (slug) do nothing;

-- L'auteur est le premier compte administrateur, s'il en existe un.
update public.blog_posts
   set author_id = (select id from public.profiles where role = 'admin' order by created_at limit 1)
 where author_id is null;

select slug, category, reading_minutes, status from public.blog_posts order by created_at;
