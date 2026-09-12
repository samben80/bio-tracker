# Synthèse Communauté — WhatsApp parents

Outil autonome (un seul fichier `index.html`) pour **synthétiser les discussions
des groupes WhatsApp de parents d'élèves** et repérer d'un coup d'œil les sujets
**urgents, sensibles et importants** de chaque groupe-classe.

## Confidentialité

Tout se passe **dans votre navigateur**. Aucun message, aucun nom, aucun fichier
n'est envoyé sur un serveur. Vous pouvez ouvrir la page hors ligne.

## Utilisation

1. Dans WhatsApp, pour chaque groupe :
   **Groupe → ⋮ (Plus) → Exporter la discussion → Sans les médias** → un fichier `.txt`.
2. Ouvrez `index.html` (double-clic) dans un navigateur.
3. Glissez-y les fichiers `.txt` (un par groupe) ou cliquez sur **Ajouter des fichiers**.
4. Consultez la file **« À traiter en priorité »**, la répartition par sujet et la
   fiche de chaque groupe, puis **Copiez la synthèse** pour la partager.

Un **jeu d'exemple fictif** est chargé au démarrage pour montrer le résultat.

## Ce que l'outil détecte

Classement automatique par mots-clés (français) en catégories :
Urgent · Sensible/Sécurité · Réunion/Date · Absence/Santé · Paiement/Argent ·
Scolaire/Devoirs · Plainte/Conflit, plus les **questions** en attente de réponse.

> ⚠️ Analyse indicative par mots-clés : vérifiez toujours les messages d'origine
> avant d'agir sur un sujet urgent ou sensible.

## Limites

- WhatsApp ne fournit **pas** d'API pour lire automatiquement des groupes tiers ;
  l'export manuel est la seule voie fiable et conforme aux conditions d'utilisation.
- Le classement repose sur des mots-clés, pas sur une compréhension fine du contexte.
