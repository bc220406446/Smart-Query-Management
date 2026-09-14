---
name: ui-review
description: Review a screen or component in the Smart Query Hub web app for design-system drift, dark-mode gaps, accessibility problems, responsive breakage, and visual inconsistency. Use before shipping a UI change or when asked to audit an existing screen.
license: MIT
metadata:
  category: quality
  language: typescript
  framework: nextjs
  area: web
---

# UI Review

Audit a UI change in `web/` against the conventions in `web/app/globals.css`.
Report findings as a short list; do not rewrite files unless asked.

## What to check

### 1. Design-system drift

- Hardcoded colors, shadows, radii, or font sizes that should be tokens
  (`--brand-*`, `--bg-*`, `--text-*`, `--border-*`, `--shadow-*`, `--radius-*`).
- One-off classes that duplicate an existing primitive - `.card`, `.btn`,
  `.badge`, `.field-input`, `.table`, `.info-box`, and friends.
- Inline `style={{}}` used for anything other than a dynamic value that cannot
  live in CSS (e.g. a computed size, as `BrandMark` does with `width`/`height`).
- New dependencies for icons, styling, or component kits. The app uses inline
  SVG and plain CSS on purpose.

### 2. Dark mode

- Any new rule that looks right in light mode but was never checked under
  `[data-theme="dark"]`.
- Fill/contrast pairs that rely on a token that flips, without a matching
  `-contrast` or `-bg` token (e.g. text on `--brand-500` must use
  `--brand-contrast`).
- Hardcoded values inside data URIs and SVGs, since those do not follow tokens -
  `.field-select` needs its explicit dark-mode chevron override.
- Contrast of custom badge/status colors in both themes.

### 3. Accessibility

- Decorative SVG or mark art missing `aria-hidden="true"`.
- Icon-only buttons without an accessible label.
- A visible keyboard focus state on every interactive element; global
  `:focus-visible` covers native controls, custom controls need it explicitly.
- Form inputs paired with a `label` / `.field-label`, and errors announced with
  a `.error-box` or equivalent rather than color alone.
- Status conveyed by color only - the existing pattern pairs a color with a dot
  and a text label (`.badge-status`).
- Text hidden visually but needed by screen readers uses `.visually-hidden`.

### 4. Responsive behavior

- The existing breakpoints: `min-width: 640px` for page padding, `max-width: 900px`
  to collapse `.grid-2` / `.grid-3`, and `800px` / `520px` in the landing page.
- Grids that do not collapse, tables without `.table-wrap`, and fixed widths
  that overflow on narrow screens.
- Touch targets and the single-column stacking order on mobile.

### 5. Consistency and polish

- Heading levels and the `.page-title` / `.page-subtitle` pattern used correctly.
- Empty, loading, and error states present - reuse `.empty-state` and
  `.skeleton` rather than leaving a blank region.
- Animation durations and easing matching the existing range, and motion that
  respects how the app already staggers lists (`.stagger-children`).
- Copy and terminology matching the rest of the product (queries, routing,
  escalation).

## Feedback style

- Lead with concrete, file-specific findings, ordered by impact.
- Distinguish real accessibility or dark-mode bugs from subjective taste.
- Point at the existing token or class that should have been used.
- Acknowledge deliberate exceptions instead of flagging them as mistakes.
