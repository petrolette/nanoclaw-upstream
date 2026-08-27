# Plan comptable et obligations de tenue des comptes

## Ce que la loi impose — et ce qu'elle n'impose pas

Le **Code des obligations n'impose aucun plan comptable**. L'art. 957a al. 2 CO exige seulement
un enregistrement **complet, sincère et systématique** des opérations, la pièce justificative pour
chaque écriture, la clarté, l'adéquation à la nature de l'entreprise et la traçabilité.

La structure des comptes est donc **libre**. Ce qui n'est pas libre : la structure minimale du
**bilan** (art. 959a CO) et du **compte de résultat** (art. 959b CO), qui fixent les postes à
présenter et leur ordre.

> Conséquence pratique : le plan utilisé dans l'ERP est légitime tant qu'il permet de produire
> un bilan et un compte de résultat conformes aux art. 959a/959b CO. Ne jamais « corriger » un
> plan interne au motif qu'il s'écarte du plan PME.

## Qui doit tenir quelle comptabilité (art. 957 CO)

| Situation | Obligation |
|---|---|
| Personnes morales (SA, Sàrl, coopératives, associations et fondations inscrites au RC) | **Comptabilité complète** : bilan, compte de résultat, annexe |
| Raisons individuelles et sociétés de personnes ≥ 500 000 CHF de chiffre d'affaires | Comptabilité complète |
| Raisons individuelles et sociétés de personnes < 500 000 CHF | Comptabilité simplifiée (« carnet du lait » : recettes, dépenses, patrimoine) |

**TKSA = SA** ⇒ comptabilité complète, sans seuil, avec annexe.

**Conservation** : livres, pièces comptables et rapport de gestion — **10 ans** à compter de la
fin de l'exercice (art. 958f CO). Le rapport de gestion et le rapport de révision doivent être
signés et conservés sur papier ou sous une forme garantissant l'intégrité.

**Monnaie et langue** (art. 957a al. 4 CO) : les comptes sont tenus en CHF ou dans la monnaie la
plus importante pour l'activité. Si une autre monnaie que le CHF est utilisée, les valeurs doivent
aussi être indiquées en CHF, avec mention des cours de conversion dans l'annexe.

## Le plan comptable suisse PME

Standard de fait en Suisse (Sterchi / Mattle / Helbling, édité par veb.ch et les Éditions LEP).
Ce n'est **pas** une norme légale : c'est une convention, largement adoptée, alignée sur la
structure du bilan et du compte de résultat du CO révisé.

Structure en 9 classes :

| Classe | Contenu |
|---|---|
| **1** | **Actif** — 10xx liquidités et titres · 11xx créances (débiteurs) · 12xx stocks et travaux en cours · 13xx actifs de régularisation · 14xx immobilisations financières · 15xx immobilisations corporelles mobilières · 16xx immobilisations corporelles immobilières · 17xx immobilisations incorporelles · 18xx capital non versé |
| **2** | **Passif** — 20xx dettes à court terme (créanciers, TVA due) · 23xx passifs de régularisation et provisions à court terme · 24xx dettes à long terme · 26xx provisions à long terme · 28xx capitaux propres (capital-actions, réserves, résultat reporté) |
| **3** | **Produits nets des ventes** de biens et de prestations de services |
| **4** | **Charges de matières / marchandises / prestations de tiers** (charges directes) |
| **5** | **Charges de personnel** |
| **6** | **Autres charges d'exploitation**, amortissements, résultat financier |
| **7** | **Résultat des activités annexes d'exploitation** |
| **8** | **Résultat hors exploitation, exceptionnel, impôts** |
| **9** | **Clôture** — compte de résultat, bilan, répartition du bénéfice |

La classe **9** n'apparaît pas dans les états financiers : ce sont les comptes techniques de
bouclement (résultat de l'exercice, ouverture/clôture du bilan).

## Points d'attention pour TKSA

- **Véhicules destinés à la revente** → classe **12xx** (stock de marchandises), et non 15xx.
  Ils suivent le régime des stocks (sous-évaluation d'un tiers admise), pas celui des
  immobilisations (amortissement). Voir `03-amortissements-provisions.md`.
- **Véhicules d'exploitation** (véhicule de service, atelier mobile) → classe **15xx**,
  immobilisation, amortie à 40 % dégressif.
- **Leasing** : le traitement dépend de qui porte le risque économique — le bien peut figurer ou
  non à l'actif. Cas de figure à trancher avec la fiduciaire, pas d'automatisme.
- **Comptes en devise** (achats en EUR) : le compte reste libellé dans sa devise, la contre-valeur
  CHF est déterminée par le cours retenu. La cohérence du cours utilisé entre saisie, bouclement
  et à-nouveaux est un invariant — voir la doctrine interne en mémoire.

## Sources

- [Fedlex — CO art. 957 à 963b (titre trente-deuxième : de la comptabilité commerciale)](https://www.fedlex.admin.ch/eli/cc/27/317_321_377/fr)
- [veb.ch / Éditions LEP — Plan comptable suisse PME](https://www.editionslep.ch/plan-comptable-suisse-pme-conf)
- [RISTER — présentation des 9 classes du plan comptable suisse](https://www.rister.ch/en/post/swiss-chart-of-accounts/)
- [JuriFidu — obligations comptables des PME suisses](https://jurifidu.ch/blog/obligations-comptables-pme-suisse/)

Fiche établie le 27.08.2026. Contenu **stable** — le CO révisé est en vigueur depuis 2013 ; le
plan PME évolue par éditions, sans effet rétroactif sur un plan déjà en place.
