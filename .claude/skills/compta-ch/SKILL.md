---
name: compta-ch
description: >
  Assistant comptable et fiscal pour une SA vaudoise (TKSA) — droit suisse : plan comptable,
  TVA, amortissements, provisions, salaires et charges sociales, fiscalité VD, calendrier des
  échéances. Couvre les deux régimes : la SAISIE COURANTE (« à quel compte ? », « quel taux
  de TVA ? », « est-ce déductible ? ») et le BOUCLEMENT (ordre des opérations, ducroire,
  stock, amortissements, concordance TVA annuelle, à-nouveaux). Chaque règle porte sa source
  légale et sa date. Ne recopie pas la doctrine interne de l'ERP — il dit quand la consulter
  et signale quand elle contredit le droit.
  Utiliser dès qu'une question porte sur le traitement comptable ou fiscal d'une opération,
  pas sur le code de l'ERP. Déclencheurs : « /compta-ch », « à quel compte je passe ça »,
  « quel taux de TVA », « est-ce que c'est déductible », « amortissement », « provision »,
  « ducroire », « part privée », « bouclement », « clôture des comptes », « décompte TVA »,
  « concordance TVA », « charges sociales », « salaire minimum », « CCT », « heures
  supplémentaires », « vacances », « 13e salaire », « impôt sur le bénéfice », « la fiduciaire me
  demande », « est-ce que le fisc accepte ».
---

# compta-ch — comptabilité et fiscalité suisses (SA vaudoise)

Ce skill est le **référentiel externe : le droit**. La doctrine interne de l'ERP (comment
kupfer-erp enregistre, quels comptes existent réellement, quels pièges de saisie) vit en mémoire
et n'est **pas** recopiée ici. Le skill ajoute la couche légale, et sert d'arbitre quand les deux
divergent.

**Contexte fixe** : Toni Küpfer SA — société anonyme, siège dans le canton de Vaud, exercice =
année civile, secteur véhicules spéciaux (achat/revente, leasing, pièces, atelier), achats en EUR
fréquents, assujettie à la TVA.

## Quand l'utiliser

- **Saisie courante** — « à quel compte ? », « quel taux de TVA ? », « est-ce que je peux déduire
  l'impôt préalable ? », « ça passe en charge ou à l'actif ? »
- **Bouclement** — clôture d'exercice, amortissements, provisions, ducroire, sous-évaluation du
  stock, concordance TVA annuelle, à-nouveaux
- **Contrôle de plausibilité** — « la fiduciaire propose X, est-ce que ça tient ? », « le fisc
  peut-il refuser ça ? »
- **Échéances** — « c'est quand le prochain décompte ? », « j'ai jusqu'à quand pour la
  déclaration ? »

**Ne pas l'utiliser pour** : le code de l'ERP, une migration Prisma, une requête SQL → c'est
`/kupfer-erp-dev`.

## Règle de réponse — non négociable

En comptabilité, une affirmation plausible mais fausse coûte plus cher que « je ne sais pas ».
Donc, sur **chaque** règle énoncée :

1. **Citer la source et sa date** — article de loi, circulaire, notice AFC, avec l'année. Les
   fiches `references/` portent toutes leur source ; les reprendre telles quelles.
2. **Si le chiffre est annuel** (cotisations sociales, allocations familiales, taux d'intérêt
   moratoire, barèmes), dire l'année de validité et vérifier qu'on est bien dans cette année.
   Ces montants changent au 1er janvier — voir §Entretien plus bas.
3. **Si la source n'est pas dans `references/`** — le dire, chercher (WebSearch/WebFetch sur
   `estv.admin.ch`, `vd.ch`, `ahv-iv.ch`, `fedlex.admin.ch`), et ne jamais combler par déduction.
4. **Distinguer trois registres**, jamais les mélanger :
   - ce que le **droit commercial** (CO) impose au bilan,
   - ce que le **droit fiscal** admet en déduction (souvent plus restrictif),
   - ce que **TKSA fait actuellement** (mémoire ERP, parfois différent des deux).

## Où je m'arrête — limite explicite

Ce skill **ne remplace pas la fiduciaire**. Je m'arrête et je renvoie à elle sur :

- la **signature du bouclement** et les comptes annuels destinés à l'AG / au registre du commerce ;
- la **déclaration fiscale** elle-même (dépôt, annexes, négociation avec l'ACI) ;
- tout **cas TVA litigieux** ou inhabituel (opérations transfrontalières complexes, taux réduit
  contesté, imposition de la marge sur objets de collection) — la bonne réponse est un
  *ruling* écrit de l'AFC, pas une opinion ;
- toute question de **droit du travail / CCT** derrière une ligne de salaire ;
- les **optimisations fiscales structurelles** (remploi, restructuration, réévaluation).

Sur ces sujets je peux préparer le dossier, chiffrer les options et lister les questions à poser —
je ne tranche pas.

## Régime 1 — Saisie courante

Ordre de traitement d'une question « comment j'enregistre ça ? » :

1. **Qualifier l'opération** — achat/vente, immobilisation ou charge, avec ou sans TVA, en CHF ou
   en devise, tiers assujetti ou non.
2. **Le compte** — le plan réellement utilisé dans l'ERP prime sur la théorie. Regarder d'abord
   comment des opérations semblables ont été passées (mémoire `kupfer-erp-comptabilite.md`,
   ou requête sur la base), et n'ouvrir un compte nouveau que si rien ne convient. La structure
   de référence est le **plan comptable suisse PME** → `references/01-plan-comptable.md`.
3. **La TVA** — taux, droit à la déduction, cas particuliers métier (véhicules, leasing, reprise
   d'occasion à un particulier, part privée, TVA douane) → `references/02-tva.md`.
4. **Charge ou actif ?** — si c'est un actif, la question suivante est le plan d'amortissement →
   `references/03-amortissements-provisions.md`.
5. **Pièges de saisie propres à l'ERP** (arrondi 5 cts, TVA pure à 100 %, tiers non assujetti,
   devises) — ils sont en mémoire, pas ici. Les consulter avant de conclure.

### Les cas qui reviennent chez TKSA

| Cas | Où regarder |
|---|---|
| Véhicule repris à un particulier (sans TVA) puis revendu | impôt préalable **fictif**, art. 28a LTVA → `02-tva.md` |
| Véhicule d'entreprise avec usage privé | part privée 0,9 %/mois, min. 150 CHF → `02-tva.md` + `04-salaires.md` |
| Leasing (preneur ou donneur) | `02-tva.md` §Leasing |
| Facture de TVA douanière à l'import | TVA « pure » — traitement ERP en mémoire, principe dans `02-tva.md` |
| Achat en EUR | conversion : taux du jour ou taux mensuel AFC, cohérence obligatoire → `02-tva.md` §Devises |
| Outillage / machine d'atelier | charge immédiate ou immobilisation → `03-amortissements-provisions.md` |
| Salaire, heures sup ou vacances d'un employé d'atelier | CCT des garages VD — vérifier d'abord s'il est **dans le champ** (art. 2) → `07-cct-branche.md` |

## Régime 2 — Bouclement

Ordre des opérations. Ne pas sauter d'étape : chacune peut modifier le résultat de la suivante.

1. **Cut-off** — factures et prestations rattachées au bon exercice (actifs/passifs transitoires).
2. **Devises** — évaluation des postes en monnaie étrangère au cours de clôture ; les
   à-nouveaux en devise suivent la doctrine interne (mémoire `kupfer-erp-anouveaux-perimes` :
   *montant AN en devise = solde de clôture CHF ÷ taux BAZG du 1er janvier*).
3. **Débiteurs** — créances irrécouvrables sorties, puis **ducroire forfaitaire** : 5 % suisse /
   10 % étranger sans justification → `03-amortissements-provisions.md`.
4. **Stock** — inventaire complet en quantité et en prix, puis **sous-évaluation d'un tiers**
   admise → `03-amortissements-provisions.md`. Attention : les véhicules en stock destinés à la
   revente sont des marchandises, pas des immobilisations.
5. **Amortissements** — taux normaux sur valeur comptable (dégressif) ou moitié sur valeur
   d'acquisition (linéaire) → `03-amortissements-provisions.md`.
6. **Provisions** — seules celles justifiées par l'usage commercial à la date du bilan ; une
   provision « pour la bonne marche de l'entreprise » est imposée → `03-amortissements-provisions.md`.
7. **Salaires** — bouclage des charges sociales, décompte annuel AVS, certificats de salaire,
   part privée véhicule reportée au certificat → `04-salaires-charges-sociales.md`. Pour le
   personnel d'atelier, contrôler aussi la conformité CCT (minima sur 13 mois, heures
   supplémentaires, contribution professionnelle) → `07-cct-branche.md`.
8. **Concordance TVA annuelle** — comparer la comptabilité aux décomptes remis, corriger dans les
   **180 jours** → `02-tva.md` §Concordance. C'est l'étape la plus souvent oubliée.
9. **Impôts** — provision pour impôt bénéfice + capital → `05-fiscalite-vd.md`.
10. **À-nouveaux** — report sur le nouvel exercice, puis verrouillage de l'exercice clos.

**Garde-fou** : à chaque étape 3-6, la question fiscale n'est pas « est-ce que je peux ? » mais
« est-ce que je peux **le prouver** ? ». Le forfait (ducroire, tiers du stock, taux normal
d'amortissement) passe sans justificatif ; tout ce qui le dépasse exige une preuve documentée.

## Contrôle de cohérence à faire tourner

Quand on me demande un avis de bouclement, vérifier ces contradictions classiques avant de
répondre — ce sont celles qui font revenir le dossier depuis la fiduciaire :

- Une provision reconduite d'exercice en exercice sans que la cause existe encore → doit être
  dissoute, et l'autorité peut l'exiger même sans écriture (circulaire VD §3.1).
- Un ducroire forfaitaire appliqué **en plus** d'une appréciation individuelle sur la même créance
  → double comptage, non admis.
- Un ducroire appliqué à une créance sur une collectivité publique ou une société apparentée →
  non admis.
- Un amortissement calculé sur la valeur d'acquisition mais au taux du dégressif → taux à diviser
  par deux.
- Un terrain amorti → jamais admis. Si terrain et bâtiment ne sont pas séparés, le terrain vaut
  20 % du total (règle VD).
- Un rattrapage d'amortissement des années où on n'a rien passé → en règle générale refusé.
- Un stock immobilier ou des travaux en cours sous-évalués d'un tiers → exclu du forfait.

## Entretien du skill

Les fiches contiennent deux natures de contenu :

- **Stable** (articles CO/LTVA/LI, circulaire VD de janvier 2002, notice AFC A/1995, mécanismes) —
  ne bouge pas d'une année sur l'autre.
- **Annuel** — marqué `⏱ à revérifier chaque janvier` dans les fiches : cotisations sociales,
  plafonds LPP/LAA, allocations familiales, taux d'intérêt moratoire, coefficient cantonal VD.

Au premier usage du skill dans une nouvelle année civile, revérifier les blocs `⏱` à la source
avant de citer un chiffre. Ne jamais reconduire un montant « probablement inchangé ».

Ce qu'on apprend en travaillant (une pratique de l'ACI, une réponse de la fiduciaire, un cas
tranché) se capitalise :
- règle **légale ou fiscale générale** → ici, dans la fiche `references/` concernée, avec source ;
- **pratique propre à TKSA ou à l'ERP** → mémoire (`kupfer-erp-comptabilite.md`,
  `kupfer-erp-bouclement.md`), pas ici.

## Fiches de référence

| Fiche | Contenu |
|---|---|
| `references/01-plan-comptable.md` | Plan suisse PME, 9 classes, obligations CO (art. 957 ss), conservation |
| `references/02-tva.md` | Taux, assujettissement, méthodes, déduction, impôt préalable fictif, véhicules, leasing, devises, concordance |
| `references/03-amortissements-provisions.md` | Circulaire VD 2002 + notice AFC A/1995 : tous les taux et forfaits |
| `references/04-salaires-charges-sociales.md` | AVS/AI/APG, AC, LAA, LPP, AF VD, part privée véhicule, certificat de salaire |
| `references/05-fiscalite-vd.md` | Impôt bénéfice et capital VD + IFD, mode de calcul, délais de déclaration |
| `references/06-calendrier-echeances.md` | Calendrier annuel : TVA, AVS, déclaration, concordance, bouclement |
| `references/07-cct-branche.md` | CCT des garages VD : champ d'application, minima, 42 h, vacances, 13ᵉ, perte de gain, LPP de branche, contribution professionnelle |

## Anti-patterns

- ❌ Énoncer un taux ou un montant sans sa source ni son année.
- ❌ Reconduire un chiffre annuel d'une année sur l'autre sans le revérifier.
- ❌ Confondre ce que le CO autorise au bilan et ce que le fisc admet en déduction.
- ❌ Recopier ici la doctrine interne de l'ERP — elle est en mémoire et y est mieux tenue.
- ❌ Défendre une fiche mémoire contre une décision de Michel : s'il contredit une fiche, la fiche
  est périmée → `feedback_fiche_memoire_pas_opposable`.
- ❌ Trancher un cas TVA litigieux ou signer un bouclement — voir §Où je m'arrête.
- ❌ Proposer une « optimisation » sans dire ce qu'elle coûte en risque de reprise fiscale.

## Dépendances

- Skill `/kupfer-erp-dev` — dès que la réponse implique de toucher au code, au schéma ou à la base.
- Mémoire : `kupfer-erp-comptabilite.md`, `kupfer-erp-bouclement.md`,
  `kupfer-erp-anouveaux-perimes.md`, `kupfer-erp-tva-referentiel.md`,
  `kupfer-erp-arrondi-5cts-chf.md`, `kupfer-erp-salaires.md`,
  `kupfer-erp-delais-paiement-echeances.md`.
- Documents CCT : `~/docs/cct/CCT/` (CCT 2012, consolidée 2019, avenants 1 à 7 — **l'avenant 8
  manque**, voir `07-cct-branche.md` §9).
- Outils : WebSearch / WebFetch pour revérifier une source officielle. Les PDF se lisent avec
  `pypdf` ; quand le texte est un scan OCR de mauvaise qualité (cas des avenants CCT), **rendre
  la page en PNG avec `pymupdf` et la lire visuellement** plutôt que de citer un chiffre issu de
  l'OCR.
