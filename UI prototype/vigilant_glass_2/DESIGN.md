# Design System Strategy: The Observational Aesthetic

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Precision Lens."** 

We are moving away from the cluttered, "app-like" interface toward a high-end editorial experience that feels like a tactical heads-up display (HUD) merged with a premium lifestyle magazine. This system rejects the standard rigid grid in favor of a "Bento-Editorial" layout—utilizing intentional asymmetry, overlapping frosted layers, and a hierarchy driven by light refraction rather than structural lines.

By prioritizing depth through 20px+ backdrop blurs and high-contrast typographic scaling, we create an environment that feels both ultra-modern and authoritative. The interface doesn't just display data; it curates it behind a veil of sophisticated "Vigilant" glass.

---

## 2. Colors & Surface Philosophy
The palette is a restricted, high-tension triad: **Pure White, Signal Red (#E60000), and Deep Zinc/Black.**

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Separation of concerns must be achieved through:
*   **Tonal Shifts:** Placing a `surface_container_high` element against a `surface` background.
*   **Refractive Depth:** Using `backdrop-blur` to naturally distinguish the foreground from the background.

### Surface Hierarchy & Nesting
The UI is treated as a physical stack of glass panes. Use the following tiers for nesting:
*   **Base Layer:** `background` (#131315).
*   **Secondary Surface:** `surface_container_low` for large structural areas.
*   **Floating Elements:** `surface_container_high` with 20px+ blur for interactive cards.

### The Glass & Gradient Rule
To achieve "The Precision Lens" look, glass cards must use a multi-layered approach:
*   **Fill:** `surface_variant` at 40-60% opacity.
*   **Blur:** Minimum `24px` backdrop-blur.
*   **Inner Glow:** A 1px inner-shadow (inset) using `on_surface` at 10% opacity on the top/left edges to mimic light catching the edge of the glass.
*   **Signature Texture:** Use a subtle radial gradient from `primary_container` (#E60000) to `primary` in the background behind glass layers to create a "warmth" that glows through the frost.

---

## 3. Typography: The Manrope Scale
We use **Manrope** exclusively. It is a modern geometric sans-serif that maintains high legibility in high-stress environments while feeling premium.

*   **The Power Scale:** Use a dramatic contrast between `display-lg` (3.5rem) for hero data points and `label-sm` (0.6875rem) for metadata. This "Big/Small" contrast creates an editorial, custom feel.
*   **Headline vs. Body:** All headlines (`headline-lg` through `headline-sm`) should be set with `-0.02em` letter spacing to feel "tighter" and more authoritative. Body text should maintain `0` letter spacing for maximum readability during prolonged use.
*   **Information Density:** Use `label-md` in all-caps for categories or overlines to ground the "Tactical" aspect of the brand.

---

## 4. Elevation & Depth
Depth in this system is a simulation of light passing through glass, not a shadow cast on a wall.

*   **The Layering Principle:** Stacking is the primary tool for hierarchy. A `surface_container_lowest` card nested inside a `surface_container_high` glass pane creates an "etched" look that feels integrated and expensive.
*   **Ambient Shadows:** If a card must float, use a shadow with a blur radius of `40px` and an opacity of `6%` using the `surface_container_lowest` color. Avoid pure black shadows; shadows should feel like a localized "dimming" of light.
*   **The Ghost Border:** For accessibility, use a 1px border. This must be the `outline_variant` token at `15%` opacity. It should look like a faint light reflection, not a drawn line.

---

## 5. Components

### Bento Containers (The Signature Component)
All containers must implement the frosted glass effect. 
*   **Corner Radius:** Use `xl` (1.5rem) for external bento corners and `md` (0.75rem) for nested elements to create a "squircle-within-squircle" aesthetic.
*   **Interactivity:** On hover, increase the `backdrop-blur` from 20px to 40px and increase the `outline_variant` opacity slightly.

### Buttons
*   **Primary:** Solid `primary_container` (#E60000) with `on_primary_container` text. Use `full` (pill) roundedness.
*   **Glass Secondary:** A glass card variant with a `15%` white border. No background fill, only blur.
*   **Tertiary:** Text-only using `primary` color with an arrow icon for directional cues.

### Inputs & Fields
*   **Style:** Background-less. Use a `surface_variant` (20% opacity) bottom-border only.
*   **Focus State:** The bottom border transitions to `primary` (#E60000) with a subtle glow (2px blur) effect.

### Chips
*   **Tactical Chips:** Use `secondary_container` with `label-sm` typography. These should feel like small "tags" on a piece of equipment. No borders.

### Navigation Elements
The navigation bar should be a floating glass "dock" at the bottom or side of the screen.
*   **Effect:** Maximum blur (40px). 
*   **Active State:** Use a `primary` red dot or a subtle `30%` opacity red glow behind the active icon.

---

## 6. Do’s and Don’ts

### Do:
*   **Overlap Elements:** Let a glass card partially obscure a background graphic or piece of text to show off the `backdrop-blur`.
*   **Use Generous White Space:** The "Editorial" look requires breathing room. Use the `xl` spacing token between bento units.
*   **Tone-on-Tone:** Use `on_surface_variant` for secondary text to keep the visual hierarchy quiet where it's not needed.

### Don't:
*   **Don't use pure black (#000000) for cards:** Use the `surface_container` tokens to ensure there is enough tonal range for the glass effect to work.
*   **Don't use 100% opaque borders:** This breaks the "Precision Lens" illusion. All lines must be semi-transparent.
*   **Don't use Drop Shadows on Glass:** Glass doesn't cast heavy shadows; it refracts light. Use inner-glows and tonal shifts instead.
*   **Don't mix fonts:** Stick to the Manrope scale provided. The identity relies on the consistent, clean geometry of a single typeface.