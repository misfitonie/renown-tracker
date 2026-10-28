# Comptes et synchronisation (Supabase)

L'app fonctionne sans backend tant que les variables Supabase ne sont pas définies (mode local, comme avant).
Avec elles, on peut se connecter (Google ou email + mot de passe) et retrouver ses profils sur tous ses appareils.

Aucun secret n'est stocké dans le repo : la clé utilisée par l'app est la clé **publishable** (publique par conception),
la sécurité repose sur les règles RLS de la table `players`.

## 1. Créer le projet Supabase

1. Sur <https://supabase.com/dashboard>, **New project** (offre gratuite). Région conseillée : `West EU (Paris)`.
   Garde le mot de passe de la base dans ton gestionnaire de mots de passe (l'app n'en a pas besoin).
2. **SQL Editor** → **New query** → colle le contenu de [`supabase/migrations/0001_players.sql`](../supabase/migrations/0001_players.sql) → **Run**,
   puis de même avec [`0002_one_profile_per_account.sql`](../supabase/migrations/0002_one_profile_per_account.sql).
3. **Table Editor** : vérifie que la table `players` existe avec le badge **RLS enabled**.

## 2. Email + mot de passe

Activé par défaut (**Authentication → Sign In / Providers → Email**). Laisse **Confirm email** activé.

> Le service d'email intégré de Supabase est limité (quelques emails par heure, et seulement vers les adresses
> des membres de l'équipe du projet). Pour ouvrir l'inscription à d'autres personnes, configure un SMTP
> (ex. Resend, gratuit) dans **Authentication → Emails → SMTP Settings**.

## 3. Connexion Google

1. Dans la [Google Cloud Console](https://console.cloud.google.com/), crée (ou choisis) un projet.
2. **Google Auth Platform → Branding** : nom de l'app, email de support, puis **Audience** : type *External*.
   Tant que l'app est en mode *Testing*, ajoute ton adresse Gmail dans **Test users** (ou clique **Publish app**).
3. **Google Auth Platform → Clients → Create client** → type **Web application** :
   - **Authorized JavaScript origins** : `https://<ton-domaine-vercel>` et `http://localhost:5173`
   - **Authorized redirect URIs** : `https://<project-ref>.supabase.co/auth/v1/callback`
     (l'URL exacte est affichée dans Supabase, sur la page du provider Google)
4. Copie le **Client ID** et le **Client secret**.
5. Supabase → **Authentication → Sign In / Providers → Google** : active, colle l'ID et le secret, **Save**.
   (Le secret reste dans Supabase, jamais dans le repo ni dans Vercel.)

## 4. URLs de redirection

Supabase → **Authentication → URL Configuration** :

- **Site URL** : `https://<ton-domaine-vercel>` (ex. `https://renown-tracker.vercel.app`)
- **Redirect URLs** (bouton *Add URL*) :
  - `https://<ton-domaine-vercel>/**`
  - `https://renown-tracker-*-misfitonies-projects.vercel.app/**` (previews des PR)
  - `http://localhost:5173/**`

## 5. Variables d'environnement

Dans Supabase → **Project Settings → API Keys** (et **Data API** pour l'URL), récupère :

- l'URL du projet : `https://<project-ref>.supabase.co`
- la clé **Publishable** (`sb_publishable_…`). ⚠️ Jamais la clé *secret* / *service_role*.

**Vercel** → projet `renown-tracker` → **Settings → Environment Variables**, pour *Production* et *Preview* :

| Nom | Valeur |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

Puis **Deployments → Redeploy** : les variables `VITE_*` sont intégrées au moment du build.

En local : `cp .env.example .env.local` et remplis les deux valeurs (`.env.local` est ignoré par git).

## Fonctionnement

- **Table `players`** : une seule ligne par compte (`user_id`, `id`, `data` JSON du profil complet, `updated_at`),
  garantie par la contrainte `players_one_per_account` (migration `0002_one_profile_per_account.sql`).
  Les règles RLS limitent chaque compte à ses propres lignes.
- **Cache local par compte** (`renown-tracker:account:<userId>`) : l'app s'affiche immédiatement et fonctionne hors ligne.
  Le profil modifié est marqué « en attente » (`dirty`) et envoyé ~1,5 s après la dernière action, au retour du réseau,
  au retour sur l'onglet et toutes les minutes.
- **Conflits** : à chaque synchro, l'app récupère d'abord le profil du serveur. La version modifiée le plus
  récemment gagne (`updatedAt`).
- **Migration** : à la première connexion sur un appareil, le profil du mode sans compte (clé `renown-tracker`)
  est rattaché au compte si celui-ci n'a pas encore de profil. Si le compte en a déjà un, c'est celui du compte
  qui est gardé. Dans les deux cas, une copie du profil sans compte reste dans `renown-tracker-guest-backup`.
  Un profil local écarté à la synchro est aussi copié dans `renown-tracker-profiles-backup`.
- **Mode sans compte** : toujours disponible depuis l'écran de connexion, données uniquement sur l'appareil.
- **Déconnexion** : supprime le cache du compte sur l'appareil (avec confirmation s'il reste des changements non envoyés).
