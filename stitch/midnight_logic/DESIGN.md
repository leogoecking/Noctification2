# Design System Document: Operational Precision

## 1. Overview & Creative North Star: "The Orchestrator"
This design system is built to move beyond the "Standard SaaS" aesthetic. While it serves a high-density internal operations tool, it rejects the cluttered, line-heavy interfaces of the past. 

Our Creative North Star is **"The Orchestrator."** Like a high-end physical mixing console or a luxury watch movement, every element must feel precision-engineered and intentionally placed. We break the "template" look by utilizing **Tonal Architecture** instead of lines. By using a sophisticated stack of deep blues and slate greys, we create an environment that feels authoritative yet calm—reducing cognitive load for operators handling high-stakes notifications and APR modules.

## 2. Colors & Surface Architecture
We utilize a Material-inspired logic but apply it with an editorial eye. The palette is dominated by `surface` and `secondary` tones to maintain a professional, focused atmosphere.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. 
*   **How to define boundaries:** Use background color shifts. A `surface_container_low` section sitting on a `surface` background provides all the separation needed. 
*   **The Goal:** A seamless, "molded" UI where elements feel carved out of the background rather than pasted onto it.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers.
*   **Base:** `surface` (#faf8ff)
*   **Secondary Content Areas:** `surface_container_low` (#f2f3ff)
*   **Interactive Cards/Modules:** `surface_container_highest` (#dae2fd)
*   **The "Glass & Gradient" Rule:** For floating modals or high-priority APR form overlays, use `surface_container_lowest` (#ffffff) with a 70% opacity and a 20px `backdrop-blur`. 

### Signature Textures
Main CTAs (Primary) should not be flat. Use a subtle linear gradient from `primary` (#000000) to `on_primary_container` (#188ace) at a 135-degree angle. This provides a "liquid ink" depth that signifies high-end professional software.

## 3. Typography: Editorial Utility
We use **Inter** for its neutral, high-legibility characteristics, but we apply it with high-contrast scaling to create a clear information hierarchy.

*   **Display (Large/Medium):** Reserved for dashboard overviews. Use `display-md` (2.75rem) with a `-0.02em` letter spacing to feel "compact and urgent."
*   **Headlines:** `headline-sm` (1.5rem) should be used for module titles. Ensure `on_surface` color is used to maintain high contrast.
*   **Body:** `body-md` (0.875rem) is our workhorse. For dense data tables, use `body-sm` (0.75rem) to maximize information density without sacrificing legibility.
*   **Labels:** `label-md` (0.75rem) must always be in `secondary` (#515f74) to clearly distinguish metadata from primary data.

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "dirty." In this system, depth is achieved through light and tone.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section. This creates a soft, natural lift.
*   **Ambient Shadows:** If a card must float (e.g., a Kanban card being dragged), use a shadow: `0 8px 32px rgba(19, 27, 46, 0.06)`. The shadow color is a tinted version of `on_surface`, not pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a border (e.g., in high-contrast modes), use `outline_variant` (#c6c6cd) at **15% opacity**. Never 100%.

## 5. Components & Primitive Styling

### Dense Data Tables
*   **Forbid dividers.** Use alternating row tints: `surface` and `surface_container_low`.
*   **Header:** Use `label-md` in uppercase with `0.05em` letter spacing.
*   **Cell Padding:** Use Spacing `2` (0.4rem) vertically and `4` (0.9rem) horizontally.

### Kanban Cards & SLA Indicators
*   **Surface:** Use `surface_container_highest`. 
*   **SLA Indicators:** Do not use large colored blocks. Use a "Status Pip"—a 6px circle using `error` (#ba1a1a) for critical, `surface_tint` (#006398) for info, and a custom amber for warnings.
*   **Roundedness:** Apply `md` (0.375rem) to cards to keep them feeling "tooled" rather than "bubbly."

### APR Module Form Elements
*   **Input Fields:** Background should be `surface_container_low`. On focus, transition background to `surface_container_lowest` and apply a `px` "Ghost Border" of `primary`.
*   **Complex Forms:** Group related inputs within a `surface_container_high` wrapper. Use Spacing `8` (1.75rem) between sections to allow the form to "breathe" despite high density.

### Notification Badges
*   Use `error` (#ba1a1a) for background and `on_error` (#ffffff) for text.
*   Shape: Always `full` (9999px) roundedness. 

## 6. Do’s and Don’ts

### Do
*   **Do** use vertical white space (Spacing `6` or `8`) to separate major dashboard widgets.
*   **Do** use `tertiary_container` for "read-only" or "archived" states to subtly de-emphasize them.
*   **Do** use `on_surface_variant` for secondary text to create a sophisticated grey-scale hierarchy.

### Don’t
*   **Don't** use 1px lines to separate list items. Use a 2px gap (Spacing `1`) to let the background show through.
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#131b2e) for a more "ink-on-paper" feel.
*   **Don't** use standard "drop shadows" on buttons. If a button needs prominence, use the "Glass & Gradient" rule.

## 7. Interaction States
*   **Hover:** Shift background color by one tier (e.g., `surface_container_low` becomes `surface_container_high`).
*   **Active/Pressed:** 2% opacity overlay of `on_surface`.
*   **Disabled:** 30% opacity on all elements; `outline` token for text.