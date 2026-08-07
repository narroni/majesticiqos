# Project Blueprint — Premium IQOS Accessories Store (Kosovo & Balkans)

**Working codename:** `EMBER` (placeholder brand name — see §14 Naming & Legal)
**Document version:** 1.0 — Architecture, Product & Design Specification
**Status:** Pre-development. No code to be written until this document is approved.

---

## 0. Executive Summary

We are building a **guest-checkout, catalog-driven ecommerce storefront** for heated-tobacco accessories (cases, covers, cleaning tools, chargers, lanyards, holders), serving Kosovo, Albania and North Macedonia, with a bilingual (SQ/EN) interface and a private admin dashboard for the seller.

The commercial model is deliberately **low-friction and offline-completed**: the customer never registers, never pays online. They submit a structured order; the seller calls them to confirm; fulfilment happens via local courier with cash on delivery. The software's job is to make that handoff feel _premium and inevitable_, not improvised.

Three things define success:

1. **Perceived brand quality.** The visual bar is a streetwear drop page, not a Shopify template. This is the primary competitive advantage in a market where rivals sell through Instagram DMs.
2. **Order integrity.** Every submitted order must reach the seller, with correct pricing, a reachable phone number, and an unambiguous status trail.
3. **Operability by one person.** The seller is likely non-technical. The admin panel must be usable on a phone, in Albanian, at 11pm.

**Key architectural decision:** Next.js App Router + Supabase, with **all writes routed through server-side code** (Server Actions / Route Handlers) using the service role key. The browser never talks to the database directly. This gives us one place to validate, one place to price, and a dramatically smaller RLS surface to reason about.

---

## 1. System Architecture

### 1.1 High-level topology

```
                          ┌─────────────────────────────┐
                          │        Vercel Edge          │
                          │  CDN · Image Opt · Caching  │
                          └──────────────┬──────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        │                    Next.js 15 (App Router)                      │
        │                                                                 │
        │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
        │  │  Storefront      │  │  Admin (/admin)  │  │ Route Handlers│  │
        │  │  RSC, mostly     │  │  Client-heavy,   │  │ /api/*        │  │
        │  │  static/ISR      │  │  auth-gated      │  │ webhooks, ISR │  │
        │  │  [locale] routes │  │  no-store        │  │ revalidation  │  │
        │  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
        │           │                     │                    │          │
        │  ┌────────┴─────────────────────┴────────────────────┴───────┐  │
        │  │  Server Actions + Data Access Layer (server-only)         │  │
        │  │  Zod validation · price recomputation · rate limiting     │  │
        │  └────────────────────────────┬─────────────────────────────┘  │
        └───────────────────────────────┼────────────────────────────────┘
                                        │  (service role — server only)
        ┌───────────────────────────────┴────────────────────────────────┐
        │                          Supabase                              │
        │  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐  │
        │  │ PostgreSQL │  │  Storage   │  │   Auth   │  │  Realtime  │  │
        │  │ + RLS      │  │ product-   │  │  admin   │  │ (new order │  │
        │  │ + triggers │  │ images     │  │  users   │  │  pings)    │  │
        │  └────────────┘  └────────────┘  └──────────┘  └────────────┘  │
        └────────────────────────────────────────────────────────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       │  Side channels (Phase 2+)       │
                       │  · Telegram/WhatsApp order ping │
                       │  · Resend (order copy to seller)│
                       │  · Vercel Analytics / Plausible │
                       └─────────────────────────────────┘
```

### 1.2 Rendering strategy per surface

| Surface                                      | Strategy                           | Cache                                 | Rationale                                      |
| -------------------------------------------- | ---------------------------------- | ------------------------------------- | ---------------------------------------------- |
| Home `/[locale]`                             | RSC + ISR                          | `revalidate: 300`, tag `home`         | Hero + featured change rarely; must be instant |
| Products list `/[locale]/products`           | RSC, dynamic on searchParams       | `revalidate: 60`, tag `products`      | Filters change URL; cheap queries              |
| Product detail `/[locale]/products/[slug]`   | RSC + ISR + `generateStaticParams` | `revalidate: 300`, tag `product:{id}` | SEO-critical, highest traffic                  |
| Categories `/[locale]/categories/[slug]`     | RSC + ISR                          | tag `category:{id}`                   | Same as above                                  |
| Cart `/[locale]/cart`                        | Client component                   | `no-store`                            | Purely local state                             |
| Checkout `/[locale]/checkout`                | Client form + Server Action        | `no-store`                            | Never cached                                   |
| Order confirmation `/[locale]/order/[token]` | RSC, dynamic                       | `no-store`                            | Contains customer data                         |
| Admin `/admin/**`                            | Client + Server Actions            | `no-store`, `noindex`                 | Always fresh, never cached                     |

**Cache invalidation:** every admin mutation calls `revalidateTag()` for the affected entities. A product edit revalidates `product:{id}`, `products`, and — if featured — `home`. This is explicit and must be centralised in the DAL, never scattered.

### 1.3 The Data Access Layer (non-negotiable)

All database access lives in `src/lib/data/*` and `src/lib/actions/*`, both marked `import 'server-only'`. Rules:

- **No Supabase client is ever instantiated in a Client Component.**
- Two clients exist: `createPublicClient()` (anon key, read-only paths) and `createAdminClient()` (service role, server-only, never imported into anything that touches `'use client'`).
- Every Server Action begins with: (1) Zod parse of input, (2) auth/authorisation check where relevant, (3) rate-limit check, and only then touches the database.
- **Prices are never trusted from the client.** The checkout action receives `[{productId, quantity}]` and nothing else. Unit price, discount, shipping and total are all recomputed server-side from the database at submission time.

### 1.4 Cart architecture

Cart is **client-side only**, persisted to `localStorage` under a versioned key (`cart:v1`). No cart table, no session table, no server round-trip until checkout.

- State: Zustand store with `persist` middleware.
- Hydration: cart renders skeleton until mounted to avoid SSR mismatch.
- **Reconciliation on load and on checkout entry:** the stored cart holds only `{productId, variantId?, quantity}` plus a cached display snapshot. On mount, the cart page fetches current product state and flags: price changed, out of stock, product deleted. The user sees a clear diff, not a silent correction.
- Quantities clamp to available stock at reconciliation time.

**Why not a server cart:** guest checkout with no accounts means server carts require anonymous session cookies, a cleanup job, and give us nothing except abandoned-cart data we can't act on without an email address. Revisit in Phase 4 if abandoned-cart recovery via SMS becomes viable.

### 1.5 Environment & configuration

| Variable                                  | Scope           | Notes                                                    |
| ----------------------------------------- | --------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                | client          | safe                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`           | client          | safe, RLS-guarded                                        |
| `SUPABASE_SERVICE_ROLE_KEY`               | **server only** | never prefixed `NEXT_PUBLIC_`                            |
| `ADMIN_ALLOWED_EMAILS`                    | server          | comma-separated allowlist, belt-and-braces over DB roles |
| `RATE_LIMIT_REDIS_URL` / token            | server          | Upstash, Phase 2                                         |
| `RESEND_API_KEY`                          | server          | seller notification, Phase 2                             |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | server          | order ping, Phase 2                                      |
| `NEXT_PUBLIC_SITE_URL`                    | client          | canonical URLs, sitemap                                  |

Three Supabase projects is overkill for this scale; use **two**: `production` and `development`. Migrations are files in `supabase/migrations/`, applied via CLI, committed to git. Never edit schema through the Supabase dashboard once Phase 1 ends.

---

## 2. Database Schema

### 2.1 Design principles

1. **Money is stored as integer minor units** (`price_cents INTEGER`), never `float`. Display currency is EUR throughout v1.
2. **Localised text lives in dedicated translation tables**, not JSONB columns. This keeps queries indexable, makes "which products are missing Albanian copy?" a trivial query, and scales cleanly to a third language.
3. **Orders are immutable snapshots.** `order_items` stores the product name, price and discount _as they were at purchase time_. Deleting a product must never mutate order history.
4. **Soft deletes for products** (`deleted_at`), hard deletes for nothing that an order references.
5. Every table gets `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at`, `updated_at` (trigger-maintained).

### 2.2 Enums

```
order_status    : pending | confirmed | preparing | shipped | completed | cancelled
country_code    : XK | AL | MK | OTHER
admin_role      : owner | staff
stock_status    : in_stock | low_stock | out_of_stock   -- derived, not stored
locale          : sq | en
```

### 2.3 Tables

#### `categories`

| Column                      | Type                 | Notes                                              |
| --------------------------- | -------------------- | -------------------------------------------------- |
| `id`                        | uuid PK              |                                                    |
| `slug`                      | text UNIQUE NOT NULL | URL-safe, locale-independent (`cases`, `chargers`) |
| `image_url`                 | text NULL            | category tile art                                  |
| `sort_order`                | int DEFAULT 0        | manual ordering in nav                             |
| `is_active`                 | bool DEFAULT true    |                                                    |
| `created_at` / `updated_at` | timestamptz          |                                                    |

#### `category_translations`

| Column        | Type                                   | Notes |
| ------------- | -------------------------------------- | ----- |
| `id`          | uuid PK                                |       |
| `category_id` | uuid FK → categories ON DELETE CASCADE |       |
| `locale`      | locale NOT NULL                        |       |
| `name`        | text NOT NULL                          |       |
| `description` | text NULL                              |       |
|               | UNIQUE(`category_id`, `locale`)        |       |

#### `products`

| Column                      | Type                                    | Notes                                         |
| --------------------------- | --------------------------------------- | --------------------------------------------- |
| `id`                        | uuid PK                                 |                                               |
| `slug`                      | text UNIQUE NOT NULL                    |                                               |
| `sku`                       | text UNIQUE NULL                        | seller's internal code                        |
| `category_id`               | uuid FK → categories ON DELETE SET NULL |                                               |
| `price_cents`               | int NOT NULL CHECK (> 0)                | base price, EUR                               |
| `discount_price_cents`      | int NULL CHECK (> 0 AND < price_cents)  | if set, this is the sell price                |
| `stock_quantity`            | int NOT NULL DEFAULT 0 CHECK (>= 0)     |                                               |
| `low_stock_threshold`       | int NOT NULL DEFAULT 3                  | drives "Only 2 left" badge                    |
| `track_inventory`           | bool DEFAULT true                       | false = always purchasable                    |
| `is_active`                 | bool DEFAULT true                       | hidden from storefront when false             |
| `is_featured`               | bool DEFAULT false                      | homepage carousel                             |
| `sales_count`               | int DEFAULT 0                           | incremented on order confirm → "best sellers" |
| `deleted_at`                | timestamptz NULL                        | soft delete                                   |
| `created_at` / `updated_at` | timestamptz                             |                                               |

Indexes: `(category_id) WHERE deleted_at IS NULL`, `(is_featured) WHERE is_active AND deleted_at IS NULL`, `(sales_count DESC)`, `(created_at DESC)`.

#### `product_translations`

| Column                            | Type                                 | Notes                       |
| --------------------------------- | ------------------------------------ | --------------------------- |
| `id`                              | uuid PK                              |                             |
| `product_id`                      | uuid FK → products ON DELETE CASCADE |                             |
| `locale`                          | locale NOT NULL                      |                             |
| `name`                            | text NOT NULL                        |                             |
| `short_description`               | text NULL                            | card + meta description     |
| `description`                     | text NULL                            | markdown-lite, product page |
| `meta_title` / `meta_description` | text NULL                            | SEO override                |
| `search_vector`                   | tsvector GENERATED                   | see §2.5                    |
|                                   | UNIQUE(`product_id`, `locale`)       |                             |

#### `product_images`

| Column              | Type                                 | Notes                               |
| ------------------- | ------------------------------------ | ----------------------------------- |
| `id`                | uuid PK                              |                                     |
| `product_id`        | uuid FK → products ON DELETE CASCADE |                                     |
| `storage_path`      | text NOT NULL                        | path inside `product-images` bucket |
| `alt_sq` / `alt_en` | text NULL                            | accessibility + SEO                 |
| `sort_order`        | int DEFAULT 0                        | first = primary                     |
| `width` / `height`  | int NULL                             | prevents layout shift               |
| `blur_data_url`     | text NULL                            | base64 LQIP, generated on upload    |

#### `orders`

| Column                                                          | Type                                    | Notes                                                                 |
| --------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `id`                                                            | uuid PK                                 |                                                                       |
| `order_number`                                                  | text UNIQUE NOT NULL                    | human-readable, e.g. `EMB-2026-0142`, from a sequence                 |
| `public_token`                                                  | uuid UNIQUE DEFAULT gen_random_uuid()   | unguessable confirmation-page key                                     |
| `first_name`                                                    | text NOT NULL                           |                                                                       |
| `last_name`                                                     | text NOT NULL                           |                                                                       |
| `phone`                                                         | text NOT NULL                           | stored E.164, e.g. `+38344123456`                                     |
| `phone_country`                                                 | text NOT NULL                           | dial-code region for display                                          |
| `email`                                                         | text NULL                               | **optional**, never required                                          |
| `address_line`                                                  | text NOT NULL                           |                                                                       |
| `city`                                                          | text NOT NULL                           |                                                                       |
| `postal_code`                                                   | text NULL                               | optional — inconsistently used in the region                          |
| `country`                                                       | country_code NOT NULL                   |                                                                       |
| `customer_note`                                                 | text NULL                               | free text, max 500 chars                                              |
| `subtotal_cents`                                                | int NOT NULL                            | sum of order_items line totals                                        |
| `shipping_cents`                                                | int NOT NULL                            | server-computed from country                                          |
| `total_cents`                                                   | int NOT NULL                            | subtotal + shipping                                                   |
| `currency`                                                      | text NOT NULL DEFAULT 'EUR'             |                                                                       |
| `status`                                                        | order_status NOT NULL DEFAULT 'pending' |                                                                       |
| `locale`                                                        | locale NOT NULL                         | language the customer ordered in — seller calls them in that language |
| `admin_note`                                                    | text NULL                               | internal only, never exposed                                          |
| `ip_hash`                                                       | text NULL                               | salted hash, abuse throttling only                                    |
| `user_agent`                                                    | text NULL                               |                                                                       |
| `confirmed_at` / `shipped_at` / `completed_at` / `cancelled_at` | timestamptz NULL                        |                                                                       |
| `created_at` / `updated_at`                                     | timestamptz                             |                                                                       |

Indexes: `(status, created_at DESC)`, `(created_at DESC)`, `(phone)`.

#### `order_items` — immutable snapshot

| Column                                | Type                                  | Notes                                     |
| ------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `id`                                  | uuid PK                               |                                           |
| `order_id`                            | uuid FK → orders ON DELETE CASCADE    |                                           |
| `product_id`                          | uuid FK → products ON DELETE SET NULL | reference only                            |
| `product_name_sq` / `product_name_en` | text NOT NULL                         | **snapshot**                              |
| `product_slug`                        | text NOT NULL                         | snapshot, for admin linking               |
| `image_url`                           | text NULL                             | snapshot                                  |
| `unit_price_cents`                    | int NOT NULL                          | **price actually charged**                |
| `original_price_cents`                | int NULL                              | if discounted, records the strike-through |
| `quantity`                            | int NOT NULL CHECK (> 0)              |                                           |
| `line_total_cents`                    | int NOT NULL                          | unit × qty                                |

#### `admin_users`

| Column          | Type                                             | Notes                                     |
| --------------- | ------------------------------------------------ | ----------------------------------------- |
| `id`            | uuid PK, FK → `auth.users(id)` ON DELETE CASCADE | 1:1 with Supabase Auth                    |
| `email`         | text NOT NULL                                    | mirrored for display                      |
| `full_name`     | text NULL                                        |                                           |
| `role`          | admin_role NOT NULL DEFAULT 'staff'              |                                           |
| `is_active`     | bool DEFAULT true                                | instant revoke without deleting auth user |
| `last_login_at` | timestamptz NULL                                 |                                           |

Membership in this table **is** the authorisation grant. A `auth.users` row with no `admin_users` row has zero access.

#### `shipping_rates`

| Column                          | Type                         | Notes                               |
| ------------------------------- | ---------------------------- | ----------------------------------- |
| `id`                            | uuid PK                      |                                     |
| `country`                       | country_code UNIQUE NOT NULL |                                     |
| `rate_cents`                    | int NOT NULL                 | XK=200, AL=500, MK=500, OTHER=500   |
| `free_shipping_threshold_cents` | int NULL                     | e.g. 3000 → free over €30 (Phase 2) |
| `is_active`                     | bool DEFAULT true            |                                     |

Seeding shipping as **data, not a constant**, means the seller can run "free delivery in Kosovo this weekend" without a deploy. This is the single highest-leverage table in the schema.

#### `ui_translations` (optional, Phase 3)

| Column   | Type                | Notes                  |
| -------- | ------------------- | ---------------------- |
| `key`    | text NOT NULL       | e.g. `checkout.submit` |
| `locale` | locale NOT NULL     |                        |
| `value`  | text NOT NULL       |                        |
|          | PK(`key`, `locale`) |                        |

**Not used in v1.** Static UI strings live in JSON files (§8). This table exists only if the seller later wants to edit banner/promo copy without a deploy — and even then it should be scoped to a small set of editable keys, not the whole UI.

#### `audit_log` (Phase 2)

`id`, `admin_user_id`, `action` (`product.create`, `order.status_change`…), `entity_type`, `entity_id`, `diff` jsonb, `created_at`. Cheap insurance once more than one person has admin access.

### 2.4 Relationships

```
categories 1──n category_translations
categories 1──n products
products   1──n product_translations
products   1──n product_images
products   1──n order_items          (SET NULL — history survives deletion)
orders     1──n order_items
auth.users 1──1 admin_users
shipping_rates ──(country)── orders  (lookup at write time, value snapshotted)
```

### 2.5 Search

Full-text search via a generated `tsvector` on `product_translations`:

```
search_vector := setweight(to_tsvector('simple', coalesce(name,'')), 'A')
              || setweight(to_tsvector('simple', coalesce(short_description,'')), 'B')
              || setweight(to_tsvector('simple', coalesce(description,'')), 'C')
```

Use the `simple` dictionary — Postgres has no Albanian stemmer, and `english` stemming would mangle Albanian tokens. Add a GIN index on `search_vector` and a `pg_trgm` GIN index on `name` for typo tolerance (`përkulje` vs `perkulje` — diacritic-insensitivity matters enormously here; also store an `unaccent`-normalised name column and search both).

**This diacritic issue is a real risk:** Albanian users frequently type `e` for `ë` and `c` for `ç`. Search must handle it or it will feel broken.

### 2.6 Row Level Security

RLS is enabled on **every** table. Policy summary:

| Table                                                | anon (public)                                   | authenticated admin           | service_role |
| ---------------------------------------------------- | ----------------------------------------------- | ----------------------------- | ------------ |
| `products`, `product_translations`, `product_images` | SELECT where `is_active AND deleted_at IS NULL` | SELECT all                    | full         |
| `categories`, `category_translations`                | SELECT where `is_active`                        | SELECT all                    | full         |
| `shipping_rates`                                     | SELECT where `is_active`                        | SELECT all                    | full         |
| `orders`, `order_items`                              | **none**                                        | SELECT/UPDATE if `is_admin()` | full         |
| `admin_users`                                        | **none**                                        | SELECT own row                | full         |

Helper function:

```
is_admin() → EXISTS (SELECT 1 FROM admin_users
                     WHERE id = auth.uid() AND is_active = true)
```

marked `SECURITY DEFINER`, `STABLE`, with `search_path = public` pinned.

Orders are inserted **only** via service role in a Server Action. There is no public INSERT policy on `orders` — this eliminates an entire category of order-spoofing attacks (fake totals, injected line items) by construction.

### 2.7 Triggers & functions

- `set_updated_at()` — BEFORE UPDATE on all tables.
- `generate_order_number()` — BEFORE INSERT on `orders`, format `EMB-{YYYY}-{padded sequence}`.
- `set_status_timestamps()` — BEFORE UPDATE on `orders`; stamps `confirmed_at`/`shipped_at`/etc. when status changes.
- `decrement_stock(order_id)` — called inside the checkout transaction, `SELECT ... FOR UPDATE` on each product row, raises if insufficient. **Stock decrements at order submission**, not at confirmation, to prevent overselling the last unit to three people in the same minute. Cancellation restores it.
- `increment_sales_count()` — AFTER UPDATE on `orders` when status → `completed`.

### 2.8 Storage

Bucket `product-images`, **public read**, no public write.
Path convention: `products/{product_id}/{uuid}.{ext}`.
Uploads go through a Server Action that: validates MIME by magic bytes (not extension), caps at 5 MB, converts to WebP + generates a 20px blur placeholder, then uploads with the service role. Direct client uploads are not permitted in v1.

---

## 3. Folder Structure

```
├── public/
│   ├── fonts/
│   └── og/                          # static OG fallbacks per locale
├── messages/
│   ├── sq.json                      # source of truth for UI copy
│   └── en.json
├── supabase/
│   ├── migrations/                  # timestamped, committed, never edited retroactively
│   └── seed.sql                     # categories + shipping_rates + demo products
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx           # locale provider, header, footer, cart drawer
│   │   │   ├── page.tsx             # HOME
│   │   │   ├── products/
│   │   │   │   ├── page.tsx         # catalog + filters (searchParams driven)
│   │   │   │   └── [slug]/page.tsx  # PDP
│   │   │   ├── categories/[slug]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── order/[token]/page.tsx   # confirmation
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── (legal)/
│   │   │   │   ├── terms/page.tsx
│   │   │   │   ├── privacy/page.tsx
│   │   │   │   └── shipping-returns/page.tsx
│   │   │   ├── not-found.tsx
│   │   │   └── error.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx           # auth guard + admin shell
│   │   │   ├── login/page.tsx       # OUTSIDE the guard
│   │   │   ├── page.tsx             # analytics overview
│   │   │   ├── products/
│   │   │   │   ├── page.tsx  new/page.tsx  [id]/edit/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx  [id]/page.tsx
│   │   │   └── settings/page.tsx    # shipping rates, store toggles
│   │   ├── api/
│   │   │   ├── revalidate/route.ts
│   │   │   └── health/route.ts
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── opengraph-image.tsx
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn primitives — unmodified except tokens
│   │   ├── layout/                  # Header, Footer, MobileNav, LocaleSwitcher, AnnouncementBar
│   │   ├── home/                    # Hero, FeaturedGrid, CategoryTiles, BestSellers,
│   │   │                            # BrandStory, WhyChooseUs, SocialWall
│   │   ├── product/                 # ProductCard, ProductGrid, Gallery, VariantPicker,
│   │   │                            # PriceTag, StockBadge, AddToCartButton, RelatedProducts
│   │   ├── catalog/                 # FilterSidebar, FilterSheet(mobile), SortSelect,
│   │   │                            # SearchInput, ActiveFilterChips, EmptyState
│   │   ├── cart/                    # CartDrawer, CartLineItem, QuantityStepper,
│   │   │                            # CartSummary, ShippingEstimator
│   │   ├── checkout/                # CheckoutForm, CountrySelect, PhoneField,
│   │   │                            # OrderSummary, SubmitBar
│   │   ├── admin/                   # StatCard, OrdersTable, OrderStatusSelect,
│   │   │                            # ProductForm, ImageUploader, CategoryManager,
│   │   │                            # DataTable, Charts
│   │   ├── motion/                  # Reveal, StaggerGroup, MagneticButton, MarqueeRow,
│   │   │                            # PageTransition, ParallaxImage
│   │   └── shared/                  # Container, SectionHeading, Price, Skeletons, SEOJsonLd
│   │
│   ├── lib/
│   │   ├── supabase/                # client.ts (anon) | admin.ts (service, server-only)
│   │   ├── data/                    # server-only READ functions
│   │   │   ├── products.ts  categories.ts  orders.ts  analytics.ts
│   │   ├── actions/                 # server-only WRITE functions ('use server')
│   │   │   ├── checkout.ts  product.ts  category.ts  order.ts  auth.ts  upload.ts
│   │   ├── validations/             # Zod schemas — shared client/server
│   │   │   ├── checkout.ts  product.ts  common.ts
│   │   ├── i18n/                    # config.ts, routing.ts, getMessages.ts
│   │   ├── pricing.ts               # single source of truth for money math
│   │   ├── shipping.ts              # country → rate resolution
│   │   ├── rate-limit.ts
│   │   ├── seo.ts                   # metadata + JSON-LD builders
│   │   ├── format.ts                # currency, phone, date formatting per locale
│   │   └── utils.ts                 # cn(), slugify(), unaccent()
│   │
│   ├── store/
│   │   └── cart.ts                  # Zustand + persist
│   ├── hooks/
│   │   ├── use-cart.ts  use-media-query.ts  use-debounce.ts  use-filters.ts
│   ├── types/
│   │   ├── database.ts              # GENERATED by supabase gen types — never hand-edited
│   │   └── index.ts                 # domain types derived from database.ts
│   ├── config/
│   │   ├── site.ts                  # name, socials, contact, nav
│   │   └── constants.ts
│   ├── styles/globals.css
│   └── middleware.ts                # locale detection/redirect + admin route protection
```

**Convention:** a component may import from `lib/data` or `lib/actions` **only** if it is a Server Component or is invoking a Server Action. ESLint boundary rules should enforce this — it is the easiest rule to accidentally break with AI-assisted coding.

---

## 4. Component Structure

### 4.1 Composition rules

- Default to **Server Components**. Add `'use client'` only where there is state, an event handler, or a browser API. In practice this means: cart, filters, gallery, forms, motion wrappers, admin tables.
- **Push `'use client'` to the leaves.** A product card is a Server Component; only its `<AddToCartButton>` is a client island. This keeps the catalog cheap.
- No component reaches for data itself; pages fetch and pass props down. One exception: `<RelatedProducts>` may be a self-fetching Server Component with `<Suspense>`.

### 4.2 Key component contracts

**`<ProductCard>`** — the most-repeated element on the site; it carries the brand.

```
props: { product: ProductCardData, locale, priority?: boolean, layout?: 'grid'|'wide' }
```

Anatomy: 4:5 image container with `object-cover`, second image cross-fades on hover (desktop only), category eyebrow, name (2-line clamp), price with strike-through when discounted, discount badge top-left, stock badge top-right, quick-add button that slides up on hover / is always visible on touch. Whole card is one link; the add button uses `stopPropagation`.

**`<ProductGallery>`** — mobile: full-bleed swipe carousel with dot indicators. Desktop: vertical thumbnail rail left, main image right, cursor-follow zoom on hover, click opens a lightbox. First image `priority`, rest lazy, all with `blur_data_url`.

**`<CheckoutForm>`** — react-hook-form + `zodResolver`, sharing the exact Zod schema the Server Action uses. Country select drives a live shipping recalculation in the sticky order summary. Submit button is disabled while pending and shows a spinner; the form is also guarded against double-submit server-side via an idempotency key generated on mount.

**`<OrdersTable>` (admin)** — mobile-first: renders as stacked cards below `md`, as a table above. Each row: order number, customer name, phone (tap-to-call `tel:` link — the seller _will_ use this), item count, total, status pill, relative time. Status changes inline via a select; optimistic update with rollback on failure.

**`<Reveal>`** — the single motion primitive used everywhere. Wraps children, animates `opacity 0→1, y 24→0` on viewport entry, `once: true`, respects `prefers-reduced-motion` by rendering statically. Every section uses this rather than bespoke variants — consistency reads as intentional; variety reads as noise.

### 4.3 shadcn/ui components to install

`button, card, input, textarea, label, select, checkbox, radio-group, dialog, sheet, drawer, dropdown-menu, popover, tabs, table, badge, separator, skeleton, sonner (toast), form, accordion, alert-dialog, avatar, pagination, scroll-area, tooltip, slider`

Restyle tokens in `globals.css`; do not fork component internals unless unavoidable. Forked shadcn components are the #1 source of drift in AI-built projects.

---

## 5. User Flows

### 5.1 Primary purchase flow

```
LAND (home / product link from Instagram / Google)
  │
  ├─ locale auto-detected → redirect to /sq (default) or /en
  │
BROWSE ─── home featured ──┐
  │                        ├──▶ PRODUCT DETAIL
  ├─ /products + filters ──┤        │
  └─ search ───────────────┘        │  view gallery, read description,
                                    │  check stock, select quantity
                                    ▼
                              ADD TO CART
                                    │  cart drawer slides in, item animates in,
                                    │  "Continue shopping" | "Go to cart"
                                    ▼
                                 CART PAGE
                                    │  adjust qty, remove, see subtotal
                                    │  country pre-selector → live shipping estimate
                                    ▼
                                 CHECKOUT
                                    │  first name, last name, phone, address,
                                    │  city, country, (optional note)
                                    │  sticky summary: subtotal + shipping + TOTAL
                                    │  payment method: Cash on delivery (stated clearly)
                                    ▼
                            [Server Action]
                            validate → recompute prices → check stock →
                            insert order + items (transaction) → decrement stock →
                            notify seller → clear cart → redirect
                                    ▼
                        /order/{public_token}  CONFIRMATION
                            "Porosia juaj është pranuar. Shitësi do t'ju
                             kontaktojë së shpejti për konfirmim."
                            + order number, items, total, expected call window
                            + "Save this page" / WhatsApp contact link
                                    ▼
                        [OFFLINE] Seller calls customer → confirms
                                    ▼
                        Admin marks Confirmed → Preparing → Shipped → Completed
```

### 5.2 Failure paths (must be designed, not bolted on)

| Situation                                 | Behaviour                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Item went out of stock while in cart      | Cart page flags it in red, disables checkout until removed or reduced                    |
| Price changed since adding                | Non-blocking notice: "Price updated", cart shows new price                               |
| Product deleted                           | Line item greyed with "No longer available", removable                                   |
| Checkout submitted but stock insufficient | Action returns field-level error naming the product; cart preserved                      |
| Network failure on submit                 | Toast + retry; idempotency key prevents duplicate orders                                 |
| Invalid phone                             | Inline validation before submit, with the expected format shown for the selected country |
| Empty cart at `/checkout`                 | Redirect to `/products` with a toast                                                     |

### 5.3 Language switching

The switcher swaps the locale segment while **preserving the current path and search params**. `/sq/products?category=cases&sort=price_asc` → `/en/products?category=cases&sort=price_asc`. Slugs are locale-independent, so no slug mapping table is needed — a deliberate simplification. Selection persists in a `NEXT_LOCALE` cookie (1 year).

### 5.4 Mobile-specific considerations

Realistically **80%+ of traffic will be mobile, arriving from Instagram's in-app browser.** That environment has quirks: no hover, aggressive back-gesture, occasionally broken `localStorage` in private mode, and a smaller effective viewport due to the app chrome.

Consequences: quick-add must be tap-visible not hover-visible; cart must degrade gracefully if `localStorage` throws; sticky add-to-cart bar on the PDP; `100dvh` never `100vh`; and the checkout form must not require pinch-zoom (16px minimum input font to prevent iOS auto-zoom).

---

## 6. Admin Flows

### 6.1 Authentication

```
/admin/* request
    ↓ middleware: session cookie present?
    NO → redirect /admin/login
    YES ↓
  admin layout (Server Component):
    getUser() from Supabase Auth
    ↓ verify admin_users row exists AND is_active
    NO → signOut + redirect to login with "Unauthorized"
    YES → render shell
```

Login is **email + password only**. No public sign-up route exists; the first admin is created manually via the Supabase dashboard, subsequent ones by an `owner` from `/admin/settings`. Add 2FA in Phase 3.

### 6.2 Product management flow

```
/admin/products
   list: thumbnail, name (SQ), category, price, discount, stock, active, featured
   inline toggles for is_active / is_featured (optimistic)
   search + filter by category/stock
        │
        ├── [+ New Product] ──▶ /admin/products/new
        │       Tab 1 — Albanian: name, short desc, description
        │       Tab 2 — English:  same (with "copy from Albanian" helper)
        │       Tab 3 — Pricing & Stock: price, discount, SKU, quantity, threshold
        │       Tab 4 — Media: drag-drop multi-upload, reorder, set primary, alt text
        │       Tab 5 — Organisation: category, featured, active
        │       Slug auto-generated from Albanian name, editable, uniqueness-checked live
        │       ▼ Save → Server Action → validate → insert product +
        │                 translations + images (transaction) → revalidateTag
        │
        ├── [Edit] ──▶ same form, prefilled
        └── [Delete] ──▶ AlertDialog → soft delete (deleted_at) → hidden from storefront,
                          order history intact
```

**Validation rule that matters:** a product cannot be set `is_active = true` unless it has at least one image and complete translations in **both** locales. Half-translated products are the most common way a bilingual store looks unprofessional; block it at the source.

### 6.3 Order management flow

```
/admin/orders
   default filter: status = pending, newest first
   tabs: All | Pending | Confirmed | Preparing | Shipped | Completed | Cancelled
   card/row: EMB-2026-0142 · Arta Krasniqi · +383 44 123 456 ·
             3 items · €24.00 · [Pending ▾] · 12 min ago
        │
        └──▶ /admin/orders/{id}
             ┌─ Customer: name, tap-to-call phone, WhatsApp deep link,
             │             full address, copy-address button, order language flag
             ├─ Items: image, name, unit price, qty, line total
             ├─ Totals: subtotal, shipping (with country), TOTAL
             ├─ Status timeline: visual stepper with timestamps
             ├─ [Change status ▾] → confirm dialog on Cancelled (restores stock)
             ├─ Internal note (admin only)
             └─ [Print / Save as PDF] — courier label & packing slip (Phase 2)
```

Status transitions are validated server-side: `pending → confirmed | cancelled`, `confirmed → preparing | cancelled`, `preparing → shipped | cancelled`, `shipped → completed`, `completed → ∅`, `cancelled → ∅`. Illegal transitions are rejected, not merely hidden in the UI.

### 6.4 Analytics overview (`/admin`)

Above the fold: **Pending orders** (largest, actionable, links to filtered list), Revenue today / this week / this month, Orders count with % change vs previous period, Low-stock alerts (products at or below threshold), Out-of-stock count.

Below: 30-day revenue line chart, top 5 products by units sold, orders by country donut, recent 10 orders. Charts via Recharts, all data from server-side aggregate queries (later, Postgres views).

### 6.5 Settings

Shipping rates per country (editable, with a preview of what the customer sees), free-shipping threshold, store-wide announcement bar text (SQ/EN), contact details and social links, admin user list with activate/deactivate.

---

## 7. Localization Strategy

### 7.1 Stack

**`next-intl`** with App Router integration. Chosen over `next-i18next` (Pages-Router-oriented) and hand-rolled solutions (no pluralisation, no type safety).

### 7.2 The two-layer model

| Layer               | Content                                                | Storage                  | Who edits        |
| ------------------- | ------------------------------------------------------ | ------------------------ | ---------------- |
| **Static UI**       | Buttons, labels, errors, section headings, legal pages | `messages/{locale}.json` | Developer        |
| **Dynamic content** | Product names/descriptions, category names             | `*_translations` tables  | Seller via admin |

Keeping these separate is deliberate. UI copy needs type safety and version control; product copy needs to be editable by a non-developer at midnight.

### 7.3 Routing

- Prefixed routing for both locales: `/sq/...` and `/en/...`. No unprefixed variant — it complicates canonicals and caching for no gain.
- **Default locale: `sq`** (Albanian). This is the home market; English is the secondary/diaspora/tourist locale.
- Root `/` redirects based on: cookie → `Accept-Language` → default `sq`.
- Middleware handles detection; `generateStaticParams` pre-renders both locales for all static routes.

### 7.4 Message file organisation

Namespaced by feature, mirroring component structure:

```
{
  "common":   { "addToCart": "Shto në shportë", "loading": "Duke u ngarkuar…" },
  "nav":      { "products": "Produktet", "categories": "Kategoritë" },
  "home":     { "hero": { "title": "...", "cta": "..." } },
  "product":  { "inStock": "Në gjendje", "lowStock": "Vetëm {count} të mbetura" },
  "cart":     { "empty": "Shporta juaj është e zbrazët" },
  "checkout": { "firstName": "Emri", "phone": "Numri i telefonit" },
  "order":    { "success": "Porosia juaj është pranuar. Shitësi do t'ju kontaktojë së shpejti për konfirmim." },
  "errors":   { "required": "Kjo fushë është e detyrueshme" },
  "seo":      { "home": { "title": "...", "description": "..." } }
}
```

Enable `next-intl`'s TypeScript augmentation so `t('checkout.firstName')` is autocompleted and a missing key is a **build error**, not a runtime `checkout.firstName` string leaking to a customer.

### 7.5 Formatting

- **Currency:** EUR everywhere in v1. Format with `Intl.NumberFormat(locale, {currency:'EUR'})` → `24,00 €` (sq) / `€24.00` (en). Note that Albania (ALL) and North Macedonia (MKD) do not use the euro — v1 prices in EUR and the seller settles the local-currency equivalent by phone. Multi-currency display is a Phase 4 item and needs an FX strategy, not just a formatter.
- **Phone:** stored E.164, displayed grouped per country. Dial codes: Kosovo `+383`, Albania `+355`, North Macedonia `+389`.
- **Dates:** `Intl.DateTimeFormat`, relative times ("12 minuta më parë") in admin.

### 7.6 Fonts and Albanian typography — a real constraint

Albanian requires **ë** and **ç** (Latin Extended-A). Many fashionable display fonts ship Latin-only subsets and will fall back mid-word, producing visibly mismatched glyphs in headings — which instantly destroys the premium feel.

**Rule: every font must be verified for `ë`, `Ë`, `ç`, `Ç` before selection.** Test string: `PËRKUJDESJE ÇANTA ËMBËLSIRË`. Self-host via `next/font/local` with `latin-ext` subset included; never rely on a CDN subset default.

### 7.7 SEO for bilingual content

- `hreflang` alternates on every page: `sq`, `en`, `x-default → sq`.
- Locale-specific `<title>` and `<meta description>` from `product_translations.meta_*`, falling back to the name + short description.
- Sitemap includes both locale variants of every URL.
- Canonical URL always points at the current locale's own URL.

### 7.8 Translation completeness guardrail

An admin dashboard widget listing "Products missing English translation" — one query against `product_translations`. Prevents the slow rot where the seller adds Albanian-only products for six months and the English site quietly becomes half-empty.

---

## 8. Security Considerations

### 8.1 Threat model

The realistic threats, in order of likelihood:

1. **Order spam** — bots or a bored competitor submitting hundreds of fake orders, poisoning the seller's workflow and (worse) decrementing real stock.
2. **Price manipulation** — client tampering with cart totals.
3. **Leaked service role key** — bundled into client JS by accident.
4. **Admin credential compromise** — weak password, no rate limiting on login.
5. **Customer PII exposure** — order data (name, phone, address) readable by anon.
6. **Malicious file upload** — disguised executable or SVG with embedded script.

### 8.2 Controls

**Price & total integrity.** The checkout Server Action accepts only `productId` + `quantity`. Everything else is derived server-side from the database. Even if the client posts `total_cents: 1`, it is ignored. _This is the single most important security decision in the project._

**Order spam.** Layered:

- Rate limit by hashed IP: 5 order submissions per hour, 20 per day (Upstash Redis; in-memory fallback for local dev).
- Honeypot field in the checkout form, hidden via CSS, must be empty.
- Minimum time-on-form check (< 3 seconds from mount to submit = reject).
- Cloudflare Turnstile if abuse actually materialises — **do not add it pre-emptively**; it costs conversions and this is a low-volume store.
- Server-side phone validation with `libphonenumber-js`, restricted to plausible regional formats.

**Secrets.** `SUPABASE_SERVICE_ROLE_KEY` is referenced only inside files carrying `import 'server-only'`. Add a CI check that greps the client bundle for the key prefix. Never `NEXT_PUBLIC_`-prefix anything sensitive.

**RLS.** Enabled on every table, with `orders` and `order_items` having **no anon policy at all**. Verify with a test that an anon client selecting from `orders` returns zero rows — and keep that test in CI.

**Admin auth.**

- Supabase Auth with strong password policy (12+ chars).
- Authorisation via `admin_users` membership, checked in the layout on every request — not just in middleware. Middleware alone is insufficient; it can be bypassed in some edge cases and does not protect Server Actions.
- **Every admin Server Action independently re-verifies admin status.** Server Actions are publicly reachable endpoints; a UI guard is not a security boundary.
- Login attempt rate limiting: 5 per 15 minutes per IP + per email.
- Session: httpOnly, secure, sameSite=lax cookies (Supabase SSR helpers handle this).
- `/admin/*` returns `noindex, nofollow` and is excluded from the sitemap.

**Input validation.** Zod at every boundary, shared between client and server. Server never trusts client-side validation having run. Length caps on all text fields (name 50, address 200, note 500) to prevent storage abuse.

**File uploads.** Server-side only: verify magic bytes, allowlist `image/jpeg|png|webp` (**reject SVG entirely** — SVG is an XSS vector), 5 MB cap, re-encode to WebP with `sharp` which strips EXIF (including GPS coordinates the seller's phone embedded), randomised filenames.

**XSS.** Product descriptions are rendered as plain text or through a markdown renderer with HTML disabled. No `dangerouslySetInnerHTML` anywhere except controlled JSON-LD.

**Headers** (in `next.config.ts`): `Content-Security-Policy` (script-src self + Vercel Analytics; img-src self + Supabase storage domain), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geolocation.

**PII minimisation.** No email required, so no email stored unless volunteered. IP stored only as a salted hash. Order data retained 24 months, then anonymised by a scheduled job — not deleted, since aggregate sales history is business-critical.

### 8.3 Compliance & legal

- **Age restriction.** These are accessories for a tobacco product. Kosovo, Albania and North Macedonia all restrict tobacco-related sales to adults (18+). The store must display a clear age statement, include an 18+ confirmation checkbox at checkout, and state in the Terms that the seller verifies age at delivery. Discuss the exact requirement with a local lawyer — tobacco advertising and sales rules in these jurisdictions are strict and change; this is a genuine business risk, not a formality. It also affects advertising: Meta and Google both restrict tobacco-related ad accounts, which materially changes the marketing plan.
- **Trademark.** "IQOS" is a Philip Morris trademark. Third-party accessories may generally be described by reference to compatibility ("compatible with IQOS 3 DUO") under nominative fair use, but the brand name must **not** be used in the store's own name, logo, domain, or in any way implying official affiliation. A disclaimer — "An independent retailer. Not affiliated with or endorsed by Philip Morris International." — belongs in the footer of every page. Get this reviewed by a lawyer before launch; naming the store after the trademark is the most common and most expensive mistake here.
- **Data protection.** Kosovo's Law on Personal Data Protection is GDPR-aligned, as are Albania's and North Macedonia's regimes. Required: a privacy policy naming what is collected and why, a lawful basis (contract performance for order data), a cookie banner only if non-essential cookies are used (avoid them in v1 and skip the banner entirely — a real UX win), and a stated contact route for deletion requests.
- **Consumer information.** Terms of Service, Shipping & Returns policy, and visible contact details. Displaying total price including shipping before submission is both good practice and generally required.

---

## 9. SEO Strategy

### 9.1 Realistic assessment

Search volume for these products in Albanian is modest, and paid advertising for tobacco-adjacent goods is restricted on the major platforms. **Instagram and TikTok will drive most traffic; Google will drive high-intent traffic.** So SEO effort should concentrate on (a) branded and product-specific queries, and (b) making shared links look excellent — the OG image is arguably higher-leverage than any meta description.

### 9.2 Technical foundation

- Per-route `generateMetadata()` with locale-aware title templates: `%s | EMBER`.
- Canonical URL on every page; `hreflang` alternates `sq` / `en` / `x-default`.
- `app/sitemap.ts` generating both locales for: home, products, each product, each category, static pages. Regenerated on content change.
- `app/robots.ts`: allow all except `/admin`, `/api`, `/order/*` (contains PII, must never be indexed).
- Semantic HTML: exactly one `<h1>` per page, logical heading order, `<nav>`, `<main>`, `<article>` on PDPs.
- Descriptive `alt` text per locale from `product_images.alt_sq/alt_en`.

### 9.3 Structured data (JSON-LD)

| Page                | Schema                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| All                 | `Organization` + `WebSite` with `SearchAction`                                                   |
| Product             | `Product` with `offers` (price, EUR, availability, `priceValidUntil`), `brand`, `image[]`, `sku` |
| Category / Products | `ItemList` + `BreadcrumbList`                                                                    |
| Static pages        | `BreadcrumbList`                                                                                 |
| Contact             | `LocalBusiness` with address, phone, opening hours                                               |

Omit `AggregateRating` until real reviews exist. Fake review markup is a manual-action risk and the reason many small stores get penalised.

### 9.4 Performance (SEO's real lever here)

Targets: **LCP < 2.5s on 4G mobile, CLS < 0.1, INP < 200ms.**

- `next/image` everywhere, AVIF/WebP, explicit `width`/`height` from the DB (zero CLS), `blur_data_url` placeholders, `priority` on hero and the first-row product images only.
- Self-hosted fonts, `display: swap`, preloaded, subset to `latin` + `latin-ext`.
- Framer Motion imported via `LazyMotion` + `domAnimation` to avoid shipping the full library.
- Client bundle budget: **< 200 KB gzipped** on the storefront. Enforce with `@next/bundle-analyzer` in CI. Admin has no budget — it's behind auth and used on wifi.
- No third-party scripts on the storefront other than analytics. Instagram embeds are the classic offender: use a static image wall pulled at build time, not the Instagram embed script.

### 9.5 Content

- Product descriptions written natively in Albanian, then translated — not the reverse. Machine-translated Albanian reads badly to native speakers and undermines the premium positioning more than any design flaw.
- URL slugs: descriptive and stable (`/sq/products/mbulese-lekure-iqos-iluma`).
- Per-category intro copy (80–150 words) above the grid for indexable text.
- Google Business Profile if there is any physical presence — for local queries this outweighs on-page SEO.
- Dynamic `opengraph-image.tsx` per product: product shot on brand background with name and price. This is what people see when the link is pasted into WhatsApp, which is how most sharing will actually happen in this market.

---

## 10. Design Direction & System

### 10.1 Positioning

> A drop-culture accessories label that happens to sell online — not a store that happens to have nice photos.

Reference points: **Aesop** (restraint, generous whitespace, typographic confidence), **Bang & Olufsen** (product-as-object photography), **Represent / Axel Arigato** (dark editorial layouts, cinematic hero), **Nothing** (technical minimalism, monospace accents).

Anti-references: rounded 3D icon rows, gradient blob backgrounds, stock-photo "happy customer" imagery, five different accent colours, badges shouting SALE in red.

### 10.2 Colour tokens (dark-first)

| Token             | Value                  | Use                      |
| ----------------- | ---------------------- | ------------------------ |
| `--bg-base`       | `#0A0A0B`              | page background          |
| `--bg-elevated`   | `#141416`              | cards, drawers           |
| `--bg-subtle`     | `#1C1C20`              | inputs, hover states     |
| `--border`        | `#26262B`              | hairlines                |
| `--border-strong` | `#3A3A42`              | focus, active            |
| `--fg-primary`    | `#F5F5F7`              | headings, body           |
| `--fg-secondary`  | `#A1A1AA`              | supporting copy          |
| `--fg-muted`      | `#6B6B75`              | metadata                 |
| `--accent`        | `#C8A06A` (warm brass) | CTAs, prices, highlights |
| `--accent-hover`  | `#D9B57F`              |                          |
| `--success`       | `#4ADE80`              | in stock                 |
| `--warning`       | `#FBBF24`              | low stock                |
| `--danger`        | `#F87171`              | errors, out of stock     |

**Accent alternative** if brass reads too luxury-boutique and not enough street: `--accent: #E8FF5A` (acid lime) — colder, younger, harder. Pick one and commit; do not use both. Recommendation: **brass** for a market where "premium" is the differentiator, lime if the positioning shifts younger.

The accent appears on roughly **5% of any given screen**. Restraint is the whole strategy — everything is black, grey and white, and the one warm colour means "this matters".

Light mode is **out of scope for v1**. Tokens are structured to permit it later, but a dark-only site is a deliberate brand statement, and maintaining two themes doubles the QA surface.

### 10.3 Typography

- **Display:** a high-contrast geometric sans — _Clash Display_, _General Sans_, or _Satoshi_. Used at 40–96px, tight tracking (`-0.03em`), for hero and section headings. **Must be verified for `ë` and `ç`.**
- **Body:** _Inter_ (or _Geist_), 15–17px, `line-height: 1.6`, `--fg-secondary`.
- **Accent/technical:** a monospace (_JetBrains Mono_) for SKUs, prices in the admin, and small uppercase eyebrows with wide tracking (`0.15em`). This is the detail that makes it read "technical premium" rather than "generic dark theme".

Scale (fluid via `clamp()`): `display-xl 48→96 · display 36→64 · h1 32→48 · h2 24→36 · h3 20→24 · body-lg 17 · body 15 · sm 13 · xs 11 (uppercase, tracked)`.

### 10.4 Space, shape, motion

- 4px base scale; **sections get 96–160px vertical padding on desktop, 64–96px on mobile.** Generous whitespace is the cheapest luxury signal available.
- Radius: `4px` inputs/buttons, `8px` cards, `16px` modals. Nothing fully rounded except badges and the cart count. Sharp-ish corners read premium; pill-shaped everything reads consumer-app.
- Borders are 1px hairlines at low contrast; **no drop shadows** on a dark theme — use elevation via background lightness instead.
- Grid: 12 columns, 1440px max content width, 24px gutters desktop / 16px mobile. Products: 4-up desktop, 3-up laptop, 2-up mobile (never 1-up — 2-up feels like a catalog, 1-up feels empty).

**Motion principles.** Easing `cubic-bezier(0.16, 1, 0.3, 1)` for entrances; durations 200ms (micro), 400ms (component), 600ms (section). Everything respects `prefers-reduced-motion`.

Where motion is used: section reveals on scroll (fade+rise, staggered 60ms, once only); product card image cross-fade and subtle scale on hover; cart drawer slide with a spring; add-to-cart button state transition (idle → loading → check); page transitions as a brief fade; hero image slow parallax and a slow-zoom ambient loop.

Where motion is **not** used: no bouncing, no rotation, no scroll-jacking, no counters ticking up, no animated gradient backgrounds. One motion idea executed consistently beats five executed once.

### 10.5 Section-by-section homepage specification

1. **Announcement bar** — 32px, `--bg-subtle`, 11px uppercase tracked: shipping offer or new-drop notice. Dismissible, remembered.
2. **Header** — transparent over the hero, becoming an opaque blurred bar on scroll. Left: wordmark. Centre: Products / Categories / About. Right: search icon, `SQ|EN` switcher, cart with count badge. Mobile: hamburger → full-screen overlay with staggered link entrance.
3. **Hero** — 90vh (`dvh`). Full-bleed cinematic product image or muted looping video, dark gradient overlay bottom-to-top. Left-aligned display headline (2 lines max), one supporting line, one primary CTA plus one ghost CTA. A small scroll indicator. **This section alone determines whether the site reads premium.** Budget real photography or high-quality renders; no stock imagery.
4. **Featured products** — eyebrow + heading + "View all" link; horizontal scroll-snap carousel on mobile, 4-up grid on desktop.
5. **Categories** — 3 large tiles with image, dark overlay, name and item count, image scaling gently on hover. Asymmetric layout (one wide, two narrow) rather than three equal boxes.
6. **Brand story** — split 50/50: lifestyle image left, generous copy right, 3 short stats or values below. This is where the "young urban brand" narrative lands.
7. **Best sellers** — same grid as featured, with a rank number in the corner of each card as a small typographic detail.
8. **Why choose us** — 4 columns: fast local delivery, authentic products, cash on delivery, support in Albanian. Thin line icons only, no filled illustrations.
9. **Social wall** — 6–8 square images in a masonry or grid, "Follow @handle" CTA. Statically sourced at build time; **no Instagram embed script** (performance and reliability).
10. **Footer** — 4 columns (brand + short line, shop links, help links, contact + socials), newsletter field only if there is an actual plan to send anything, then a bottom bar with copyright, language switcher, legal links, payment/delivery note, and the **trademark disclaimer**.

### 10.6 Accessibility

Not optional and not expensive if done from the start: 4.5:1 contrast on body text (verify `--fg-secondary` on `--bg-base` — it passes; `--fg-muted` does **not** and must be reserved for large or non-essential text), visible focus rings in `--accent`, full keyboard operability of the cart drawer and gallery with focus trapping, `aria-live` on cart updates and form errors, 44×44px minimum touch targets, and every image carrying meaningful alt text.

---

## 11. Development Roadmap

Estimates assume one developer working with Claude Code, and count working days.

### Phase 0 — Foundation (2–3 days)

Next.js 15 + TypeScript + Tailwind + shadcn init · design tokens in `globals.css` · fonts self-hosted and **verified for Albanian glyphs** · `next-intl` routing and middleware · Supabase projects created · ESLint/Prettier/Husky · Vercel connected with preview deploys · empty `sq.json`/`en.json` scaffolds.
**Exit criteria:** `/sq` and `/en` render a styled placeholder; language switcher works; deploys are green.

### Phase 1 — Data layer (3–4 days)

All migrations written and applied · enums, tables, indexes, triggers · RLS policies · `shipping_rates` and category seeds · Storage bucket + policies · `supabase gen types` wired into a script · DAL read functions with typed returns · seed script with ~15 realistic demo products in both languages.
**Exit criteria:** a script prints localized products from the database; anon client provably cannot read `orders`.

### Phase 2 — Storefront core (6–8 days)

Header/footer/mobile nav · homepage sections 1–10 · products listing with search, category filter, price filter, sorting, pagination · PDP with gallery, description, stock, related products · `<ProductCard>` and the motion primitives · full SQ/EN copy for every string.
**Exit criteria:** a customer can browse the entire catalog in both languages on a phone; Lighthouse mobile performance ≥ 90.

### Phase 3 — Cart & checkout (4–5 days)

Zustand cart with persistence and reconciliation · cart drawer and cart page · quantity/remove · country-driven shipping calculation · checkout form with react-hook-form + Zod + phone validation · checkout Server Action (validate → reprice → stock check → transactional insert → decrement → revalidate) · confirmation page with `public_token` · all failure paths from §5.2 · rate limiting and honeypot.
**Exit criteria:** an order placed in the browser appears correctly in the database with server-computed totals; tampering with client-side prices has no effect.

### Phase 4 — Admin (6–8 days)

Login + auth guard + `admin_users` authorisation · admin shell (responsive, mobile-usable) · products CRUD with bilingual tabbed form · image uploader with reordering and WebP conversion · categories management · orders list with status tabs · order detail with tap-to-call and status transitions · analytics dashboard · settings (shipping rates, announcement).
**Exit criteria:** the seller can add a product, see an order, call the customer and move it to Shipped — entirely from a phone.

### Phase 5 — Polish, SEO & launch (4–5 days)

Metadata, JSON-LD, sitemap, robots, OG images · 404/500 pages · loading skeletons everywhere · legal pages (Terms, Privacy, Shipping & Returns) with lawyer review · age gate and trademark disclaimer · security headers · real product photography and copy · cross-browser and real-device testing (particularly the **Instagram in-app browser**) · analytics · seller training session and a one-page written guide in Albanian.
**Exit criteria:** launched, indexed, and the seller has successfully processed a real order unaided.

**Total: roughly 25–33 working days.** The two most commonly underestimated items are real product photography and writing genuinely good Albanian copy — neither is a coding task, and both gate the launch.

---

## 12. Version 1 Feature List

### Included

**Storefront**
Bilingual SQ/EN with nav switcher · dark premium responsive design · homepage with all 10 sections · product catalog with search, category filter, price range, in-stock toggle, and sorting (newest, price ↑↓, best selling) · product detail with multi-image gallery, description, stock status, quantity selector, related products · localStorage cart with drawer and full page · country-driven shipping calculation · guest checkout with the six required fields plus optional note · order confirmation page with order number and the required message · static pages (about, contact, terms, privacy, shipping & returns) · age statement and trademark disclaimer.

**Admin**
Secure email/password login with membership-based authorisation · analytics overview · full product CRUD with bilingual content, multi-image upload, pricing, discounts, stock, categories, featured flags · category management · orders list with status filtering · order detail with customer info, items, totals and status transitions · shipping rate settings · translation-completeness widget.

**Platform**
Supabase Postgres with RLS · Supabase Storage · Server Actions for all writes · server-side price computation · rate limiting and honeypot · full SEO baseline with JSON-LD and hreflang · ISR with tag-based revalidation · Vercel deployment with preview environments.

### Explicitly excluded from v1

Online payments · customer accounts and order history · product variants (size/colour) · reviews and ratings · wishlist · coupon codes · email notifications to customers · courier API integration · multi-currency · light mode · blog · a third language.

Each of these is defensible to exclude: none of them is required for the customer flow described, and every one of them adds a maintenance surface for a store that may sell a few dozen units a week at launch.

---

## 13. Future Improvements

**Phase 2 (first 3 months post-launch) — driven by seller pain**
Telegram or WhatsApp instant notification on new orders (_highest-value single addition; the seller should not have to watch a dashboard_) · printable packing slip and courier label · order search by phone or order number · bulk status updates · CSV export of orders · low-stock email digest · product duplication in admin · audit log.

**Phase 3 (3–9 months) — driven by growth**
Discount and coupon codes · free-shipping thresholds per country · product variants (colour/model compatibility) · customer order lookup by phone + order number (no account needed) · review collection via SMS follow-up with moderation · abandoned-cart recovery via SMS · Meta Pixel / TikTok Pixel where advertising policy permits · admin 2FA · richer analytics (conversion funnel, traffic source attribution).

**Phase 4 (9–18 months) — driven by scale**
Online payment integration (regional gateway or Stripe where supported) · customer accounts with saved addresses and order history · multi-currency display with ALL and MKD · a third language (Macedonian or Serbian) if North Macedonia becomes a significant share of revenue · courier API integration with live tracking · inventory-value and margin reporting · a lightweight PWA for repeat mobile customers · a headless blog for content SEO · influencer/affiliate tracking links.

**Speculative**
Loyalty programme · bundle/kit builder · AR preview of cases · B2B wholesale portal for kiosks and small shops (_plausibly the largest untapped revenue channel in this market_).

---

## 14. Naming, Risks & Open Questions

### 14.1 Naming

`EMBER` is a placeholder. The final name must **not** contain "IQOS" or any Philip Morris mark, must work in both Albanian and English (check for unintended meanings in Albanian), and should have an available `.com` and a matching Instagram handle. Get the name settled before Phase 0 — it propagates into the domain, logo, OG images, email, and every legal page.

### 14.2 Risks

| Risk                                                    | Severity             | Mitigation                                                                                                  |
| ------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Trademark challenge from PMI over branding              | High                 | Legal review pre-launch; compatibility-only references; prominent disclaimer                                |
| Tobacco advertising restrictions block paid acquisition | High                 | Plan organic/influencer channels from day one; do not build a business model dependent on Meta ads          |
| Product photography is mediocre                         | High                 | The entire premium positioning rests on it; budget for a proper shoot before launch, not after              |
| Order spam floods the seller                            | Medium               | Rate limiting + honeypot from Phase 3; Turnstile in reserve                                                 |
| Machine-translated Albanian copy                        | Medium               | Write Albanian first, natively                                                                              |
| Seller finds the admin panel confusing                  | Medium               | Mobile-first admin; Albanian UI; one-page written guide; observe them completing a real order before launch |
| Cash-on-delivery refusal rate                           | Medium               | Phone confirmation before dispatch is exactly the mitigation — it's already in the flow                     |
| Font lacks `ë`/`ç`                                      | Low but embarrassing | Verify in Phase 0                                                                                           |

### 14.3 Open questions for the client before Phase 0

1. Final brand name and domain?
2. Is there existing product photography, or does a shoot need budgeting?
3. Which courier(s), and what are the actual delivery timeframes to quote per country?
4. Is €2 / €5 shipping fixed, or should free shipping above a threshold be available at launch?
5. Are there product variants (colours, device-model compatibility) in the real catalog? This materially changes the schema and is far cheaper to design in now than to retrofit.
6. Approximate SKU count and expected orders per week? (Below ~50/week, several Phase 2 features can be deferred indefinitely.)
7. Who writes the Albanian copy?
8. Does the seller want order notifications on WhatsApp, Telegram, or email?
9. Has a lawyer been engaged for the trademark and age-restriction questions?

---

## 15. How to Build This With Claude Code

A blueprint this size is best executed as a sequence of scoped sessions, not one long conversation.

- **Commit this document as `docs/BLUEPRINT.md`** and reference it at the start of every session. Add a `CLAUDE.md` at the repo root containing the non-negotiables: server-only DAL, no client Supabase writes, prices always recomputed server-side, both locales required, dark tokens only.
- **One phase per session, one feature per commit.** Do not ask for "the whole storefront" in one go; ask for the header, then the hero, then the product card.
- **Generate types after every migration** (`supabase gen types typescript`) and let TypeScript catch drift.
- **Write the Zod schemas before the forms.** They are the contract both sides depend on.
- **Verify the security invariants with actual tests**, not by inspection: anon cannot read `orders`; a tampered client price does not affect the stored total; a non-`admin_users` authenticated user cannot invoke an admin action.
- **Check the bundle after each storefront phase.** Regressions are easy to introduce and hard to trace later.

---

_End of blueprint. No implementation code should be written until §14.3 is answered and the naming and legal questions in §8.3 are resolved._
