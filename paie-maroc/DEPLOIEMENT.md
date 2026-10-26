# Mise en ligne sur Vercel

Deux environnements fonctionnent en parallèle, chacun avec sa propre base de données :

| | Production | Test |
| --- | --- | --- |
| Utilisateurs | Les gestionnaires de paie | L'équipe de développement |
| Code | Branche `production`, déplacée uniquement par le bouton « Mises à jour » | Branche `master` et les autres branches, déployées à chaque commit |
| Adresse | `https://<projet>.vercel.app` (ou votre domaine) | `https://<projet>-git-master-<compte>.vercel.app` |
| Données | Base Neon de production, dossier vierge au départ | Base Neon de test, données de démonstration |

```
développement ──push──▶ master ──▶ Vercel Preview (test)
                         │
          « Publier une version » (GitHub Actions) ──▶ tag paie-vX.Y.Z + release
                                                        │
        bouton « Installer » dans Mises à jour (production) ──▶ branche production ──▶ Vercel Production
```

La production n'évolue que lorsqu'un administrateur clique sur « Installer ». Pendant que Vercel construit
la nouvelle version, les utilisateurs continuent sur l'ancienne, puis la bascule est instantanée. Le même
écran permet de revenir à une version précédente.

## 1. Créer le projet Vercel (une fois)

1. vercel.com → **Add New… → Project** → importer le dépôt GitHub `samben80/bio-tracker`.
2. **Root Directory** : `paie-maroc`. Framework : Next.js (détecté automatiquement).
3. Après la création : **Settings → Environments → Production → Branch Tracking**. Choisir la branche `production`.
   Les autres branches, dont `master`, deviennent des déploiements Preview.

## 2. Créer les deux bases de données

**Storage → Create Database → Neon (Postgres)**, deux fois :

- `paie-production`, connectée à l'environnement **Production** uniquement ;
- `paie-test`, connectée à **Preview** et **Development**.

Vercel crée alors la variable `DATABASE_URL` pour chaque environnement. La table `paie_dossier` est créée
automatiquement au premier accès.

## 3. Variables d'environnement (Settings → Environment Variables)

| Variable | Production | Preview | Rôle |
| --- | --- | --- | --- |
| `AUTH_SECRET` | valeur A | valeur B | Signature des sessions (`openssl rand -base64 32`) |
| `PAIE_MOT_DE_PASSE` | ✔ | ✔ | Accès des utilisateurs |
| `PAIE_MOT_DE_PASSE_ADMIN` | ✔ | ✔ | Accès administrateur : paramètres, sauvegarde, mises à jour |
| `GITHUB_TOKEN` | ✔ | facultatif | Jeton GitHub fin, accès **Contents : Read and write** au seul dépôt |
| `GITHUB_REPO` | `samben80/bio-tracker` | idem | Facultatif : déduit automatiquement sur Vercel |

Sans mot de passe défini, l'application refuse tout accès sur Vercel.

## 4. Publier la première version

1. Fusionner le code dans `master`.
2. GitHub → **Actions → « Paie Maroc - publier une version » → Run workflow**, version `1.0.0`. Le workflow lance les tests et le build,
   fixe la version, crée le tag `paie-v1.0.0` et la release.
3. Ouvrir l'adresse de test, se connecter en administrateur → **Mises à jour → Vérifier** → la version 1.0.0 apparaît.
   L'installation initiale se fait d'une de ces deux manières :
   - depuis l'environnement de test, avec la variable `PAIE_AUTORISER_MAJ=1` définie en Preview pour cette seule opération ;
   - à la main : `git push origin paie-v1.0.0^{commit}:refs/heads/production`.
4. Vercel déploie la production. Les mises à jour suivantes se font depuis la production : **Mises à jour → Vérifier → Installer**.

## Cycle de travail courant

1. Développer sur une branche, ouvrir une pull request (les tests tournent automatiquement), puis fusionner dans `master`.
2. Vérifier sur l'adresse de test.
3. Lancer « Publier une version » avec le numéro suivant (correctif : 1.0.1, nouveautés : 1.1.0).
4. Dans la production : **Mises à jour → Vérifier → Installer**, après avoir téléchargé une sauvegarde.

## Compatibilité des données

Le dossier de paie est un document JSON versionné (`version`). Chaque version du logiciel le met à niveau à la lecture
(`migrer()` dans `src/lib/store.ts`). Toute nouvelle version doit rester capable de lire les données des versions
précédentes. Avant un retour arrière vers une version plus ancienne, restaurer la sauvegarde faite avant la mise à jour.
