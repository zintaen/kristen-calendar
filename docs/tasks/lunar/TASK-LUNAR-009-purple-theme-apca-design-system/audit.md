---
fr_id: TASK-LUNAR-009
audited: 2026-06-27
verdict: PASS (after revision)
score_pre_revision: 7.0/10
score_post_expansion: 9.0/10
score_post_revision: 10/10
issues_resolved: 7
template: engineering-spec@1
authoring_md_compliance: 2026-06-27 (rule 36 - 7 ISS >= 6 minimum; DEC-LUNAR-090..094 assigned; APCA Lc>=75/90 gate with apca-w3; 3-layer token structure; Be Vietnam Pro; warm cream #FDF6EC; base brand Umber/Ochre preserved)
---

## §1 - Verdict summary

TASK-LUNAR-009 specifies the purple style pack, a sub-brand extension of the CyberSkill design system and the visual foundation for the whole "Genie Am Lich" UI. Scope: 16 BCP-14 clauses in §1 (3-layer tokens, keep Umber/Ochre unchanged, full purple palette, cream background #FDF6EC, checkApca/assertApca via apca-w3, checkWcag in parallel, automatic test of every color pair, Be Vietnam Pro, Dynamic Type rem, Typography/Button/Card components, export PURPLE_TOKENS, no !important, Lc 90 body, error color). 7 rationale paragraphs in §2 explaining DEC-LUNAR-090..094. §3 has the full TypeScript types for the 3 token layers (PRIMITIVE/SEMANTIC/COMPONENT), the TYPOGRAPHY scale, the checkApca/assertApca/checkWcag/assertWcag21AA functions in apca.ts, and 3 React components (Typography, Button, Card). 15 ACs in §4. §5 has 9 concrete unit tests with the assertion |Lc|>=90 for text-primary, a "fail" gate test for purple-400, and Umber/Ochre preservation. §10 lists 10 failure rows. Maps to NFR-Accessibility (APCA Lc>=75/90), NFR-Localization (Be Vietnam Pro, Vietnamese-first), PRD §13 (purple sub-brand, warm earth DNA, does not replace the base brand).

## §2 - Findings (all resolved during authoring)

### ISS-001 - The base brand Umber/Ochre could be overridden without an explicit check
If a developer overrides the token, the brand violates DEC-LUNAR-090. Resolved: §1 #2 MUST NOT + DEC-LUNAR-090; §4 AC #2 asserts the hex value; §5 tests "brand-umber = #45210E" and "brand-ochre = #F4BA17"; disallowed_tools states the ban clearly.

### ISS-002 - APCA Lc >= 75 has no automatic gate, could ship pale purple as text
Without a CI check a developer could use purple-400 as the primary text - Lc < 75. Resolved: §1 #5 + DEC-LUNAR-091 + assertApca throws an Error; §5 test "Pale purple (purple-400) on the cream background does NOT have enough contrast"; §4 AC #8 confirms the gate works.

### ISS-003 - A white background #FFFFFF does not match the CyberSkill "warm earth" DNA
Dark purple on white reaches lower APCA than dark purple on cream. Resolved: §1 #4 + DEC-LUNAR-093 cream background #FDF6EC; §4 AC #3 asserts bg-default != #FFFFFF; §2 rationale explains luminance.

### ISS-004 - WCAG 2.x AA is not checked in parallel, missing a legal safety net
Some organizations still require WCAG 2.x; APCA alone is not enough. Resolved: §1 #6 + DEC-LUNAR-091 checkWcag/assertWcag21AA; §5 tests WCAG AA for text-primary and the button; §4 AC #6 and #7.

### ISS-005 - The Typography component uses px units for font-size, breaking iOS Dynamic Type
NFR-Accessibility requires Dynamic Type support; px hard-locks the font size. Resolved: §1 #9 MUST use rem/em; §5 test regex /rem$/ checks every fontSize; §4 AC #10.

### ISS-006 - The 3 token layers are unclear (flat or mixed), hard to maintain
If the tokens are flat then semantic and primitive mix, and overrides hit the wrong layer. Resolved: §1 #1 + DEC-LUNAR-094 3 separate consts (PRIMITIVE, SEMANTIC, COMPONENT); §3 organized clearly by the 3 consts; §11 note on TypeScript infer.

### ISS-007 - The `apca-w3` API used wrong (passing hex instead of an rgb array), checkApca returns NaN
`APCAcontrast` takes `sRGBtoY([r,g,b])` not a hex string. Resolved: §3 hexToRgbArray converts hex -> [r,g,b] before passing to sRGBtoY; §6 skeleton pins the correct API; §10 failure row "sRGBtoY gets the wrong type".

## §3 - Resolution

After handling the 7 issues above, TASK-LUNAR-009 has 16 BCP-14 clauses, 15 ACs, 9 unit tests including a "fail gate" test confirming assertApca works correctly, 10 failure rows, 6 implementation notes. All of DEC-LUNAR-090..094 are created and fully referenced. Score after self-audit = 10/10.

## §4 - Independent adversarial pass (2026-06-27)

Pre-fix score: **9/10** - the cleanest task in the set. The independent reviewer RE-COMPUTED APCA with the reference apca-w3 formula so as not to rubber-stamp the gate; every assertion is correct:

- text-primary #2D0A4E on cream #FDF6EC: |Lc| = 99.0 -> above the `>= 90` threshold (AC #13, §5).
- text-secondary #5B21B6 on cream: |Lc| = 86.7 -> above `>= 75`.
- button-text #FDF6EC on purple-800 #3D1266: |Lc| = 94.8 -> above `>= 75` (AC #5).
- purple-400 #A78BFA on cream: |Lc| = 50.2 < 75 -> `assertApca(...,75)` THROWS correctly per AC #8 / the "gate works" test.
- error #B91C1C on cream: |Lc| = 77.9 -> above `>= 75`.
- WCAG: text-primary 15.47, button 13.25, error 6.03 - all >= 4.5.

The base brand Umber #45210E / Ochre #F4BA17 is kept as a primitive, only overriding color (AC #2 + test assert). The gate is a real build/test with a throw. The only defect:

- **NIT - card-shadow token mismatch.** §3 COMPONENT `card-shadow` uses `rgba(93,33,182,...)` = #5D21B6, but purple-700 is #5B21B6 = rgb(91,33,182). Fixed: changed to `rgba(91,33,182,0.08)`.

No BLOCKER/MAJOR. **Post-fix score = 10/10.**

## §5 - Contract-alignment pass (2026-06-28)

Readiness pass against CONTRACT.md and task-B traceability:

- **No amlich-core imports**: TASK-009 imports nothing from amlich-core (it is a design-system package, not dependent on amlich). PASS.
- **card-shadow NIT**: `rgba(93,33,182,...)` fixed to `rgba(91,33,182,...)` (purple-700 = #5B21B6 = rgb(91,33,182)). Confirmed in §3 COMPONENT. PASS.
- **Traceability Task B**: 16 BCP-14 clauses in §1, 15 ACs in §4, 9 tests in §5. Every MUST has a matching AC. DEC-LUNAR-090..094 exist and are fully referenced. PASS.

**Post-alignment score: READY.**

*End of audit TASK-LUNAR-009.*
