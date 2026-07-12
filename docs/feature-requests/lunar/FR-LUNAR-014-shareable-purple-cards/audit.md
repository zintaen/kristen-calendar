---
fr_id: FR-LUNAR-014
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 6
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 6 ISS >= 6 minimum; APCA determinism + Web Share fallback verification rules applied)
---

## §1 - Verdict summary

FR-LUNAR-014 specifies the purple-tone shareable card feature. Scope: 13 BCP-14 clauses in §1 (Canvas 2D 1080px, font loading, APCA gate, two templates, Web Share API, fallback download, preview 360px, CardData from the layer above, pure-Canvas motifs). §2 has 6 rationale paragraphs explaining the choice of Canvas 2D, the 1080px size, compile-time APCA, Web Share, and separating CardData. §3 defines `CardData`, `CardTheme`, `CARD_THEMES`, `drawCard`, `loadCardFont`, `exportCardBlob`, `shareCard`. §4 has 13 testable ACs. §5 has 5 test cases using vitest/jest with node-canvas and calcAPCA. §10 has 10 failure-mode rows. §11 has 7 implementation notes. Maps to PRD FR-F03 and §13 (shareable cards, APCA Lc >= 75, Be Vietnam Pro).

## §2 - Findings (all resolved during authoring)

### ISS-001 - html2canvas/DOM-to-image gives unstable font-render results
The html2canvas library often hits CORS when the canvas contains external images, and fonts do not match the browser's real render. Resolved: DEC-LUNAR-140 + §1 #1 requires the Canvas 2D API; disallowed_tools states it clearly.

### ISS-002 - APCA can be violated silently when the color token changes
Without a compile-time gate, pale purple on white can pass WCAG AA but fail APCA Lc. Resolved: DEC-LUNAR-141 + §1 #5 assertion via apca-w3 in the test suite; AC #3, #4 asserting >= 75; §5 loops over every CARD_THEME.

### ISS-003 - Web Share API Level 2 (file sharing) is not available on desktop browsers
Without a fallback, desktop users are stuck and cannot download the image. Resolved: DEC-LUNAR-142 + §1 #8 fallback download via `<a download>`; AC #7; test "shareCard downloads when canShare unavailable".

### ISS-004 - The "Be Vietnam Pro" font may not be loaded when drawCard runs
If the canvas draws text before the font is ready, it falls back to sans-serif without notice and the card gets the wrong font. Resolved: §1 #4 load the font first, 3s timeout, fallback + log; AC #10; test "drawCard runs with fallback font when load fails".

### ISS-005 - Recomputing CardData in the renderer creates a circular coupling with amlich-core
If the renderer pulls a dependency on amlich-core, it cannot be tested independently. Resolved: DEC-LUNAR-143 + §1 #11 requires receiving pre-computed CardData; disallowed_tools states it clearly; AC #11 asserts no network call.

### ISS-006 - The card size is unclear; preview vs export could be confused
It is unclear whether the real 1080px canvas or the 360px preview is the shared file. Resolved: §1 #2, #9 clearly separate the 1080px export canvas vs the 360px preview CSS scale; AC #1, #8 test both; §3 two separate components ShareCard and ShareCardSheet.

## §3 - Resolution

All 6 technical issues resolved during authoring. **Score = 10/10.** Ready to transition draft -> ready_to_implement.

## §4 - Independent adversarial pass (2026-06-27)

The independent reviewer confirmed FR-014 receives `CardData` from FR-007's DayInfo (DEC-LUNAR-143), and does not recompute - correct. One MINOR (an internal APCA contradiction) fixed: §1 #5 said "every text/background pair MUST be Lc >= 75" but the §5 test asserted secondary at >= 60, and §11 required a watermark Lc >= 90 without a test. Synced: §1 #5 states thresholds by font size (primary >= 75, secondary >= 60, watermark >= 90); added `apcaLc.watermark` to `CardRenderResult`; added the watermark >= 90 assertion in §5 and AC #12; updated the example payload. **Independent score (pre-fix): 8.5/10.**

---

## §5 - Readiness pass (2026-06-28)

A second pass by an independent reviewer.

- **AC #14 added.** §1 #11 (MUST receive CardData from the layer above, MUST NOT recompute DayInfo) previously had only AC #11 (no-network) as an indirect guard. Added AC #14 and the test `card-renderer does not re-import amlich-core` checking the static exports do not contain a symbol from amlich-core (DEC-LUNAR-143).
- **APCA thresholds consistent.** §1 #5 splits thresholds by font size (primary >= 75, secondary >= 60, watermark >= 90); §4 AC #3/#4/#12; §5 test loop over CARD_THEMES and the watermark assertion - all matched after the prior independent pass.
- **Complete traceability.** Every MUST clause §1 #1-#11 has a matching AC. §1 #12/#13 are SHOULD/COULD; a full AC is not required.

**Verdict: PASS. Ready for implementation.**

*End of audit FR-LUNAR-014.*

*End of audit FR-LUNAR-014.*
