# PRD + SRS - Vietnamese Lunar-Calendar Reminder App ("Genie Am Lich" by CyberSkill)

> A foundation document combining the **Product Requirements Document (PRD)** + **Software Requirements Specification (SRS)**. Written for Stephen Cheng (founder of CyberSkill, Ho Chi Minh City). Goal: enough technical detail to be broken directly into tasks / tasks. Technical terms, library names, APIs, and code are kept in English.

---

## TL;DR (core conclusions - 3 points)

- **Recommended architecture:** build one **shared TypeScript core library** (`@cyberskill/amlich-core`) that computes the lunar calendar **on-device** using the Ho Ngoc Duc algorithm (Vietnam time zone UTC+7, meridian 105E), imported into all 3 clients - **Web (Next.js/React), iOS (Capacitor wrapping the web app), and the Zalo Mini App (zmp-ui/zmp-sdk)** - plus a **thin serverless backend** only to call the Claude API and ZNS. This approach lets you write the lunar-calendar logic once, reuse it 100%, and optimize cost for a product that starts out personal.
- **Two-phase scope:** a personal MVP (for the wife) focused absolutely on *reminders for Ram / Mung Mot / death anniversaries* using **local notifications** + a purple interface + a lunar-solar month calendar; the later commercial version turns on **ZNS (Zalo Notification Service), AI Genie (Claude API), auspicious-day viewing (Hoang dao/Hac dao), the iOS widget, family sharing, and shareable cards**.
- **Technical risks to handle from the start:** (1) leap months and the fact that the Vietnamese lunar calendar differs from the Chinese one (1985 differs by 1 month; 2007, 2030, 2053 differ by 1 day) - cross-checking against the Ho Ngoc Duc calendar is mandatory; (2) iOS allows **a maximum of 64 pending local notifications** per app, so a "rolling reschedule" strategy is required; (3) **PDPL (the Personal Data Protection Law) takes effect 2026-01-01**, so even the personal version must be designed privacy-first.

---

## Key Findings (the key discoveries that shaped this document)

1. **The lunar-calendar algorithm is the core asset and already has a canonical solution.** The Ho Ngoc Duc algorithm (based on Jean Meeus's astronomical formulas, *Astronomical Algorithms* 1998) is the gold standard for the Vietnamese lunar calendar. It can be implemented in-house with high accuracy for roughly the years ~1200-2199. All constants have been confirmed (see the Lunar Algorithm Spec section). No runtime API call is needed - only about ~300 lines of TypeScript.

2. **The VN/CN difference is due to the time zone, and it is real.** The Vietnamese lunar calendar is computed for **meridian 105E (UTC+7)**, China's for **120E (UTC+8)**. When the Soc (New Moon) or a Principal Term falls near midnight, a one-hour difference can push the date by 1 day, or place a leap month differently. A classic example: in **1985** the Vietnamese Tet was **one month earlier** than the Chinese one. In the 21st century, according to Ho Ngoc Duc's official site, there are **exactly 3 years** where the two countries' Tet differs by 1 day: **2007 (Feb 17 vs Feb 18), 2030 (Feb 2 vs Feb 3), 2053 (Feb 18 vs Feb 19)**. -> The validation requirement must check exactly these years.

3. **The Zalo Mini App is the strongest distribution channel in Vietnam for the commercial version.** Zalo reached **nearly 80 million users and about 2.1 billion messages/day as of the end of 2025** (Vietcetera, 2026-01). The Mini App runs on React + `zmp-ui` (components) + `zmp-sdk/apis` (getUserInfo, getPhoneNumber, getLocation, Storage, Camera, ...). **An important limitation:** a Mini App **cannot** send push notifications on its own the way a native app does - to remind via Zalo you must use **ZNS** through a **Zalo Official Account (OA)**.

4. **ZNS has strict rules but is cheap.** The price is **~200 VND per successfully sent message** (VietGuys: *"The price for sending a successful ZNS message is approximately 200 VND, with no limits on the frequency of monthly content sent"*), charged only on successful delivery. Constraints: you must use a **template pre-approved by Zalo** (up to ~400 characters), it must include **at least 1 personalization parameter** (name, date, ...), **purely promotional content is banned**, it may only be sent to people who already have a transactional relationship and have provided their phone number, it may only be sent **within the 06:00-22:00 window**, and **no more than 7 days before/after the event**. -> Suitable for reminding "tomorrow is Ram", not for marketing.

5. **iOS notifications have a hard limit.** iOS **keeps at most 64 pending local notifications** per app; per Apple's documentation (and Apple Developer Forums thread 811171): *"the system keeps the soonest-firing 64 notifications... and discards the rest."* Because recurring lunar events do not map to fixed solar dates, you cannot pre-schedule an unlimited number. -> You must use a **rolling window**: each time the app opens, call `removeAllPendingNotificationRequests()` and then reschedule the 64 (or fewer) nearest events.

6. **Web push on iOS is very limited.** Web Push only works from **iOS 16.4+** and **only when the PWA is "Added to Home Screen"** (it does not run in a Safari tab), with no silent push and no background sync. -> A web app is NOT reliable enough as the main reminder channel on iPhone; this is why there should be a native Capacitor app for iOS.

7. **The Claude API is cheap enough for the Genie feature.** **Claude Haiku 4.5** is priced at **$1.00 / 1M input tokens and $5.00 / 1M output tokens** (Anthropic), reduced by up to 90% with prompt caching and 50% with batch. For personal/family volume the AI cost is nearly negligible; it must be called through a **serverless proxy** to hide the API key.

8. **PDPL is already in effect.** The **Personal Data Protection Law (Law No. 91/2025/QH15)** was passed on 2025-06-26, **effective 2026-01-01** (Tilleke & Gibbins; EY Vietnam); Decree 356/2025/ND-CP (issued 2025-12-31) provides implementation guidance and replaces Decree 13/2023. Penalties: cross-border data transfer done wrong is fined up to **5% of the previous year's revenue**; illegal data trading up to **10x the illicit gain**; other violations have a **cap of 3 billion VND**. Small businesses/startups get a **5-year grace period** for DPIA and DPO. **Processing data for personal/household purposes is exempt** - so the personal MVP is nearly out of scope, but the commercial version is not.

9. **APCA Lc >= 75 is achievable with purple tones but requires discipline.** Lc 75 is the minimum threshold for body text (~18px/400), Lc 90 is the preferred level. Dark purple on a cream/white background is easy to achieve; light purple on white is hard - it must be checked with the APCA tool (`apca-w3`).

---

## Details

### 1. Product Vision & Goals

**Vision:** a beautiful, warm, purple-toned "lunar-calendar assistant" app that helps Vietnamese people - starting with the founder's wife - **never forget** the important lunar dates (Ram, Mung Mot, death anniversaries, festivals), and understand the *meaning* as well as *how to prepare* for each occasion. Expand into a commercial product via the Zalo Mini App + iOS App Store channels.

**Product goals:**
- **G1 (MVP):** accurate, reliable reminders for Ram/Mung Mot/death anniversaries with a customizable lead-time (remind 1 day ahead so there is time to buy offerings).
- **G2:** on-device, offline lunar-calendar computation, absolutely accurate to Vietnam time.
- **G3:** a personalized experience for an actress who loves the color purple (purple interface, profession-specific features).
- **G4 (commercial):** distribute via the Zalo Mini App + iOS; monetize via premium/AI; comply with PDPL.

**Brand-connecting slogan:** inheriting the CyberSkill spirit *"Hien Thuc Hoa Y Chi / Turn Your Will Into Real"* - turning the notion of "remembering grandparents' death anniversaries" into an action supported by technology.

---

### 2. Target Users / Personas

**Persona 1 - "Chi Linh", the primary user (the founder's wife).**
- An actress (dien vien), busy filming schedule, tends to forget lunar dates.
- Loves purple; high aesthetic sense; likes beautiful things that are easy to share on social media.
- Needs: reminders for Ram/Mung Mot to make offerings; remembering the death anniversaries on both sides of the family; auspicious-day viewing to sign contracts / start filming / launch a film; suggestions for the offering tray.
- Primary device: iPhone. Uses Zalo daily.

**Persona 2 - "Co Hoa", a future commercial user (a homemaker/older person in charge of the incense-and-ancestor duties).**
- 35-60 years old, the "keeper of the keys" for the family's ancestor-worship and death-anniversary duties.
- Needs: reminders for all the clan's death anniversaries; sharing reminders with children and grandchildren (family sharing); guidance on the offering tray and prayers.
- Access channel: the **Zalo Mini App** (no need to install an app from a store) + ZNS.

**Persona 3 - "Anh Tuan", a businessperson.**
- Needs auspicious-day viewing for grand openings, Hoang dao days, Hoang dao hours, compatibility with one's age.

---

### 3. User Stories / Use Cases (condensed, as the basis for the tasks)

- US-1: *As Chi Linh, I want to be reminded 1 day ahead when Ram is approaching so there is time to buy fruit for the offerings.*
- US-2: *As Chi Linh, I want to enter my grandmother's death anniversary by its lunar date once, and have the app automatically remind me on the corresponding solar date each year.*
- US-3: *As Chi Linh, I want to ask the Genie "What do we offer on Ram of the seventh month?" and receive an offering-tray suggestion + its meaning.*
- US-4: *As Chi Linh, I want to see which days next month are Hoang dao days so I can choose a day to sign a film contract.*
- US-5: *As Co Hoa, I want the whole family to receive a reminder for a shared death anniversary.*
- US-6: *As Anh Tuan, I want to see today's can-chi, Truc, and Hoang dao hours right on the home screen / widget.*
- US-7: *As Chi Linh, I want a beautiful purple-toned card that says "Today is Ram of the first month" to share on Instagram.*

---

### 4. Functional Requirements (numbered so they can be broken into tasks)

**Group A - Lunar core**
- **TASK-A01:** The system MUST convert solar <-> lunar dates on-device for every day in the range 1900-2199, in Vietnam time (UTC+7, meridian 105E).
- **TASK-A02:** It MUST correctly identify the leap month (thang nhuan) and mark it "N" / "nhuan".
- **TASK-A03:** It MUST compute the can-chi of the day, month, and year (Giap Ty ... Quy Hoi) and the year's zodiac animal per the **Vietnamese** zodiac (Cat replaces Rabbit, Buffalo replaces Ox).
- **TASK-A04:** It MUST compute the 24 tiet khi and the 12 Principal Terms (to determine the 11th month that contains Dong chi).
- **TASK-A05:** It MUST display the month calendar as a grid: each cell has the solar date (large) + the lunar date (small, in the corner) + can-chi + a tiet khi marker + holidays.
- **TASK-A06:** It MUST work fully offline (no network call to compute dates).

**Group B - Reminders - the heart of the app**
- **TASK-B01:** The user MUST be able to create monthly reminders for Ram (15 lunar) and Mung Mot (1 lunar), toggled on/off individually.
- **TASK-B02:** The user MUST be able to enter a death anniversary by its **lunar date** (lunar day + month, with an optional leap-month flag), entered **once**, with the app automatically computing the recurring solar date each year.
- **TASK-B03:** The user MUST be able to create any custom lunar reminder (for example "the day of the God of Wealth, the 10th of the first lunar month").
- **TASK-B04:** Each reminder MUST have a customizable **lead-time**: on the day / 1 day before / 3 days before / 1 week before; and a specific **reminder time**.
- **TASK-B05:** The system MUST schedule local notifications ahead of time, using a **rolling window** strategy that does not exceed 64 pending on iOS (see Notification Architecture).
- **TASK-B06:** It MUST handle the time zone and DST correctly (Vietnam has no DST, but the computation must be locked to Asia/Ho_Chi_Minh to stay safe when the user travels abroad).
- **TASK-B07:** The user MUST be able to view the list of upcoming reminders (with the corresponding solar date).
- **TASK-B08:** (Commercial) The system MUST be able to send reminders via **ZNS** to Zalo users who have consented.

**Group C - AI Genie (Claude)**
- **TASK-C01:** The Genie MUST answer questions about Vietnamese customs/rituals (what to offer, meaning, taboos).
- **TASK-C02:** The Genie MUST suggest an **offering tray / feast tray** for each occasion + an offerings checklist.
- **TASK-C03:** The Genie MUST explain the meaning of each important lunar date.
- **TASK-C04:** The Genie MUST generate a **personalized reminder** (for example, a warm-voiced reminder "Tomorrow is grandma's death anniversary, remember to buy yellow chrysanthemums").
- **TASK-C05 (optional):** The Genie MAY read the reminder aloud (TTS).
- **TASK-C06:** Every Claude call MUST go through a **serverless proxy**; the API key MUST NOT be embedded in the client.

**Group D - Ritual / offering-tray suggestions (static content, no AI needed)**
- **TASK-D01:** The app MUST have a content database for the main occasions (see the table below): name, lunar date, meaning, suggested offering tray, checklist.
- **TASK-D02:** Each reminder MUST link to its corresponding content page.

**Group E - Personalization for the actress & auspicious-day viewing**
- **TASK-E01:** The app MUST have a "Good-day picker" (auspicious-day viewing): for a type of activity (signing a contract, starting filming, launching/premiere, grand opening), list the Hoang dao days within a time range.
- **TASK-E02:** It MUST display Hoang dao/Hac dao days, Truc (the 12 Truc), the Twenty-eight Mansions (28 stars), and the day's can-chi.
- **TASK-E03:** It MUST display the Hoang dao/Hac dao hours of the day (6 Hoang dao hours / 6 Hac dao hours across the 12 canh gio).
- **TASK-E04 (optional):** Integrate the filming/work calendar (EventKit / manual entry) to suggest days.

**Group F - Creative / expansion**
- **TASK-F01:** An iOS home-screen widget (WidgetKit) showing today's lunar date + can-chi + Hoang dao hours.
- **TASK-F02:** An Apple Watch complication showing the lunar date.
- **TASK-F03:** Shareable cards (purple-toned, image export) to share on social media.
- **TASK-F04:** Family sharing - multiple members receive the same death-anniversary reminder.
- **TASK-F05:** Personalized notifications (choose tone of voice, emoji, image).

---

### 5. Non-Functional Requirements (NFR)

- **NFR-Accuracy:** Lunar-conversion results MUST match the Ho Ngoc Duc calendar 100% for the 1900-2199 range, including the edge-case years 1985, 2007, 2030, 2053. There is a fixed unit-test set (see fixtures).
- **NFR-Offline:** Computing dates and viewing the calendar MUST work without a network. Only the AI Genie and ZNS need a network.
- **NFR-Performance:** Converting 1 date < 5ms; rendering the month calendar < 100ms. (Pure JS libraries reach >270,000 conversions/second.)
- **NFR-Privacy/PDPL:** Store data **on-device** by default; if syncing to the cloud, there must be explicit, granular consent. Death anniversaries (tied to a deceased person, with names) are culturally sensitive data -> minimize it, do not sell it, do not transfer it across borders before a DPIA exists. Have a privacy policy in Vietnamese. (The purely personal/household version is exempt from PDPL, but design it so the commercial version complies.)
- **NFR-Accessibility:** Body text reaches **APCA Lc >= 75** (Lc 90 preferred for long paragraphs); support Dynamic Type; clear labels.
- **NFR-Localization:** Vietnamese is the primary language (Vietnamese-first), with correct Vietnamese diacritics; the i18n architecture is ready for English later.
- **NFR-Security:** API keys (Claude, ZNS/OA token) live only on the server; HTTPS; the OA token refreshes itself (the ZNS access token needs periodic refresh).

---

### 6. Lunar-Calendar Technical Specification (mathematical detail & implementation)

**6.1 Principles (per Ho Ngoc Duc, based on Meeus + the Explanatory Supplement to the Astronomical Almanac):**
1. The first day of a lunar month = the day that contains the **Soc (New Moon)**.
2. A normal year has 12 lunar months; a leap year has 13.
3. **Dong chi (Winter Solstice) always falls in the 11th lunar month.**
4. Leap year: the first month (after the 11th month) that **does not contain a Principal Term** is the leap month, named after the month before it + "nhuan".
5. Every calculation is based on **meridian 105E**, `timeZone = 7.0`.

**6.2 Confirmed constants (EXTREMELY IMPORTANT - do not confuse the 3 epochs):**
- Synodic month (the mean lunar cycle, used to index k): **`29.530588853`** days.
- The index-k epoch (mean new moon of 1/1/1900 as a JD): **`2415021.076998695`** - used in `convertSolar2Lunar`, `getLeapMonthOffset`.
- The Meeus mean-new-moon epoch (inside the `NewMoon` function): **`2415020.75933`**.
- The synodic-per-k coefficient inside `NewMoon` (Meeus): **`29.53058868`**.
- `getLunarMonth11` uses the integer **`2415021`** (this is Duc's intended design, not the decimal version).
- The J2000 epoch in `SunLongitude`: **`2451545.0`**, divided by **`36525`**.
- `dr = PI/180`; `T = k/1236.85` (Julian centuries from 1900).

**6.3 Core functions (TypeScript, ported from the canonical source):**
- `jdFromDate(dd,mm,yy)` -> Julian Day Number (handles the Julian/Gregorian switch at JD 2299161).
- `NewMoon(k)` -> the JD of the k-th Soc (Meeus polynomial with `T, T2, T3`, the correction series `C1`, and `deltat`).
- `SunLongitude(jdn)` -> the sun's longitude (radians).
- `getSunLongitude(dayNumber, tz) = INT(SunLongitude(dayNumber - 0.5 - tz/24) / PI * 6)` -> returns 0-11 (identifies the Principal Term).
- `getNewMoonDay(k, tz) = INT(NewMoon(k) + 0.5 + tz/24)`.
- `getLunarMonth11(yy, tz)` -> the starting day of the 11th lunar month that contains Dong chi.
- `getLeapMonthOffset(a11, tz)` -> the position of the leap month.
- `convertSolar2Lunar(dd,mm,yy,tz)` and `convertLunar2Solar(...)`.

**6.4 Why VN differs from CN:** because rule 5 uses 105E instead of 120E. When the Soc/Principal Term falls near midnight, the 1-hour difference between Hanoi and Beijing pushes the date to a different day -> the 11th month (containing Dong chi) differs -> the whole sequence of months and the leap month shifts. In 1984, Dong chi fell on Dec 21 in Hanoi time but Dec 22 in Beijing time -> the 1985 Tet in VN was one month earlier than in CN.

**6.5 Recommended libraries:**
- **Port the Ho Ngoc Duc algorithm to TypeScript yourself** as `@cyberskill/amlich-core` (strongly recommended - only ~300 lines, full control, correct for VN). References: `vanng822/amlich` (Node), `vanng822/camlich` (Python/C - has the full set of Meeus constants), `baolanlequang/VietnameseLunar-ios` (Swift, MIT), `nhatanh2996/LunarCalendar4J` (Java).
- **Cross-check during development:** `6tail/lunar-typescript` & `lunar-javascript` (very feature-rich: can-chi, Truc, the 28 stars, Hoang dao/Hac dao, than sat - but computed to the **Chinese 120E standard**, so use them ONLY to cross-check time-zone-independent values such as can-chi/Truc, NOT to determine the VN Soc day/leap month). Note that there is an npm package `min98/...` "Vietnamese Lunar Calendar Library - TypeScript" licensed *free for personal/non-commercial* - be careful about the license when commercializing.
- **Accuracy reference sources (gold):** the official Ho Ngoc Duc calculator (informatik.uni-leipzig.de/~duc/amlich, mirror xemamlich.uhm.vn, honguyenviet.com); the Hong Kong Observatory conversion table (note HKO uses 120E, use it for the CN cross-check).

**6.6 Validation dataset (unit-test fixtures):**

| Solar date | Lunar date | Can-chi year (VN zodiac) | Note |
|---|---|---|---|
| 29/01/2025 | 1/1/2025 | At Ty (Snake) | Tet 2025 |
| 17/02/2026 | 1/1/2026 | Binh Ngo (Horse) | Tet 2026 |
| 10/02/2024 | 1/1/2024 | Giap Thin (Dragon) | Tet 2024 |
| 22/01/2023 | 1/1/2023 | Quy Mao (Cat) | Tet 2023 (Cat, not Rabbit) |
| 02/02/1984 | 1/1/1984 | Giap Ty | Historical marker Duc published |
| 21/03-19/04/1985 | month 2 **nhuan** | At Suu | Leap year; VN Tet 21/01/1985 (1 month earlier than CN) |

The VN/CN divergence years of the 21st century need their own assertions: **2007, 2030, 2053**. Also add a round-trip test `L2S(S2L(d,m,y)) == (d,m,y)` sweeping 1900-2199.

---

### 7. Cultural content: the lunar occasions & offering trays (for TASK-D01)

| Occasion | Lunar date | Meaning | Suggested offering tray / offerings |
|---|---|---|---|
| **Mung Mot** (monthly) | 1 lunar | Start of the month, praying for peace | Incense, flowers, fruit, tea, sweets; vegetarian or savory depending on the household; best offered before noon |
| **Ram** (monthly) | 15 lunar | Full moon, worship of the Buddha and ancestors | Incense, flowers, five fruits, tea, vegetarian/savory dishes |
| **Giao thua** | the night of the 30th (or 29th) of the twelfth lunar month | Seeing off the old year, welcoming the new | An indoor + outdoor tray: boiled chicken, sticky rice, banh chung, five fruits, incense and lamps |
| **Mung 1 Tet** | 1/1 lunar | Lunar New Year (Tet Nguyen Dan) | Sticky rice, chicken, banh chung, fruit, a lavish tray; apricot/peach blossom branch |
| **Ong Cong Ong Tao** | the 23rd of the twelfth lunar month | The Kitchen Gods return to heaven to report | Carp (live or votive paper), Tao hats and robes, an offering tray, votive paper; offer before noon |
| **Ram of the first month (Tet Nguyen Tieu)** | 15/1 lunar | "A year of ceremonies is not worth the Ram of the first month"; Thuong nguyen | A vegetarian/savory tray offered to the Buddha & ancestors; visit the temple to pray for peace |
| **Via Than Tai** | 10/1 lunar | Praying for wealth (especially for businesspeople) | Flowers, fruit, the tam sen set, gold |
| **Tet Thanh Minh** | the third lunar month (~3-10/3) | Tomb-sweeping, "when drinking water, remember its source" | An offering tray at the ancestors' graves |
| **Gio To Hung Vuong** | 10/3 lunar | A national ceremony honoring the Hung Kings | Banh chung, banh giay, incense and flowers |
| **Tet Doan Ngo** | 5/5 lunar | "The insect-killing festival", warding off evil, the change of season | Fermented sticky rice, banh tro/banh u, plums, lychees, incense and flowers; offer during the Ngo hour (11-13h). Regional variations: che ke (Central), che troi nuoc/banh xeo (South) |
| **Vu Lan / Ram of the seventh month** | 15/7 lunar | Filial gratitude + the amnesty for wandering souls (offering to the lonely souls) - "the biggest offering tray of the year" | An ancestors' tray + a tray for the sentient beings/lonely souls (thin porridge, rice and salt, puffed rice, sweet potato, ...), releasing life, vegetarian food |
| **Tet Trung Thu** | 15/8 lunar | The reunion festival, children's festival | Mooncakes, a five-fruit tray, offering to the moon |
| **Personal death anniversary** | the lunar date of death | Remembering a loved one | A family feast tray according to each household's custom |

> **Content note:** Include regional variations (North/Central/South) and **avoid absolute spiritual assertions** - label them "for reference, per folk custom". This is static data, edited once, and needs no AI; the AI Genie is only for flexible Q&A and personalization.

---

### 8. Auspicious-day viewing - Hoang dao / Hac dao / Truc / 28 stars (for TASK-E)

- **Hoang dao/Hac dao days:** each day corresponds to one of 12 deities on day duty; 6 benevolent deities (Thanh Long, Minh Duong, Kim Quy, Bao Quang, Ngoc Duong, Tu Menh) -> Hoang dao (good); 6 malevolent deities (Bach Ho, Thien Hinh, Chu Tuoc, Thien Lao, Nguyen Vu, Cau Tran) -> Hac dao (bad). Determined by the **day's can-chi combined with the lunar month** (there is a fixed lookup table by the day's dia chi x the month).
- **Hoang dao/Hac dao hours:** the 12 canh gio (each hour is 2 clock-hours per the 12 zodiac animals); 6 Hoang dao hours / 6 Hac dao hours, looked up by the day's dia chi.
- **The 12 Truc** (Kien, Tru, Man, Binh, Dinh, Chap, Pha, Nguy, Thanh, Thu, Khai, Be): looked up by tiet khi + the day's dia chi; each Truc is suitable/unsuitable for a type of activity.
- **The Twenty-eight Mansions (28 stars):** each day has one star (Giac, Cang, ... Chan), good/bad for each activity; looked up cyclically along the calendar.
- **Implementation:** this is **time-zone-independent** data (based on the day's can-chi + tiet khi) -> you can use `lunar-typescript` to cross-check, but you should still compute the can-chi from the JDN yourself for consistency with the core. Label it "for reference, per folk feng shui".

---

### 9. System Architecture

```
            ┌──────────────────────────────────────────┐
            │   @cyberskill/amlich-core (TypeScript)    │
            │  - convertSolar2Lunar / Lunar2Solar       │
            │  - canChi, tietKhi, hoangDao, truc, 28 sao│
            │  - festival rules + recurrence engine     │
            │  - 100% offline, no deps, unit-tested     │
            └──────────────────────────────────────────┘
              ▲                ▲                    ▲
   ┌──────────┴───┐   ┌────────┴────────┐   ┌───────┴──────────┐
   │ Web (Next.js │   │ iOS (Capacitor  │   │ Zalo Mini App    │
   │ /React) PWA  │   │ wrap web build) │   │ (React+zmp-ui/   │
   │              │   │ + WidgetKit/    │   │  zmp-sdk)        │
   │              │   │  Watch (native) │   │                  │
   └──────┬───────┘   └────────┬────────┘   └───────┬──────────┘
          │                    │                    │
          └─────────────┬──────┴──────────┬─────────┘
                        ▼                  ▼
          ┌───────────────────┐  ┌────────────────────┐
          │ Serverless backend│  │ Local storage /     │
          │ (Vercel/Cloud fn) │  │ sync (Supabase opt) │
          │ - Claude proxy    │  └────────────────────┘
          │ - ZNS send (OA)   │
          │ - push (APNs opt) │
          └───────────────────┘
```

**Recommended stack (with rationale):**
- **Core:** pure TypeScript, zero-dependency -> absolute reuse across all 3 clients.
- **Web:** Next.js/React + Tailwind. The base for both the PWA and Capacitor.
- **iOS:** **Capacitor** wrapping that same web build (`@capacitor/local-notifications` for reminders, `@capacitor/push-notifications` if remote is needed). Reason: maximize code-sharing with the web, an HCMC web team is easy to hire; Capacitor is good enough for a "read & enter data" app like this. **The iOS widget (WidgetKit) and the Watch complication must be written in native Swift** in an `ios/App` directory (Capacitor allows adding a native target) because WidgetKit only supports SwiftUI. *If premium animation/native UI is needed later, consider React Native + Expo* - but for the MVP, Capacitor wins on speed and cost.
- **Zalo Mini App:** React + `zmp-ui` + `zmp-sdk/apis`, importing the same `amlich-core`. Store reminders with zmp Storage (small capacity limit -> store only settings + the reminder list, computing dates on-the-fly).
- **Backend:** serverless (Vercel Functions/Cloudflare Workers) - does only 2 things: proxy Claude and send ZNS via the OA. Stateless, cheap.
- **Sync (optional, commercial):** Supabase/Postgres for family sharing + multi-device sync; enable RLS, comply with PDPL.

---

### 10. Data Model

```
User { id, displayName, locale="vi-VN", timezone="Asia/Ho_Chi_Minh",
       theme="purple", phone? (for ZNS), consentFlags{} }

Reminder {
  id, userId, type: ENUM(RAM | MUNG_MOT | GIO | CUSTOM | FESTIVAL),
  title,
  lunarDay, lunarMonth, lunarYear?,        // year null if it repeats annually
  isLeapMonth: bool,                        // for a death anniversary falling in a leap month
  recurrence: ENUM(MONTHLY | ANNUAL | ONCE),
  leadTimes: [int days],                    // [0,1] = on the day + 1 day before
  notifyTime: "07:00",
  channels: [LOCAL, ZNS, PUSH],
  linkedContentId?,                         // to the ritual page
  sharedWith: [userId],                     // family sharing
  enabled: bool
}

OccurrenceCache {                           // cache of the pre-computed solar dates
  reminderId, gregorianDate, lunarLabel, computedAt
}

FestivalContent {                           // edited static data
  id, name, lunarDay, lunarMonth, meaning,
  offerings: [string], checklist: [string], region?: ENUM
}

DayInfo (computed, not stored) {
  solarDate, lunarDate, canChiDay/Month/Year, zodiac,
  tietKhi?, truc, sao28, isHoangDao, gioHoangDao: [ranges]
}
```

**The death-anniversary recurrence rule (key):** store the **lunar day + lunar month** (do not store the solar date). Each time you schedule, for each upcoming solar year, call `convertLunar2Solar(lunarDay, lunarMonth, targetLunarYear, isLeap)` to get the solar date. **Edge case handling:** if the entered lunar month was a leap month in that year but the current year does not have that leap month (or vice versa), apply the fallback rule (for example, a leap-month death anniversary -> offer in the corresponding normal month) and let the user choose.

---

### 11. Notification Architecture

**Local (iOS via Capacitor / WidgetKit background):**
- Use `UNUserNotificationCenter`. **The 64-pending limit** -> a **rolling reschedule** strategy: whenever the app opens (and via a `BGAppRefreshTask` in the background when permitted), call `removeAllPendingNotificationRequests()`, compute the 64 nearest occurrences from all enabled Reminders, then `add()`. Each notification carries `userInfo` (reminderId) for deep-linking.
- Schedule about ~6-12 months ahead (enough within the 64 slots for a personal user; if it exceeds that, prioritize by soonest time).
- Lead-time = creating multiple notifications for the same event (on the day + 1 day before, ...), counted toward the 64 budget.

**Web push:** only available on iOS 16.4+ once "Added to Home Screen"; Android/desktop use the Push API + Service Worker normally. -> Treat web push as **supplementary**, not the main channel on iPhone.

**ZNS (commercial, the Zalo channel):**
- Flow: a serverless cron scans Reminders that have `ZNS` -> for each event within the allowed window (<=7 days before/after, 06:00-22:00) -> call the ZNS API via the OA token (self-refreshing) with an **approved template** that has parameters (user's name, occasion name, date).
- Sample template (registered with Zalo): *"Hello {name}, tomorrow ({solar date}) is {occasion} ({lunar date}). Don't forget to prepare!"* - has >=1 parameter, no advertising.
- You may use a distributor (VietGuys, Infobip, 8x8) to simplify OA/ZCA onboarding, or integrate directly via the Zalo OA Open API.

---

### 12. AI Feature Architecture (Genie)

- **Model:** **Claude Haiku 4.5** by default ($1/$5 per 1M tokens) for customs Q&A & generating reminders; step up to Sonnet for complex questions if needed. Use **prompt caching** for the system prompt (background knowledge about Vietnamese customs) -> reduces input cost by up to 90%.
- **Proxy:** client -> serverless `/api/genie` -> Claude API (hide the key, rate-limit, minimal logging per PDPL). Do NOT send identifying data about the deceased outside unless necessary and with consent.
- **Prompt design:** the system prompt shapes the "Genie" persona (tied to CyberSkill's "Golden Genie" mascot - but it can be reskinned in purple for this product), a warm voice, correct-diacritic Vietnamese, knowledge about Ram/death anniversaries/festivals, always with the reminder line "for reference, per custom". Pass context: today's lunar date, the upcoming occasion, the reminder name.
- **Estimated cost:** with a family asking a few dozen questions/month, the cost is < a few thousand VND/month - negligible; the main risk is abuse -> set a per-user rate-limit.
- **Voice (TASK-C05):** use Vietnamese TTS (the Web Speech API on the web; AVSpeechSynthesizer on iOS) to read aloud the reminder the Claude model generates.

---

### 13. UI/UX Guidance (purple tone + actress + Vietnamese-first)

- **Purple theme (for Chi Linh):** build a **"purple style pack"** as a **sub-brand / extended theme** of the CyberSkill design system, not replacing the original brand (Umber #45210E, Ochre #F4BA17). How: keep the CyberSkill design-system's structural design tokens (spacing, typography scale, components), and **override the color tokens** to a purple palette (for example, a dark-purple primary for text/buttons, a purple-pink accent, and a warm cream background to harmonize with CyberSkill's "warm earth" DNA).
- **Typography:** use **Be Vietnam Pro** (the CyberSkill typeface, which supports Vietnamese diacritics well) - keeping brand consistency while being beautiful for Vietnamese.
- **Contrast:** every text/background color pair must reach **APCA Lc >= 75** (Lc 90 preferred for long passages). Because purple tends to fall into the mid-contrast range, **check it with `apca-w3`**: dark purple on a cream/white background is OK; **avoid** light purple on white for body text. Still run WCAG 2.x AA (4.5:1) in parallel for legal compliance.
- **Actress specifics:** make the good-day picker prominent for signing contracts/starting filming/launches; luxurious purple-toned shareable cards that are easy to post to Instagram; you may add a beautiful "nice days this month" card.
- **Vietnamese-first:** the entire UI in correct-diacritic Vietnamese; dates shown side by side as solar + lunar + can-chi; a friendly, warm way of phrasing.
- **Month calendar:** each cell has a large solar date + a small lunar date in the corner + a colored dot for days with a reminder/holiday; tapping a day -> details (can-chi, Truc, star, Hoang dao hours).

---

### 14. Phased Roadmap

**Phase 0 - Core (2-3 weeks):** Build & test `@cyberskill/amlich-core` (conversion, can-chi, leap month) with the 1900-2199 fixtures + edge years. *This is the highest technical risk -> do it first, test it thoroughly.*

**Phase 1 - Personal MVP (for the wife) (4-6 weeks):**
- Web/PWA + Capacitor iOS; purple theme; Be Vietnam Pro.
- TASK-A05 the month calendar; TASK-B01..B07 reminders for Ram/Mung Mot/death anniversaries/custom + local notifications (rolling 64); TASK-D static occasion content.
- Store on-device. No backend, no AI, no ZNS.
- **The "wife finds it useful" criterion:** used regularly for >=1 Ram/Mung Mot cycle, with no missed reminders.

**Phase 2 - Advanced experience (personal) (3-4 weeks):**
- TASK-F01 the iOS widget; TASK-E2/E3 can-chi + Hoang dao hours; TASK-F03 shareable cards; TASK-C AI Genie (Claude proxy).

**Phase 3 - Commercialization (6-10 weeks):**
- The Zalo Mini App client; OA + **ZNS**; family sharing (TASK-F04); cloud sync (Supabase); **PDPL compliance** (consent, privacy policy, DPIA if needed); TASK-E1 the full good-day picker; TASK-F02 the Watch.
- Monetization model: freemium (basic reminders free; AI Genie/advanced good-day/family premium).

---

### 15. Success Metrics

- **MVP (personal):** the wife uses it regularly for >=8 weeks; 0 missed reminders; "do you find it useful?" = yes -> the signal to go commercial.
- **Commercial:** D1/D7/D30 retention; the rate of reminders enabled per person; the average number of death anniversaries entered; the rate of opening the app from a notification; ZNS delivery rate; the rate of Genie use; premium conversion; installs via the Zalo Mini App.

---

## Recommendations (action steps + decision thresholds)

**Immediate phase (this week):**
1. **Initialize `@cyberskill/amlich-core`** - port the Ho Ngoc Duc algorithm to TypeScript with exactly the constants in section 6.2, and write the test suite using the fixtures from section 6.6. This is the riskiest work, do it first. **Pass threshold:** match the Ho Ngoc Duc calendar 100% for 1900-2199 including 1985/2007/2030/2053; if any year diverges -> stop, debug before building the UI.
2. **Set up the web/PWA + Capacitor iOS skeleton** with the purple theme + Be Vietnam Pro, importing the core.

**MVP phase (the next 4-6 weeks):**
3. Complete TASK-B (reminders + rolling 64 notifications) + the month calendar + the static occasion content. **Give it to the wife to use for real.**
4. **The go/no-go commercialization decision threshold:** if after ~8 weeks the wife uses it regularly and says "useful" -> proceed to Phase 3. If not -> refine the UX, do not rush to invest in ZNS/AI.

**When deciding to commercialize:**
5. Register a **Zalo OA + ZCA**, and draft & submit the **ZNS template** early (approval takes time). Consider going through a distributor (VietGuys/Infobip) to shorten onboarding.
6. **Comply with PDPL before collecting data from users outside the family:** a Vietnamese privacy policy, granular consent, minimal storage, no cross-border transfer that has not been assessed. Startups get a 5-year grace period for DPIA/DPO but **the consent obligations apply immediately**.
7. **Turn on the AI Genie with Claude Haiku 4.5 via a serverless proxy** + prompt caching + rate-limit. **Model-upgrade threshold:** only switch to Sonnet if Haiku's customs-answer quality is inadequate under real evaluation.

**Technical thresholds to monitor:**
- If Capacitor does not meet the performance/animation requirements -> consider React Native + Expo (but keep the `amlich-core` TypeScript unchanged).
- If a user's reminder count > ~50 -> review the 64-pending strategy, prioritizing by time.

---

## Caveats (limitations & risks to note)

- **Algorithm accuracy:** the published Ho Ngoc Duc algorithm is a **simplified version** compared to the high-accuracy online calculator; trustworthy for ~1200-2199. For a Soc/tiet khi that falls right at midnight (a few minutes), it can be off by 1 day in very distant years - **a cross-check is mandatory** against the gold source, and flag the suspect years. The Hong Kong Observatory also warns of a discrepancy around markers such as 2057-09-28.
- **Cultural content sources:** offering trays and auspicious-day viewing differ by region and have a belief element; many sources are blogs/commercial. You should **edit selectively, label them "for reference, per folk custom"**, and avoid absolute assertions - especially for Hoang dao/Hac dao/28 stars.
- **lunar-typescript/javascript use the CN standard (120E):** use them only to cross-check time-zone-independent values (can-chi, Truc); do NOT use them to settle the VN lunar date/leap month.
- **ZNS pricing & rules may change:** ~200 VND/message is a reference figure from a distributor; the template/time-window rules are managed and updated by Zalo - re-confirm at implementation time.
- **iOS background:** background scheduling on iOS is limited; the rolling reschedule depends on the user opening the app or on `BGAppRefreshTask` (its timing is not guaranteed). For a user who rarely opens the app + has many reminders, there is a risk of missing a slot - real-world testing is needed.
- **Web push on iPhone:** only runs when the PWA has been Added to Home Screen (iOS 16.4+), with ~10-15x lower reach than native - do not depend on it as the main reminder channel.
- **PDPL still has unclear points:** the relationship between PDPL and the Data Law/Decree 165, the definition of sensitive data, ... is still being clarified through decrees; you should consult legal counsel before broad commercialization.
- **Library licenses:** check licenses before commercializing (many MIT libraries are OK; some lunar-calendar packages say "free for personal/non-commercial").
- **Claude API pricing:** the $1/$5 for Haiku 4.5 is as of the research date; re-confirm on the Anthropic page when integrating.
