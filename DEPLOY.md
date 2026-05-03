# Déploiement BioTracker

## Prérequis
- Node.js 18+
- Un serveur Linux/VPS avec stockage persistant (pour SQLite)

## Variables d'environnement
Copier `.env.example` vers `.env.local` et remplir :
```
NEXTAUTH_URL=https://votre-domaine.com
NEXTAUTH_SECRET=<clé aléatoire 32+ caractères>
ADMIN_EMAIL=email-admin@votre-domaine.com
```

Pour générer un secret fort :
```bash
openssl rand -base64 32
```

## Build & démarrage
```bash
npm install
npm run build
npm start
```

## Compte admin
Le premier compte créé avec l'email défini dans `ADMIN_EMAIL` reçoit automatiquement le rôle `admin`.
Pour créer le compte admin, utilisez la page `/auth/register`.

## Données
Les données SQLite sont stockées dans `data/biotracker.db`.
Sauvegarder ce fichier régulièrement.

## Processus manager (PM2)
```bash
npm install -g pm2
pm2 start npm --name "biotracker" -- start
pm2 save
pm2 startup
```
