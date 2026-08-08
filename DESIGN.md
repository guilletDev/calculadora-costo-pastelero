---
name: Premium Confectionery Logic
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#5b3f43'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#8f6f73'
  outline-variant: '#e4bdc2'
  surface-tint: '#bc004b'
  primary: '#b80049'
  on-primary: '#ffffff'
  primary-container: '#e2165f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2be'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5a5c5d'
  on-tertiary: '#ffffff'
  tertiary-container: '#737576'
  on-tertiary-container: '#fcfdfe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9de'
  primary-fixed-dim: '#ffb2be'
  on-primary-fixed: '#400014'
  on-primary-fixed-variant: '#900038'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  numeric-data:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  section-gap: 80px
  container-padding: 24px
  element-gap: 16px
  grid-margin: auto
  max-width: 1200px
---

## Brand & Style

This design system targets professional pastry chefs and artisanal bakery owners who require precision without complexity. The brand personality is **sophisticated, precise, and supportive**, elevating the act of cost calculation from a chore to a premium business ritual.

The visual direction is a refined **Minimalism** blended with **Modern Corporate** aesthetics. It prioritizes "breathing room" (generous whitespace) to reduce cognitive load during data entry. The interface uses a clean, high-contrast palette and expansive interactive areas to evoke a sense of calm and control.

Key characteristics:
- **Spatial Clarity:** Wide margins and large gutters inspired by high-end editorial layouts.
- **Architectural Depth:** Use of light and shadow to create a clear functional hierarchy.
- **Precision Typography:** Crisp, legible sans-serif typefaces that emphasize numerical data.

## Colors

The palette is anchored by **Primary Brand Pink**, used sparingly as a "surgical" accent for primary actions and critical data highlights. 

- **Primary:** A vibrant, high-end pink that signals confidence and brand identity.
- **Neutrals:** A range of grays from Charcoal (#1A1A1A) for headlines to Light Gray (#F3F4F6) for subtle background shifts.
- **Functional White:** The primary workspace color to maintain a "blank canvas" feel that minimizes distraction.
- **Border Palette:** Extremely light grays are used for structural definition without closing off the layout.

## Typography

The system utilizes **Manrope** for headlines to provide a modern, technical, yet approachable feel. **Inter** is used for body text and UI elements to ensure maximum legibility for ingredient lists and pricing tables.

- **Contrast:** Large, bold headlines create clear entry points for sections, while body text remains airy and light.
- **Numerical Focus:** Data points and currency values should use slightly heavier weights (Medium/SemiBold) to stand out against descriptive text.
- **Scale:** Maintain a strict hierarchical scale where the gap between headlines and body text is pronounced, emphasizing the premium "editorial" look.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict maximum widths to prevent line-length issues on ultra-wide monitors. 

- **Breathing Room:** We employ an 8px base unit, but lean heavily on larger increments (64px, 80px, 120px) for vertical section spacing to mirror the reference's open feel.
- **Grid:** A 12-column system for desktop, 6-column for tablet, and 2-column for mobile.
- **Margins:** Desktop margins are generous (minimum 10% of screen width) to center focus on the calculation "canvas."
- **Density:** Maintain low information density per square inch. Group related inputs into "islands" of content rather than a continuous wall of fields.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Soft Shadows**. 

- **The Canvas:** The main background is pure white or a very faint gray (#F8F9FA).
- **Surface Layers:** Primary cards use a white background to "pop" against light gray canvas areas. 
- **Shadow Profile:** Shadows are extremely diffused (e.g., `box-shadow: 0 10px 40px rgba(0,0,0,0.04)`). They should feel like an ambient glow rather than a harsh drop shadow.
- **Borders:** Use thin, 1px borders in a light gray (#E5E7EB) to define edges. Borders should disappear or soften when a shadow is applied to avoid visual clutter.

## Shapes

The shape language is defined by **High-Radius Curves**, conveying a friendly yet professional "app-like" experience.

- **Cards:** The signature element of this system. They must have a radius of 24px or higher to create a soft, premium feel.
- **Interactive Elements:** Buttons and inputs use a slightly tighter radius (8px-12px) to maintain a sense of functional precision while still relating to the card language.
- **Visual Harmony:** Ensure that nested elements (like a button inside a card) have a proportional radius to maintain geometric alignment.

## Components

### Buttons
- **Primary:** Solid Brand Pink, white text, 12px radius. High-padding (16px 32px).
- **Secondary:** Thin 1px border (#E5E7EB), charcoal text, no background.
- **Tertiary/Ghost:** No border, charcoal text, light gray background on hover.

### Cards
- **The "Recipe Card":** 24px radius, subtle shadow, 32px internal padding. 
- **Active State:** When a card is selected or being edited, the border color shifts to Brand Pink or the shadow depth increases slightly.

### Input Fields
- **Style:** Minimalist. No heavy backgrounds; use a light gray bottom border or a very subtle 4-sided stroke.
- **Focus State:** The border transitions to Brand Pink with a 2px outer "glow" of the same color at 10% opacity.
- **Labels:** Small caps or Inter SemiBold 12px, placed strictly above the input.

### Chips & Tags
- Used for ingredient categories (Dairy, Flour, etc.). Pill-shaped with a light gray background and dark gray text.

### Progress Indicators
- For recipe costing steps: Thin horizontal lines with circular nodes. Brand Pink indicates completion; Light Gray indicates "to-do."