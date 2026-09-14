---
name: ui-components
description: Build or edit UI in the Smart Query Hub web app. Use for new pages, components, forms, tables, cards, badges, and buttons so they reuse the existing design tokens and component classes in globals.css instead of inventing new styles.
license: MIT
metadata:
  category: ui
  language: typescript
  framework: nextjs
  area: web
---

# Smart Query Hub UI

All user-facing UI lives in `web/`. Styling is **CSS custom properties plus
semantic component classes defined in `web/app/globals.css`**, with Tailwind v4
available underneath. Read the relevant part of `globals.css` before adding
markup.

## Knowledge

### Design tokens

Tokens are defined on `:root` / `[data-theme="light"]` and overridden under
`[data-theme="dark"]` on `<html>`. Never hardcode a hex value - pick the token.

- Surfaces: `--bg-base`, `--bg-elevated`, `--bg-sunken`, `--bg-muted`, `--bg-hover`
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-inverse`
- Brand ramp: `--brand-50/100/200/300/500/600/700/900` plus `--brand-contrast`
  for text/icons sitting on brand fills
- Semantics: `--success`, `--warning`, `--danger`, `--info`, each with a
  matching `-bg` and `-border` variant
- Borders: `--border-light` (default dividers), `--border-default`, `--border-strong`
- Focus: `--ring`, `--ring-offset`
- Elevation: `--shadow-xs` … `--shadow-xl`
- Radii: `--radius-sm/md/lg/xl/full`
- `--table-stripe` for even-row table backgrounds

### Existing component classes

Reuse these before writing anything new. In `globals.css`:

- Layout: `.container-page`, `.page-header` / `.page-header-left` /
  `.page-title` / `.page-subtitle`, `.grid-2`, `.grid-3`, `.divider`,
  `.section-label`
- Cards: `.card`, `.card-header`, `.card-title`, `.stats-grid`, `.stat-card`,
  `.stat-label`, `.stat-value`, `.stat-trend`
- Forms: `.field`, `.field-label`, `.field-input`, `.field-textarea`,
  `.field-select`
- Buttons: `.btn` plus `.btn-primary` / `.btn-secondary` / `.btn-ghost` /
  `.btn-danger` / `.btn-outline-brand`, and size modifiers `.btn-sm` / `.btn-lg`
- Badges: `.badge` with `.badge-subtle` / `.badge-brand` / `.badge-success` /
  `.badge-warning` / `.badge-danger` / `.badge-info`; `.badge-status` with
  `.badge-submitted` / `.badge-classifying` / `.badge-routed` /
  `.badge-in_progress` / `.badge-resolved` / `.badge-escalated` /
  `.badge-closed`; `.badge-priority` with `-low` / `-normal` / `-high` /
  `-urgent`
- Data: `.table-wrap`, `.table`, `.table-stripe`, `.table-link`
- States: `.empty-state`, `.empty-state-icon`, `.info-box`, `.warning-box`,
  `.error-box`, `.success-box`
- Motion: `.animate-fade-in`, `.animate-fade-slide`, `.animate-scale`,
  `.stagger-children`, `.skeleton`
- Utilities: `.visually-hidden`, `.truncate`, `.line-clamp-2`, `.line-clamp-3`,
  `.caption`, `.mono-sm`
- Domain: `.ai-draft-block` / `.ai-draft-label`, `.msg-bubble` with `.outgoing`
  / `.incoming` (WhatsApp console), `.landing-*` (public marketing page)

### Conventions

- **Typography**: body is DM Sans 14px/1.5; `--font-display` is Fraunces for
  display headings; `--font-mono` is DM Mono. Headings set their own sizes and
  `letter-spacing: -0.01em`.
- **Dark mode** is handled by overriding tokens, not by duplicating rules. Only
  add a `[data-theme="dark"]` block when a token swap cannot express the change
  - existing precedents are the select chevron, a few badges, striped rows, and
  `.msg-bubble.incoming`.
- **Component CSS files** are acceptable for larger surfaces: `AuthForms.css`
  sits next to the auth components. Keep small, shared primitives in
  `globals.css` and co-locate feature-specific CSS with its component.
- **Icons are inline SVG**, as in `components/BrandMark.tsx`. There is no icon
  library and no UI kit dependency - do not add one.
- **Mark decoration** with `aria-hidden="true"` (see `BrandMark`).
- Some components are intentionally **Server Components**; nav hover styling is
  CSS-only precisely to keep `NavBar` server-rendered. Do not introduce a client
  component just to attach a hover handler.
- Focus is global: `:focus-visible` gets an outline plus a `--brand-100` ring.
  If you build a custom control, keep a visible focus state.

## Instructions

1. Read the closest existing example of the surface you are building before
   writing markup - e.g. `app/page.tsx`, `app/login/page.tsx`,
   `app/register/page.tsx`, or the components in `web/components/`.
2. Compose from the existing classes listed above. Only add a new class when no
   combination of existing ones fits.
3. If a new class is genuinely needed, define it in `globals.css` using tokens,
   place it in the section matching its purpose, and note dark-mode needs.
4. Verify dark mode by reasoning through the token values rather than assuming
   the light theme carries over.
5. Check keyboard focus, `aria-hidden` on decorative art, and that added motion
   is subtle (the existing easings are `0.2s–0.35s`, `cubic-bezier(0.22, 1, 0.36, 1)`).
6. Run `cd web && npm run lint` and `npm run build` to confirm the change
   compiles.
