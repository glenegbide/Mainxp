# Scoring Rubric — Full 7-Pillar Reference

Total maximum: **155 points**
Normalization: `Optimization Grade = (Raw Score / 155) × 100`

iOS and Android are scored independently. A delta > 15pp between platforms triggers a divergence warning.

---

## Pillar 1 — Title + Subtitle (iOS) / Title + Short Description (Android)

**Max: 25 pts**

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 1.1 | No duplicate root keywords across fields | 5 | Zero repeated root words | Any keyword root appears in both fields | Apple/Google — duplicate tokens waste indexing surface |
| 1.2 | Character utilization ≥ 80% | 5 | Title ≥ 24/30; subtitle ≥ 24/30 (iOS) or short desc ≥ 64/80 (Android) | Any field below 80% | Field limits per platform |
| 1.3 | Most important keyword placed first | 5 | Primary keyword in first 15 chars of title | Title leads with brand name only or generic word | Algorithm weights first tokens more heavily [uncertain] |
| 1.4 | Keywords combine to form additional search terms | 5 | Title + subtitle/short desc unlocks ≥ 2 compound search terms | Fields are standalone fragments with no combinatorial value | ASO expert benchmark |
| 1.5 | Short description in full sentences (Android only) | 5 | Full grammatical sentence; reads naturally; primary keyword once | Reads as a keyword list; brand name leads | Google Play Metadata policy |

---

## Pillar 2 — App Icon

**Max: 20 pts**

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 2.1 | Simple, scalable design legible at small sizes | 5 | Recognizable at 29×29px; no text-heavy or cluttered design | Indistinct at notification size | Apple HIG; Google Play icon spec |
| 2.2 | Strong brand association / recognizability | 5 | Consistent with all brand touchpoints | Could belong to any app | Expert benchmark |
| 2.3 | Unique and differentiated from competitors | 5 | Color, shape, and concept distinct from top 5 category competitors | Generic or nearly identical to a competitor | Expert benchmark |
| 2.4 | Eye-catching, draws attention in search results | 5 | Bold contrast, clear focal point; performs above category CVR average | Muted, low-contrast, or visually crowded | Expert benchmark [uncertain — category-specific] |

**Note:** Icon cannot be retrieved by the crawler. Upload the icon before scoring this pillar.

---

## Pillar 3 — Keywords & Metadata

**Max: 25 pts**

### iOS sub-criteria

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 3.1 | Keyword field uses single-word units, comma-separated | 5 | All tokens are single words; no spaces wasted; no title/subtitle duplicates | Phrases used instead of single words; duplicates other fields | Apple App Store Connect keyword field |
| 3.2 | 100-char keyword field ≥ 95% utilized | 5 | 95–100 chars used | Field < 80 chars | Apple App Store Connect field limit |
| 3.3 | High-volume keywords targeted | 5 | ≥ 3 of 5 targeted keywords have popularity ≥ 40/100 | All keywords are low-volume or unmeasured | Expert benchmark [uncertain — threshold varies by category] |
| 3.4 | Top organic ranking for primary keyword | 5 | Ranks in top 10 for stated primary keyword | Not ranking in top 50 | Expert benchmark |
| 3.5 | Ranks above key competitors for ≥ 1 shared keyword | 5 | Outranks ≥ 1 named competitor on a shared high-volume term | Consistently below all competitors | Expert benchmark |

### Android sub-criteria

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 3.1 | 5–7 focus keywords naturally embedded in long description | 5 | 5–7 distinct keyword themes; each appears naturally in context | No identifiable keyword strategy; fewer than 3 themes; or stuffing | Google Play indexing mechanism |
| 3.2 | Keyword density for primary term ~1% (not exceeding 2%) | 5 | Primary keyword appears ~once per 100 words | Primary keyword density > 2% | Google Play Metadata policy |
| 3.3 | High-impact terms targeted | 5 | Primary and secondary keywords have measurable search volume | All chosen terms are niche or unmeasured | Expert benchmark |
| 3.4 | Top organic ranking for primary keyword | 5 | Ranks in top 10 for stated primary keyword | Not ranking in top 50 | Expert benchmark |
| 3.5 | Ranks above key competitors for ≥ 1 shared keyword | 5 | Outranks ≥ 1 named competitor on a shared term | Below all competitors on all shared terms | Expert benchmark |

---

## Pillar 4 — Description

**Max: 25 pts**

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 4.1 | Formatted with clear structure | 5 | Scannable in 10 seconds; uses line breaks, emoji bullets, or bold headers | Wall of text with no visual breaks | UX best practice |
| 4.2 | Covers all identified target keywords | 5 | Every keyword theme appears ≥ once in the description body | Multiple target keywords absent | ASO expert benchmark |
| 4.3 | Builds on title — does not repeat it verbatim | 5 | First paragraph introduces new information not in title/subtitle | First sentence restates the title | Keyword duplication wastes indexing surface |
| 4.4 | Clear CTA present | 5 | At least one action phrase ("Download free", "Start your trial") | No CTA anywhere in description | Conversion optimization best practice |
| 4.5 | Branded voice consistent with update notes | 5 | Tone and brand voice match across description, update notes, and developer replies | Generic update notes ("bug fixes and improvements") that mismatch description voice | Trust and brand coherence |

---

## Pillar 5 — Screenshots

**Max: 25 pts**

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 5.1 | 7+ screenshots used (iOS: up to 10; Android: up to 8) | 5 | iOS: 7–10; Android: 6–8 | iOS: fewer than 7; Android: fewer than 6 | Apple App Store Connect; Google Play |
| 5.2 | Sufficient contrast and visual hierarchy | 5 | Background-to-text contrast ≥ 4.5:1 (WCAG AA); key element immediately visible | Low contrast; text washes into background | WCAG 2.1 AA |
| 5.3 | ≥ 80% of screenshots have readable captions | 5 | At least 6/7 (iOS) or 5/6 (Android) screenshots have caption text ≥ 18pt equivalent | Most screenshots have no captions or captions are too small | Expert benchmark |
| 5.4 | First 2–3 screenshots clearly communicate core value | 5 | Slot 1: main benefit; Slot 2: USP; Slot 3: social proof or key use case | First screenshot shows a generic splash screen or login screen | SplitMetrics / StoreMaven A/B test data [uncertain] |
| 5.5 | CTA or download prompt in final screenshot | 5 | Last screenshot includes a download or "try free" prompt | Final screenshot is an arbitrary feature shot with no closing hook | Conversion optimization best practice |

**2025 mandatory primary screenshot sizes:**
- **iPhone:** 6.9" (1320×2868 px portrait)
- **iPad:** 13" (2064×2752 px portrait)
- **Android:** minimum 320px shortest side; JPEG or PNG; max 8 MB each

**Note:** Screenshots cannot be retrieved by the crawler. Upload screenshots before scoring this pillar.

---

## Pillar 6 — App Preview Video

**Max: 20 pts**

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 6.1 | Preview video present | 5 | At least 1 app preview video uploaded and visible | No video | Apple App Store Connect (up to 3 per device size); Google Play (YouTube link) |
| 6.2 | Clearly explains app value within first 5 seconds (muted) | 5 | Value proposition visible in first 5 seconds without audio | Opens with generic loading screen, logo animation, or music-only intro | Autoplay is MUTED on both platforms |
| 6.3 | Reinforces title and subtitle keywords visually | 5 | On-screen text includes ≥ 2 keywords from title/subtitle | Video has no text overlays; value is audio-dependent | Expert benchmark |
| 6.4 | Includes a clear CTA or closing hook | 5 | Final frame shows download prompt or strong closing benefit | Ends on a loading screen or generic end card | Conversion optimization best practice |

**⚠ iOS crawler limitation:** Preview videos on the iOS App Store are served as `blob:` URLs dynamically generated in the browser. They are invisible to any web crawler. **Never auto-fail criterion 6.1 based on crawler output alone — always ask the user to confirm before scoring.**

---

## Pillar 7 — Ratings & Reviews

**Max: 15 pts**

| # | Sub-criterion | Max | Pass | Fail | Source |
|---|---|---|---|---|---|
| 7.1 | Overall rating ≥ 4.0 (4.5+ = full 5 pts) | 5 | ≥ 4.5 = 5 pts; 4.0–4.49 = 3 pts; 3.5–3.99 = 1 pt; < 3.5 = 0 pts | Rating < 4.0 causes measurable conversion drag | AppFollow / AppRadar best practice |
| 7.2 | ≥ 50% of reviews are 5-star | 5 | 5-star reviews comprise majority of visible review mix | Majority are 1–3 star | Expert benchmark |
| 7.3 | Developer responds personally to reviews | 5 | Developer response visible on ≥ 50% of reviews in last 30 days; responses are personalized | No developer responses; or all responses are identical templates | Both platforms surface developer responses publicly |

---

## Scoring rules

- **Binary only.** Each sub-criterion scores its full point value or zero. Never partial.
- **Visual criteria.** Pillars 2 and 5 require uploaded images. If images are not provided, mark criteria as `[ESTIMATED — upload screenshots to verify]` and do not score as confirmed pass or fail.
- **Platform delta.** If `|iOS% - Android%| > 15`, flag as divergence. Investigate which pillars drive the gap.
- **Single-platform audits.** If only one URL is provided, score that platform only. The other platform shows "N/A" in the report.
