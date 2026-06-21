---
name: Premium Barber Management
colors:
  surface: '#f8f9ff'
  surface-dim: '#d8dae0'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fa'
  surface-container: '#eceef4'
  surface-container-high: '#e6e8ef'
  surface-container-highest: '#e0e2e9'
  on-surface: '#181c21'
  on-surface-variant: '#47464b'
  inverse-surface: '#2d3136'
  inverse-on-surface: '#eef1f7'
  outline: '#77767b'
  outline-variant: '#c8c5cb'
  surface-tint: '#5f5e61'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1e'
  on-primary-container: '#858387'
  inverse-primary: '#c8c6ca'
  secondary: '#7c5809'
  on-secondary: '#ffffff'
  secondary-container: '#ffcd77'
  on-secondary-container: '#795506'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c1a'
  on-tertiary-container: '#848481'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e1e5'
  primary-fixed-dim: '#c8c6ca'
  on-primary-fixed: '#1b1b1e'
  on-primary-fixed-variant: '#47464a'
  secondary-fixed: '#ffdeaa'
  secondary-fixed-dim: '#f0bf6b'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5f4100'
  tertiary-fixed: '#e4e2df'
  tertiary-fixed-dim: '#c8c6c3'
  on-tertiary-fixed: '#1b1c1a'
  on-tertiary-fixed-variant: '#474745'
  background: '#f8f9ff'
  on-background: '#181c21'
  surface-variant: '#e0e2e9'
typography:
  h1:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  h1-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
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
  container-padding: 24px
  gutter: 16px
  sidebar-width: 260px
  sidebar-collapsed: 80px
---

## Brand & Style
The brand personality is sophisticated, authoritative, and precision-oriented. It targets high-end barbershop owners who value efficiency without sacrificing aesthetics. The design style is **Minimalist / Corporate Modern**, utilizing high-contrast typography and a restrained palette to create a "grooming salon" atmosphere rather than a cluttered workshop. 

The visual narrative avoids common industry clichés, focusing instead on sharp lines, ample breathing room, and a sense of luxury through gold accents and deep graphite surfaces. The UI should feel like a premium service in itself—clean, professional, and effortless.

## Colors
The palette is built on a foundation of **Graphite** and **Off-white** to ensure a timeless, high-end feel. 

- **Graphite (#1A1A1D):** Used for structural elements like the sidebar and headers to provide a strong anchor for the application.
- **Gold (#C79A4A):** Reserved exclusively for primary actions, success highlights, and premium touchpoints. It should be used sparingly to maintain its impact.
- **Off-white (#F6F4F1):** The primary canvas color. It is softer than pure white, reducing eye strain during long periods of dashboard management.
- **Medium Gray (#8D9096):** Used for metadata, borders, and icon states to maintain hierarchy without competing with primary content.

## Typography
The typography system pairs the geometric strength of **Montserrat** (substituted for Poppins for a slightly more "editorial" premium feel) with the utilitarian precision of **Inter**. 

Headlines use tight letter-spacing and bold weights to command attention. Body text prioritizes legibility, especially for appointment times and financial data. Label styles are frequently uppercased with increased tracking to denote categorization and status without needing excessive weight.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid grid**. The sidebar is a fixed Graphite pillar on the left, while the main content area utilizes a fluid 12-column grid that scales based on screen size. 

- **Desktop:** 24px margins, 16px gutters.
- **Tablet:** 16px margins, 12px gutters.
- **Mobile:** 12px margins, single-column vertical stack.

Spacing follows an 8px rhythm. Padding within cards and modals should favor "generosity" to evoke a premium, unhurried feeling.

## Elevation & Depth
Hierarchy is established through **Tonal Layering** rather than aggressive shadows. 
- **Level 0:** Main background (Off-white).
- **Level 1:** Content cards and surfaces. These use a very subtle, diffused shadow (Blur 12px, Opacity 4%, Color: Graphite) to lift them slightly from the background.
- **Level 2:** Modals and dropdowns. These use a crisp border (1px, Graphite at 10% opacity) and a more pronounced shadow to indicate top-level interaction.
- **Sidebar:** Treated as a deep-layer element (Graphite background) with no shadow, acting as the "foundation" of the navigation.

## Shapes
A **Rounded (0.5rem / 8px)** strategy is applied to all primary UI elements, including cards, buttons, and input fields. This provides a modern, approachable feel that balances the "sharpness" of the Graphite/Gold color scheme. 

- Large containers (like the Sidebar or full-screen modals) use **16px (rounded-lg)** for a softer transition.
- Status badges and small utility tags use a **Pill-shape** to distinguish them from interactive buttons.

## Components

### Sidebar
The sidebar is the platform's anchor. Use the Graphite (#1A1A1D) background. Menu items should be Medium Gray, turning White or Gold when active. The "HB" head icon should be placed at the top as a collapsed state logo, while the full logo appears in the expanded view.

### Metric & Appointment Cards
Cards use a White surface on the Off-white background. 
- **Metric Cards:** Large Montserrat numbers in Graphite with secondary labels in Medium Gray.
- **Appointment Cards:** Feature a vertical "status stripe" on the left edge. The client name is bold, with the time clearly displayed in a high-contrast label.

### Action Buttons
- **Primary:** Gold (#C79A4A) background with Graphite text for maximum legibility and a luxury feel.
- **Secondary:** Transparent background with a 1px Graphite border.
- **Ghost:** No border, Medium Gray text, used for less frequent actions like "Cancel" or "Back."

### Form Inputs
Inputs feature a subtle Off-white fill and a 1px border (#D1D5DB). On focus, the border transitions to Gold. Labels sit above the input in `label-sm` typography.

### Status Badges
Badges are pill-shaped with a low-opacity background of the status color and a high-contrast text label:
- **Pendente:** Amber.
- **Confirmada:** Blue.
- **Em atendimento:** Gold.
- **Concluída:** Green.
- **Cancelada:** Red.