# Pulse — Application de gestion sportive

Application web pour gérer les cours, réservations et cotisations d'une association sportive.

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styles** : Tailwind CSS
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth
- **Paiements** : Stripe (abonnements + paiements uniques)

## Rôles

| Rôle | Accès |
|------|-------|
| `admin` | Tout : utilisateurs, cours, séances, paiements |
| `coach` | Créer des séances, voir son planning |
| `adherent` | Voir le planning, réserver, gérer son adhésion |

## Formules d'adhésion

- **À la séance** : 12€ par séance (paiement unique Stripe)
- **Mensuel** : 45€/mois (abonnement Stripe récurrent)
- **Annuel** : 400€/an (abonnement Stripe récurrent)

## Installation

### 1. Cloner et installer

```bash
cd pulse
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
# Remplir les valeurs dans .env.local
```

### 3. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans Supabase Studio → SQL Editor :
   - Exécuter `supabase/schema.sql`
   - Exécuter `supabase/seed.sql` (données de démo)
3. Copier les clés API dans `.env.local`

### 4. Configurer Stripe

1. Créer un compte sur [stripe.com](https://stripe.com)
2. Récupérer les clés API (Dashboard → Developers → API keys)
3. *(Optionnel)* Créer les prix récurrents dans Stripe Dashboard :
   - Prix mensuel → copier l'ID dans `STRIPE_PRICE_MONTHLY`
   - Prix annuel → copier l'ID dans `STRIPE_PRICE_YEARLY`
   - Si non configurés, les prix sont créés dynamiquement (mode test)
4. Configurer le webhook :
   ```bash
   # En développement avec Stripe CLI
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # Copier le webhook secret dans STRIPE_WEBHOOK_SECRET
   ```

### 5. Lancer l'application

```bash
npm run dev
# http://localhost:3000
```

## Structure du projet

```
pulse/
├── app/
│   ├── (auth)/              # Login, inscription
│   ├── (app)/               # App authentifiée
│   │   ├── tableau-de-bord/ # Dashboard
│   │   ├── planning/        # Calendrier hebdomadaire
│   │   ├── mes-reservations/# Réservations (adhérent)
│   │   ├── adhesion/        # Cotisation & paiement (adhérent)
│   │   ├── mon-planning/    # Planning du coach
│   │   └── admin/           # Administration
│   └── api/                 # API routes
├── components/
│   ├── layout/              # Sidebar, Header
│   └── planning/            # Calendrier, modales
├── lib/
│   ├── supabase/            # Clients Supabase
│   ├── stripe.ts            # Config Stripe
│   └── utils.ts             # Utilitaires
├── types/                   # Types TypeScript
└── supabase/                # Schema SQL
```

## Premier admin

Après inscription, pour nommer un utilisateur admin, exécuter dans Supabase SQL Editor :

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'votre@email.fr';
```

## Déploiement (Vercel)

```bash
# Déployer sur Vercel
npx vercel

# Configurer les variables d'environnement dans le dashboard Vercel
# Mettre à jour NEXT_PUBLIC_APP_URL avec votre URL de production
# Mettre à jour le webhook Stripe avec l'URL de production
```
