# Leeru Kocc — Site + activation Wolof Express

Ce dossier contient le site vitrine complet et le système d'activation
par code pour l'appli audio Wolof Express.

## Contenu

```
index.html              Accueil
catalogue.html           Catalogue des livres
a-propos.html            À propos de Leeru Kocc
contact.html              Formulaire de contact
wolof-express.html        Page produit + activation par code
assets/style.css          Feuille de style commune
assets/script.js          Menu mobile
netlify/functions/verify-code.js   Vérification des codes (backend)
netlify.toml               Configuration Netlify
```

## Étape 1 — Réserver le nom de domaine

Chez un registraire (OVH, Namecheap, Gandi...). Une fois réservé, vous
le brancherez sur Netlify à l'étape 4.

## Étape 2 — Créer la base Airtable

1. Créez un compte sur airtable.com (gratuit)
2. Créez une base nommée par exemple "Wolof Express — Codes"
3. Importez le fichier `wolof-express-codes.xlsx` déjà généré
   (onglet "Tous les codes") — Airtable accepte l'import direct d'un .xlsx
4. Vérifiez que les colonnes s'appellent exactement :
   `Code`, `Statut`, `Email acheteur`, `Date d'activation`
   (Statut doit contenir soit "Non utilisé" soit "Utilisé")
5. Récupérez :
   - l'**ID de la base** (dans l'URL : `airtable.com/appXXXXXXXXXXXXXX/...`
     → c'est le `appXXXXXXXXXXXXXX`)
   - un **Personal Access Token** (Compte → Developer Hub → créez un
     token avec accès lecture/écriture sur cette base)

## Étape 3 — Héberger l'appli audio elle-même

Le fichier `wolof-express-audio.html` (13 Mo, avec l'audio intégré)
doit être déposé quelque part accessible par lien direct — par exemple
dans un dossier `/app/` à la racine de ce même site Netlify.

## Étape 4 — Déployer sur Netlify

1. Créez un compte sur netlify.com (gratuit)
2. "Add new site" → "Deploy manually" → glissez-déposez ce dossier
   complet (ou connectez-le à un dépôt GitHub pour des mises à jour
   plus faciles)
3. Une fois déployé, allez dans **Site settings → Environment variables**
   et ajoutez :

   | Variable | Valeur |
   |---|---|
   | `AIRTABLE_API_KEY` | votre Personal Access Token |
   | `AIRTABLE_BASE_ID` | l'ID de la base (appXXXXXXXXXXXXXX) |
   | `AIRTABLE_TABLE` | `Tous les codes` |
   | `APP_DOWNLOAD_URL` | `/app/wolof-express-audio.html` |

4. Redéployez le site (Deploys → Trigger deploy) pour que les
   variables soient prises en compte

## Étape 5 — Brancher le nom de domaine

Site settings → Domain management → Add custom domain → suivez les
instructions Netlify pour pointer votre domaine vers le site.

## Tester

Une fois en ligne, ouvrez `wolof-express.html`, entrez un des 500 codes
générés, et vérifiez que :
- le code passe de "Non utilisé" à "Utilisé" dans Airtable
- un second essai avec le même code est bien refusé
- le lien vers l'appli s'affiche après validation
