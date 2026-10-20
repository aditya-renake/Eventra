# ⚡ HackSeries 2026 — Design System & UI/UX Specification (`design.md`)

> **Design Theme:** Futuristic Institutional Cyber-Glass  
> **Institutional Host:** ACES (Association of Computer Engineering Students)  
> **Institution:** Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune  
> **Aesthetic Philosophy:** Premium collegiate prestige meets cutting-edge cybernetic glassmorphism. High contrast, ambient floating particles, holographic passes, and tactile audio-visual micro-interactions.

---

## 1. Color System & Design Tokens

### 1.1 Institutional Palette

| Token Name | Hex Code | Role & Usage |
|---|---|---|
| `--dyp-crimson` | `#b22b2f` | **Primary Brand Accent.** Used for primary action buttons, header badges, active tabs, and error alerts. |
| `--dyp-gold` | `#d1a550` | **Prestige / Award Accent.** Used for prize pool counters, VIP badges, highlights, and gradient stops. |
| `--aces-cyan` | `#22d3ee` | **Cyber Tech Accent.** Used for ACES club badges, verified checkmarks, scan lasers, and cybernetic glows. |
| `--bg-base` | `#030712` | Deepest cybernetic charcoal black. Primary application canvas background. |
| `--bg-surface` | `#0b0f19` | Surface cards, modals, and container backgrounds. |
| `--bg-elevated` | `#111827` | Elevated dropdowns, tooltips, and interactive inputs. |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Standard card and modal borders. |
| `--border-highlight` | `rgba(178, 43, 47, 0.35)` | Active border focus and hover glow. |
| `--text-main` | `#f9fafb` | Primary high-contrast text. |
| `--text-muted` | `#9ca3af` | Secondary descriptive labels and subtitles. |
| `--text-dim` | `#6b7280` | Timestamps, metadata, and footer copyright. |

### 1.2 Glassmorphism System
All cards, modals, and navigation bars utilize multi-layer CSS glassmorphism:
```css
.glass-card {
  background: rgba(11, 15, 25, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
}
```

---

## 2. Typography Hierarchy

The system loads **Inter** and **Outfit** via Google Fonts with monospace fallbacks for cryptographic hashes and ticket tokens:

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, .brand-title {
  font-family: 'Outfit', 'Inter', sans-serif;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.ticket-id, .token-hash, code {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-weight: 700;
  letter-spacing: 0.05em;
}
```

### Scale:
- **Display 1 (Landing Hero):** `48px` / Line Height `1.1` / Weight `900`
- **H1 (Page Headers):** `32px` / Line Height `1.2` / Weight `800`
- **H2 (Section Titles):** `24px` / Line Height `1.3` / Weight `700`
- **H3 (Card Headers):** `18px` / Line Height `1.4` / Weight `700`
- **Body Regular:** `14px` / Line Height `1.6` / Weight `400`
- **Caption / Meta:** `12px` / Line Height `1.4` / Weight `600`
- **Micro Badge:** `10px` / Text Transform `uppercase` / Weight `800`

---

## 3. Motion & Micro-Interactions

### 3.1 Holographic Shimmer Effect (`DigitalPassPage.jsx`)
The digital pass mimics an irredescent physical conference badge with a dynamic continuous light shimmer across its diagonal:
```css
@keyframes holographicShimmer {
  0% { transform: translateX(-150%) rotate(35deg); }
  50% { transform: translateX(150%) rotate(35deg); }
  100% { transform: translateX(150%) rotate(35deg); }
}

.holographic-pass::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    60deg,
    transparent 40%,
    rgba(255, 255, 255, 0.15) 50%,
    transparent 60%
  );
  animation: holographicShimmer 6s infinite ease-in-out;
  pointer-events: none;
}
```

### 3.2 Floating Ambient Constellation (`InteractiveBackground.jsx`)
- Renders an interactive HTML5 `<canvas>` positioned fixed behind all UI elements.
- Simulates 60 floating nodes with subtle velocities that draw connective glowing filaments when nodes come within 100px of each other.
- Low CPU usage with auto-throttling on low-battery mobile devices.

### 3.3 Celebratory Confetti Particle Burst (`confettiBurst.js`)
- Triggered instantly on successful gate check-in.
- Fires 80 multi-colored particles (Crimson, Gold, Cyan, White) from the center of the viewport that cascade downwards under gravitational deceleration.

---

## 4. Tactile Sound Design (Web Audio API)

Sound feedback plays a crucial role in preventing gate volunteers from needing to constantly stare at screens in direct sunlight:

| Event | Waveform | Frequency & Envelope | Psychological Effect |
|---|---|---|---|
| **Gate Check-In Success** | Sine + Triangle | Ascending two-tone: `587 Hz (D5)` to `880 Hz (A5)` / `1174 Hz (D6)` | Clear, celebratory, confirms express entry. |
| **Duplicate Scan Warning** | Sawtooth | Double-buzzer: `160 Hz` low pulse repeated twice | Alerting, prompts volunteer to stop the attendee. |
| **Forgery / Alteration Alert** | Square | High-pitch sharp dischord: `220 Hz` rapidly shifting to `110 Hz` | Urgent security signal, draws immediate attention. |
| **Frame Acquisition Beep** | Sine | High chirp: `1200 Hz` for `40ms` | Haptic confirmation that QR code was read. |

---

## 5. Responsive Layout Strategy

- **Mobile First (0px – 640px):** Single-column layout. Camera scanner occupies 100% width. Dashboard converts tables to scrollable card decks. Pass page expands to full-bleed mobile badge.
- **Tablet (641px – 1024px):** Dual-column layout for dashboard and event catalog.
- **Desktop (1025px+):** Command center wide-screen console with side-by-side scanner terminal and real-time live attendance feed.
