# BUKUDOMPET DESIGN SYSTEM & ANTI-AI SLOP MANIFESTO

## 1. Aesthetic Direction: "Duolingo Tactile Playfulness meets Cozy Pastel Finance"
BukuDompet MUST feel like a warm, tactile, cozy game—like a cross between Duolingo's rewarding progression and an illustrated pastel stationery journal. 

## 2. STRICT ANTI-AI SLOP RULES (ZERO TOLERANCE)
1. **NO AI Gradients:** Never use `bg-gradient-to-r from-indigo-500 to-purple-600` or any neon/cyberpunk gradients.
2. **NO Blurry Generic Shadows:** Never use standard `shadow-md`, `shadow-lg`, or `shadow-xl`. Every card and button MUST use crisp tactile bottom-lip borders or solid offset shadows (`border-2 border-[#3D352E] shadow-[0_4px_0_0_#3D352E]` or soft warm offset `shadow-[0_4px_0_0_#E2D9C8]`).
3. **NO Pure Black or Cold Gray:** Never use `#000000` or `gray-500`/`slate-500`. Use **Espresso Ink (`#3D352E`)** for primary text/borders and **Mocha Muted (`#7A6E65`)** for secondary text.
4. **NO Boring Fonts:** Load Google Fonts:
   - Headings & Gamification Numbers: `'Fredoka'` (Weights: 600, 700)
   - Body & UI Labels: `'Nunito'` (Weights: 600, 700, 800)
   - Currency & Receipts: `'JetBrains Mono'` (Weights: 600, 700)
5. **Tactile 3D Buttons (Duolingo Physics):**
   Every interactive button must have a 3D bottom lip that depresses when clicked:
   `border-2 border-[#3D352E] border-b-[5px] active:border-b-2 active:translate-y-[3px] transition-all duration-75 rounded-2xl font-bold`
6. **Chunky Progress Bars with Shine:**
   All XP, Budget, and Saving Challenge bars must be `h-5` or `h-6`, `rounded-full`, `border-2 border-[#3D352E]`, with an inner top white shine strip (`h-1.5 bg-white/40 rounded-full mx-2 mt-1`).

## 3. Color Palette Tokens (Cozy Pastel & Duolingo Pop)
- **Background Primary (Warm Oat Milk):** `#FFFDF7`
- **Background Secondary / Card Surface (Creamy Vanilla):** `#F7F2E7`
- **Interactive Card Surface (Pure Warm White):** `#FFFFFF`
- **Primary Ink & Outline (Espresso Brown):** `#3D352E`
- **Primary Accent / Income / Safe Budget (Matcha Sprout):** `#58CC02` (Lip: `#46A302`, Soft Bg: `#E5F9D7`)
- **Secondary Accent / XP / Level (Sky Blueberry):** `#38B6FF` (Lip: `#1E88E5`, Soft Bg: `#E0F4FF`)
- **Points / Coins / Streak Flame (Honey Butter Gold):** `#FFC800` (Lip: `#E5A400`, Soft Bg: `#FFF7D6`)
- **Expense / Wants / Warning (Cozy Peach Coral):** `#FF8B7B` (Lip: `#E06353`, Soft Bg: `#FFE8E5`)
- **Danger / Overbudget / Detective Alert (Berry Red):** `#FF4B4B` (Lip: `#EA2B2B`, Soft Bg: `#FFDEDE`)
- **Mystery / Companion Accent (Taro Lavender):** `#CE82FF` (Lip: `#A552DB`, Soft Bg: `#F5E6FF`)

## 4. Responsive Architecture (Mobile-First, Adaptive Desktop)
- **Mobile (< 768px):** App-like experience with a sticky top HUD (Streak, Points=Rp, Level, Companion Mini-Avatar) and a floating chunky bottom navigation bar (5 tabs max, central oversized `+ Catat` 3D button). All forms open in `vaul` spring bottom sheets.
- **Desktop (>= 1024px):** DO NOT just stretch mobile cards to 1200px wide! Use a **3-Column Cozy Bento Layout**:
  - **Left Sidebar (260px):** Navigation, Role Switcher, Streak Calendar, Daily Missions.
  - **Center Stage (Max 540px):** The Duolingo-style Adventure Cashbook Path & Quick Transaction Feed.
  - **Right Companion & Detective Panel (360px):** Interactive Virtual Companion Room, Spending Detective Radar, and Point Cashout Ticket widget.