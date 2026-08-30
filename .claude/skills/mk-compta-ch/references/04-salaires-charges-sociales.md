# Salaires et charges sociales — Suisse / canton de Vaud

⏱ **Toute cette fiche est à revérifier au 1er janvier de chaque année.** Les taux et les
plafonds sont fixés annuellement. Les valeurs ci-dessous sont celles de **2026**.

## 1. AVS / AI / APG

| | Taux |
|---|---|
| Salarié | **5,30 %** |
| Employeur | **5,30 %** |
| **Total** | **10,60 %** |
| Indépendant | 10,00 % (barème dégressif si revenu < 60 500 CHF) |

Pas de plafond de salaire : la cotisation est due sur l'intégralité du salaire déterminant.

**Rentes AVS 2026** (utile pour situer les ordres de grandeur) : rente minimale 1 260 CHF/mois,
maximale 2 520 CHF/mois, plafond couple 3 780 CHF/mois.

## 2. Assurance-chômage (AC)

| | Taux total | Répartition |
|---|---|---|
| Jusqu'à **148 200 CHF** de salaire annuel | **2,20 %** | 1,10 % salarié / 1,10 % employeur |
| Au-delà de 148 200 CHF | **0 %** | La cotisation de solidarité de 1 % a été supprimée dès 2023 |

⚠️ La mémoire ERP (`kupfer-erp-salaires.md`, Phase 3) mentionne encore « AC 1,1 % + 0,5 %
solidarité » : c'est une note de conception antérieure, à ne pas appliquer telle quelle.
Vérifier ce que le module calcule réellement avant de conclure quoi que ce soit.

## 3. Assurance-accidents (LAA)

- **Salaire maximum assuré : 148 200 CHF** par an.
- **AAP** (accidents professionnels) — à la charge de **l'employeur**, taux selon le risque de
  la branche et l'assureur.
- **AANP** (accidents non professionnels) — obligatoire dès 8 h/semaine chez le même employeur ;
  la prime peut être mise à la charge du **salarié**, ce qui est l'usage.
- Taux propres au contrat : les lire sur la police, jamais les supposer.

## 4. Prévoyance professionnelle (LPP) — montants 2026

| Paramètre | Montant |
|---|---|
| Seuil d'entrée (salaire annuel minimal) | **22 680 CHF** |
| Déduction de coordination | **26 460 CHF** |
| Salaire coordonné **minimal** | **3 780 CHF** |
| Salaire coordonné **maximal** | **64 260 CHF** |
| Limite supérieure du salaire LPP | **90 720 CHF** |

**Bonifications de vieillesse** (part obligatoire, en % du salaire coordonné) :

| Âge | Taux |
|---|---|
| 25–34 ans | 7 % |
| 35–44 ans | 10 % |
| 45–54 ans | 15 % |
| 55–65 ans | 18 % |

L'employeur doit financer **au moins la moitié** du total des cotisations (art. 66 al. 1 LPP).
Le plan de prévoyance réel de TKSA peut être **surobligatoire** — les taux effectifs se lisent
sur le règlement et les décomptes de la caisse, pas sur le minimum légal.

## 5. Allocations familiales — canton de Vaud

Prestations 2026 :

| Prestation | Montant mensuel |
|---|---|
| Enfant < 16 ans (1er et 2e enfant) | **322 CHF** |
| Enfant < 16 ans (dès le 3e) | **365 CHF** |
| En formation, 16–25 ans (1er et 2e) | **425 CHF** |
| En formation, 16–25 ans (dès le 3e) | **468 CHF** |

L'allocation de formation est versée à partir du mois suivant les 16 ans, jusqu'à la fin de la
formation, au maximum jusqu'aux 25 ans.

**Cotisation** : entièrement à la charge de l'employeur, taux fixé par la caisse d'allocations
familiales à laquelle il est affilié — obligation d'affiliation pour tout employeur occupant du
personnel dans le canton, quel que soit l'état civil du personnel. Ordre de grandeur observé en
2026 : ~2,8 % de la masse salariale AVS (CAF INTER : 2,83 %). **Lire le taux réel sur la notice
de la caisse de TKSA**, il varie d'une caisse à l'autre.

⚠️ La mémoire ERP mentionne « 300 CHF/enfant, 400 CHF apprenti » — chiffres périmés.

## 6. Autres charges

- **Assurance perte de gain maladie (APGM)** — facultative légalement, souvent imposée par la
  CCT de branche. Taux selon contrat, répartition selon CCT.
- **Assurance maternité cantonale** — pas de régime cantonal spécifique dans le canton de Vaud
  (contrairement à Genève, LAMat). Les APG fédérales couvrent le congé maternité.
- **Impôt à la source** — barèmes VD selon situation familiale ; dû pour les employés sans permis
  C et les frontaliers. Décompte mensuel auprès de l'ACI, commission de perception retenue par
  l'employeur.

## 7. Part privée d'un véhicule d'entreprise — côté salaire

**0,9 % du prix d'achat hors TVA par mois** (min. 150 CHF/mois), soit 10,8 % par an. Le forfait
couvre aussi les trajets domicile-travail depuis 2022.

- Figure au **ch. 2.2 du certificat de salaire**, pour sa valeur **TVA comprise** (108,1 %).
- Fait partie du **salaire déterminant AVS** ⇒ soumis à toutes les charges sociales.
- Côté TVA, la valeur nette est déclarée comme chiffre d'affaires imposable — voir `02-tva.md`.
- En cas de **leasing**, la valeur du contrat remplace le prix d'achat.

## 8. Ce qui prime sur cette fiche

La **CCT de branche** peut imposer plus que le minimum légal : salaires minimaux, 13ᵉ salaire,
vacances, indemnités de déplacement/repas, APGM obligatoire, contribution aux frais d'exécution.
Quand la CCT et le minimum légal divergent, **la CCT s'applique**.

→ Fiche `07-cct-branche.md` dès que les bulletins CCT de TKSA sont dépouillés
(dépôt : `~/docs/cct/`).

## Sources

- [OCAS — Nouveautés et chiffres clés des assurances sociales 2026](https://www.ocas.ch/actualites/nouveautes-et-chiffres-cles-des-assurances-sociales-2026)
- [ahv-iv.ch — Mémento 2.01, cotisations salariales AVS/AI/APG](https://www.ahv-iv.ch/p/2.01.f)
- [Caisse AVS Vaud — Prestations familiales 2026](https://www.caisseavsvaud.ch/fr/Assurances/AF/Allocations-familiales/Allocations-familiales-AF.html)
- [Centre Patronal — Guide des taux de cotisations 2026](https://www.centrepatronal.ch/wp-content/uploads/2025/02/guide-taux-cotisations-2026.pdf)
- [entreprendre.ch — Charges sociales en Suisse, taux 2026](https://entreprendre.ch/fiches-pratiques/finance-comptabilite/charges-sociales-taux-suisse/)
- [ge.ch — Véhicules d'entreprise utilisés à des fins privées (certificat de salaire)](https://www.ge.ch/certificat-salaire-frais-vehicules-professionnels/vehicules-entreprise-utilises-fins-privees)

Fiche établie le 27.08.2026, valeurs **2026**.
⏱ Tous les montants et taux : à revérifier au 1er janvier.
**Stable** : mécanismes (déduction de coordination, bonifications par tranche d'âge, forfait
0,9 %, salaire déterminant AVS), pas les montants.
