# Design System Specification: High-End Editorial Presence

## 1. Overview & Creative North Star: "The Living Pulse"
This design system moves away from the sterile, "dashboard-in-a-box" aesthetic common in enterprise software. Instead, it adopts the **Creative North Star of "The Living Pulse."** It treats real-time employee data as a breathing, editorial narrative. 

By combining the structural logic of **Bento Grids** with the ethereal depth of **Glassmorphism**, we create an environment that feels authoritative yet weightless. We break the "template" look through **intentional asymmetry**: large, high-impact data modules are balanced by smaller, hyper-minimalist status indicators. The layout prioritizes "breathing room" (negative space) as a luxury asset, ensuring that when the vibrant `primary` red appears, it commands immediate, sophisticated attention.

---

## 2. Colors & Surface Philosophy
The palette is a high-contrast study in "Vibrant Minimalism." We use a foundation of gallery-whites and deep blacks, punctuated by a surgical application of red.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be created through:
1. **Tonal Transitions:** A `surface-container-low` section placed on a `surface` background.
2. **Negative Space:** Using the spacing scale to create distinct "islands" of content.
3. **Glass Refraction:** Using backdrop-blur effects to distinguish floating elements from the base layer.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-transparent materials.
*   **Base Layer:** `surface` (#f8f9fa) — The canvas.
*   **Secondary Layer:** `surface-container-low` (#f3f4f5) — Used for large Bento grid groupings.
*   **Elevated Modules:** `surface-container-lowest` (#ffffff) — Used for individual cards to create a "lifted" look.
*   **Active Overlays:** `surface-bright` with 80% opacity + 20px backdrop-blur for glassmorphic drawers or modals.

### The "Glass & Gradient" Rule
To add "soul" to the data, use subtle gradients on primary actions. Instead of a flat red button, use a linear gradient from `primary` (#b70100) to `primary_container` (#e60000). This adds a three-dimensional richness that signifies a "premium" interaction.

---

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with utility.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "tech-editorial" feel. Use `display-lg` for high-level presence counts and `headline-sm` for Bento grid section titles.
*   **Body & UI Labels (Inter):** The workhorse. Inter is used for all data-dense tracking logs and system labels. Its high x-height ensures readability during long-term professional monitoring.
*   **Hierarchy as Identity:** Use `on_surface` (#191c1d) for all primary text. Use `secondary` (#5f5e5e) for metadata. This sharp contrast ensures the eye identifies the most important data points (names, status) instantly.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "heavy" for this system. We use **Ambient Shadowing** and **Tonal Lift**.

*   **The Layering Principle:** Rather than shadows, nest a `surface-container-lowest` card inside a `surface-container` area. The 1-step shift in hex value creates a "soft lift."
*   **Ambient Shadows:** When an element must float (e.g., a real-time alert popover), use:
    *   `blur: 40px`
    *   `spread: -5px`
    *   `color: rgba(25, 28, 29, 0.06)` (a tinted version of `on_surface`).
*   **The Ghost Border:** If accessibility requires a stroke, use `outline_variant` at **15% opacity**. This creates a "suggestion" of a boundary rather than a hard cage.

---

## 5. Components

### Bento Grid Cards
Modular containers that house presence data.
*   **Styling:** Use `roundedness-xl` (0.75rem). No borders. Background: `surface-container-lowest`. 
*   **Interaction:** On hover, transition the background to `surface-bright` and apply a subtle `primary` (#b70100) "Ghost Border" at 10% opacity.

### Presence Indicator (The Red Pulse)
*   **Status:** Use `primary` (#b70100) for "Active/Present."
*   **Visual:** A 6px dot with a 4px `primary_fixed` (#ffdad4) glow effect. It should look like a physical LED light embedded in the glass.

### Buttons
*   **Primary:** Background: `primary` gradient. Typography: `on_primary` (White). Shape: `roundedness-full` for a modern, friendly feel.
*   **Tertiary:** Transparent background. Typography: `primary`. Used for secondary tracking actions to avoid visual clutter.

### Input Fields
*   **Styling:** `surface-container-high` background. No border. 
*   **Active State:** Transitions to `surface-bright` with a 1px `primary` bottom-stroke only (Editorial style).

### Data Lists
*   **Rule:** Forbid divider lines.
*   **Separation:** Use a 4px vertical gap. Alternate background colors between `surface` and `surface-container-low` for every 5th row to create rhythmic grouping.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical Bento layouts. One card might span 2 columns while others span 1 to create visual interest.
*   **Do** leverage large `display-lg` numbers for real-time stats (e.g., "94% On-Site").
*   **Do** use backdrop-blur on all navigation sidebars to allow the "pulse" of the data to peek through.

### Don’t:
*   **Don't** use 100% black (#000000). Use `on_surface` (#191c1d) to keep the contrast sophisticated, not jarring.
*   **Don't** use traditional "Warning Orange" or "Success Green" unless absolutely necessary for safety. Use the `primary` red for all "active" states and `secondary` greys for "inactive" states to maintain the signature look.
*   **Don't** crowd the cards. If a Bento module feels full, increase its span rather than shrinking the font size. Space is the luxury.

---

## 7. Glassmorphism Implementation Specs
When applying the "Glass" effect to a component (e.g., a User Profile modal):
1.  **Fill:** `surface-bright` at 70% opacity.
2.  **Backdrop Blur:** 24px.
3.  **Border:** 1px solid `surface-container-highest` at 30% opacity (The "Inner Glow").
4.  **Shadow:** Ambient Shadow (as defined in Section 4). 

This ensures the presence tracking system feels like a high-end physical dashboard made of light and glass.