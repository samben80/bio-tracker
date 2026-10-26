# Paie Maroc

Logiciel de gestion de la paie conforme à la législation marocaine : dossier du personnel, paramétrage,
production des bulletins, déclarations CNSS/AMO (Damancom), IR (SIMPL-IR, 9421), CIMR, états et
comptabilisation. Le périmètre reprend celui des solutions du marché (Generafi Paie, Sage Paie Maroc, etc.).

## Démarrage

```bash
cd paie-maroc
npm install
npm run dev        # http://localhost:3000
npm test           # moteur de calcul et exports
```

Mise en ligne, environnements production et test, et bouton de mise à jour : voir [DEPLOIEMENT.md](DEPLOIEMENT.md).

Au premier lancement, un dossier de démonstration (société fictive, 6 salariés, juillet à octobre 2026)
est créé dans `data/paie.json`. Menu **Sauvegarde** : dossier vierge, export ou restauration.
`PAIE_DATA_FILE` permet de choisir l'emplacement du fichier de données.

## Fonctionnalités

| Domaine | Contenu |
| --- | --- |
| Salariés | État civil, situation familiale et personnes à charge, contrat (CDI, CDD, ANAPEC, stage…), rémunération mensuelle ou horaire, RIB, CNSS, CIMR, mutuelle, intérêts de prêt logement, exonérations, éléments fixes |
| Dossier administratif | Pièces (CIN, contrat, RIB, diplômes…), dates d'expiration, alertes sur les pièces manquantes ou expirées et les fins de CDD |
| Configuration | Fiche société (ICE, IF, RC, TP, affiliation CNSS, CIMR), rubriques avec plafonds d'exonération IR et CNSS distincts, paramètres légaux modifiables (taux, plafond, barème, SMIG, ancienneté) |
| Production | Périodes mensuelles (ouverte → calculée → clôturée), grille des variables (jours, absences, congés, heures sup 25/50/100 %, avances, situation CNSS), éléments variables, prorata d'entrée et de sortie |
| Bulletins | Bulletin détaillé (parts salariale et patronale, cumuls annuels, congés), impression unitaire ou en lot (PDF via le navigateur) |
| CNSS / AMO | Bordereau de déclaration des salaires et fichier EDI Damancom (enregistrements B00 à B06 de 260 caractères), contrôle des anomalies |
| IR | État de versement mensuel (SIMPL-IR) et déclaration annuelle des traitements et salaires (9421) au format XML |
| CIMR | Bordereau trimestriel |
| États | Journal de paie, récapitulatif par rubrique, ordre de virement, écriture comptable CGNC (6171, 6174, 4441, 4443, 4445, 4452, 4432…), exports CSV |
| Documents RH | Attestation de travail, attestation de salaire, certificat de travail, reçu pour solde de tout compte (congés, préavis, indemnité de licenciement art. 53, dommages-intérêts art. 41) reporté sur le dernier bulletin |
| Outils | Simulateur brut → net et net → brut, suivi des congés payés (art. 231 et 241) |
| Exploitation | Connexion par mot de passe (utilisateur, administrateur), stockage Postgres (Neon) ou fichier, page « Mises à jour » : vérification de la dernière version publiée, installation et retour arrière |

## Règles de calcul (paramètres par défaut, 2026)

- **CNSS** : prestations sociales 4,48 % salarié / 8,98 % employeur sur un salaire plafonné à 6 000 DH ;
  allocations familiales 6,40 % et taxe de formation professionnelle 1,60 % employeur (non plafonnées).
- **AMO** : 2,26 % salarié + 2,26 % employeur + participation de 1,85 % employeur (non plafonnées).
- **Frais professionnels** : 35 % si le revenu brut imposable annuel est inférieur ou égal à 78 000 DH, 25 % au-delà, plafond de 35 000 DH par an.
  Les avantages en nature sont exclus de la base.
- **IR** : barème annuel de la loi de finances 2025 (0 % jusqu'à 40 000 DH, puis 10/20/30/34/37 %) appliqué au net imposable annualisé ;
  500 DH par an par personne à charge (6 au plus).
- **Net imposable** = brut imposable − frais professionnels − cotisations salariales (CNSS, AMO, CIMR, mutuelle) − intérêts de prêt logement (10 % du SBI au plus).
- **Prime d'ancienneté** (art. 350) : 5 % à 2 ans, 10 % à 5 ans, 15 % à 12 ans, 20 % à 20 ans, 25 % à 25 ans.
- **CIMR** : taux salarial propre à chaque salarié, part patronale égale à 1,3 fois le taux salarial.
- **Exonérations** (rubriques modifiables) : transport 500 DH, panier 2 × SMIG horaire par jour, représentation 10 % du salaire de base,
  caisse, tournée, lait, outillage, salissure, indemnités de stage ANAPEC jusqu'à 6 000 DH.

## À vérifier avant la mise en production

- **Valeurs légales** : à contrôler à chaque loi de finances et à chaque revalorisation (le SMIG 2026 est fixé à 17,92 DH/h par défaut).
- **Fichier Damancom** : sa structure suit le cahier des charges EDI de la CNSS. Il faut le tester sur le portail avant la première
  télédéclaration, notamment l'identifiant de transfert du préétabli et la clé de contrôle.
- **XML 9421** : il faut le valider avec le validateur SIMPL-IR, car le schéma XSD peut évoluer.
- **Hors périmètre de cette version** :
  - comptes nominatifs (deux mots de passe partagés pour l'instant : utilisateur et administrateur) ;
  - multi-sociétés ;
  - régularisation annuelle de l'IR ;
  - absences maladie indemnisées par la CNSS ;
  - prêts avec échéancier ;
  - pièces jointes numérisées.
- **Stockage** : Postgres (Neon) dès que `DATABASE_URL` est défini, sinon un fichier JSON local.

## Architecture

```
src/lib/paie/       moteur de calcul pur (types, paramètres, bulletin, agrégats, solde de tout compte) + tests
src/lib/exports/    CNSS (BDS Damancom), IR (9421 XML), CIMR, virements, comptabilité, formats
src/lib/store.ts    persistance JSON (écritures atomiques et sérialisées)
src/app/            pages (App Router, Server Components) et Server Actions (actions.ts)
src/app/api/export  téléchargement des fichiers générés
```
