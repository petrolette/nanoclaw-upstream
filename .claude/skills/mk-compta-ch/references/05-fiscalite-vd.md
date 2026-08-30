# Fiscalité des personnes morales — canton de Vaud

Base légale cantonale : **loi du 4 juillet 2000 sur les impôts directs cantonaux (LI/VD)**.
Base fédérale : **LIFD**.

## 1. Impôt sur le bénéfice

### Taux de base cantonal

| Tranche de bénéfice net | Taux de base |
|---|---|
| Jusqu'à **10 000 000 CHF** | **3 ⅓ %** |
| Au-delà de 10 000 000 CHF | **3,75 %** |

Le palier à deux tranches est entré en vigueur le **1er janvier 2025** (auparavant : 3 ⅓ % sur la
totalité).

### Mécanisme de calcul

```
Impôt cantonal  = bénéfice net × taux de base × coefficient cantonal
Impôt communal  = bénéfice net × taux de base × coefficient communal
Impôt fédéral   = bénéfice net × 8,5 %
```

- **Coefficient cantonal : 155 %** (⏱ fixé annuellement par arrêté d'imposition — revérifier).
- **Coefficient communal** : variable selon la commune du siège. À lire dans l'arrêté
  d'imposition de la commune concernée.
- **IFD : 8,5 %** du bénéfice net, proportionnel, sans coefficient.

L'impôt est une **charge déductible** : le taux effectif se calcule sur le bénéfice avant impôt,
ce qui abaisse la charge réelle par rapport à la somme brute des taux.

### Ordre de grandeur

Charge globale (cantonal + communal + fédéral) pour une SA vaudoise avec un bénéfice ≤ 10 M :
**≈ 14 %** du bénéfice avant impôt, la fourchette réelle dépendant du coefficient communal.
Ne jamais donner ce chiffre comme un montant : c'est un ordre de grandeur pour cadrer une
provision, pas un calcul d'impôt.

## 2. Impôt sur le capital

- **0,6 ‰** du capital propre imposable, **depuis 2019**.
- Multiplié par les coefficients cantonal et communal comme l'impôt sur le bénéfice.
- **Imputation** : l'impôt **cantonal et communal sur le bénéfice** dû par les sociétés de
  capitaux et coopératives est **imputé sur l'impôt sur le capital**. En pratique, une société
  bénéficiaire ne paie souvent pas d'impôt sur le capital — mais une société déficitaire, si.
- Exonération : le capital propre des associations, fondations et autres personnes morales n'est
  pas imposé lorsqu'il n'atteint pas 200 000 CHF (dès la période fiscale 2020).
- **Pas d'impôt fédéral sur le capital** — l'IFD ne frappe que le bénéfice.

### Capital propre imposable

Capital-actions libéré + réserves ouvertes + **réserves latentes imposées** + part du capital
étranger économiquement assimilable au capital propre (capital propre dissimulé). Ce dernier point
est le piège classique des sociétés fortement financées par des prêts d'actionnaires.

## 3. Déclaration d'impôt

- Délai : **255 jours après la clôture des comptes**, soit **mi-septembre** pour un exercice clos
  au 31 décembre.
- Prolongation possible via **e-Délai** (portail ACI).
- Sanctions en cas de retard : sommation avec émolument (ordre de 50 CHF), puis **taxation
  d'office** assortie d'amendes pouvant atteindre 10 000 CHF.

Documents joints : comptes annuels signés (bilan, compte de résultat, annexe), tableau des
amortissements, détail des provisions, état des participations.

## 4. Points de contrôle avant la déclaration

- **Charges non justifiées par l'usage commercial** (art. 58 LIFD / art. 94 LI) : dépenses privées
  passées en charge, part privée véhicule non reprise, cadeaux et frais de représentation
  excessifs → réintégrées au bénéfice imposable.
- **Distributions dissimulées de bénéfice** : prestation à l'actionnaire ou à un proche à des
  conditions qui ne seraient pas consenties à un tiers (loyer, salaire, prix de vente d'un
  véhicule). C'est le redressement le plus fréquent dans une PME familiale — le prix de transfert
  d'un véhicule à un proche doit tenir la comparaison avec le marché, et être documenté.
- **Provisions non justifiées** → voir `03-amortissements-provisions.md`.
- **Report des pertes** : déductibles sur les **7 exercices** précédant la période fiscale
  (art. 67 LIFD).
- **Réduction pour participations** : allègement sur les rendements de participations d'au moins
  10 % du capital ou d'une valeur vénale d'au moins 1 M CHF.

## 5. Ce que je ne fais pas ici

Le remploi (art. 101 LI), les restructurations, la déclaration de réserves latentes, le
patent box et la déduction R&D issus de la RFFA : ces régimes existent et peuvent s'appliquer,
mais ils se traitent **avec la fiduciaire et, si l'enjeu le justifie, par un ruling écrit de
l'ACI**. Je peux préparer les chiffres et poser les questions ; je ne tranche pas.

## Sources

- [État de Vaud — Impôt sur le bénéfice](https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-societes/les-impots/impot-sur-le-benefice)
- [État de Vaud — Impôt sur le capital](https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-societes/les-impots/impot-sur-le-capital)
- [État de Vaud — Demander un délai pour le dépôt de la déclaration d'impôt](https://www.vd.ch/prestation/demander-un-delai-pour-le-depot-de-la-declaration-dimpot-pour-les-individus-personnes-physiques-et-les-societes-personnes-morales)
- [État de Vaud — Formulaires, directives, lois et barèmes](https://www.vd.ch/etat-droit-finances/impots/formulaires-directives-et-baremes)
- [AFC — Feuille cantonale Vaud](https://www.estv2.admin.ch/stp/kb/vd-fr.pdf)

Fiche établie le 27.08.2026.
**Stable** : taux de base 3⅓ / 3,75 %, IFD 8,5 %, capital 0,6 ‰, mécanisme d'imputation,
report de pertes sur 7 ans, délai de 255 jours.
⏱ **À revérifier chaque année** : coefficient cantonal (155 %) et coefficient communal.
