# Failure Pattern Library

15 common ASO failure patterns, each with three strategy variants:

- **Strategy A — Copy only** (< 2 hours, no designer needed)
- **Strategy B — Design + copy** (1–2 days asset creation + A/B test window)
- **Strategy C — Structural / code** (1–2 sprint cycles, developer involvement)

Every recommendation citing these patterns must reference actual text or data from the audited listing — no generic advice when real listing data is available.

---

## Pattern 1: Promotional text field left empty (iOS only)

**Why it hurts:** The 170-char promotional text field is the only App Store field updatable without a new app version. While not indexed by the algorithm, it sits above the fold and is the first text users read after the subtitle.

- **A:** Write a time-sensitive or rotating value statement that extends the subtitle. Template: `[New feature or seasonal hook] — [specific benefit]. Try free.` Max 170 chars.
- **B:** Coordinate the promo text with a campaign-specific screenshot set. Run a Product Page Optimization test: feature-focused vs social-proof statement. Measure CVR delta over 7+ days.
- **C:** Build a scheduled promo text rotation into your release process. Write 4–5 evergreen variants (feature highlight, social proof, CTA, seasonal, award) and rotate quarterly.

---

## Pattern 2: Brand name leading the Android short description

**Why it hurts:** The short description is the only copy shown above the fold on Google Play. Starting with the brand name wastes the first words on information the user already has from the title.

- **A:** Rewrite to open with a user outcome or use case. Template: `[Verb] + [primary keyword] + [differentiator or social proof].` Remove the brand name from the opening phrase.
- **B:** Run a Store Listing Experiment: benefit-led vs social-proof-led short description. Measure install CVR over 14+ days.
- **C:** If brand name is legally required to lead, use it as an adjective: `[Brand]: [benefit statement].` The colon preserves brand but opens a space for keyword immediately after.

---

## Pattern 3: Feature graphic is logo-only on white or black background (Android)

**Why it hurts:** The feature graphic occupies ~60% of above-fold space on the Google Play store listing. A logo on a blank background conveys no value proposition, no product context, and no emotional hook.

- **A:** Overlay the primary value statement as large text on the existing graphic. Text should be the single most compelling line from your short description.
- **B:** Commission or build a feature graphic in one of three proven formats: (1) lifestyle photo with app UI on a phone; (2) product mockup with headline overlaid; (3) bold color block with primary value statement as large text. Test all three as Store Listing Experiments.
- **C:** Tie the feature graphic to a seasonal content calendar. Build 4 variants per year. Each should use a lifestyle image with a hook tied to your primary keyword.

---

## Pattern 4: Screenshot captions too small to read on most phone screens

**Why it hurts:** Screenshots are shown at thumbnail size in search results. Caption text below ~18pt equivalent at native resolution is illegible. Illegible captions turn the keyword surface of every screenshot into dead space.

- **A:** Shorten all captions to 5 words or fewer. Shorter copy forces larger type within the same design. Test legibility by viewing at 25% zoom.
- **B:** Redesign all screenshots with a consistent caption template: solid color bar at bottom 25% of frame, white text at minimum 72px at 1080px width, app UI in top 75%. Run a Store Listing Experiment comparing new captioned set against current.
- **C:** Build a screenshot design system in Figma with a locked caption component. Every new screenshot automatically inherits legible captions, preventing regression.

---

## Pattern 5: Description not featuring primary ASO keywords

**Why it hurts:** On iOS, the long description feeds secondary indexing. On Android, it is the primary keyword indexing field. Keywords absent from the description cannot rank for those terms regardless of their presence in other fields.

- **A:** Add a "Key Features" section at the end with one bullet per missing keyword theme. Each bullet must be a full sentence that naturally uses the keyword.
- **B:** Restructure the entire description using the Problem → Promise → Proof → CTA funnel. Each keyword theme is assigned to a specific section.
- **C:** Build a keyword coverage tracking spreadsheet: Column A = target keyword, Column B = in title, Column C = in subtitle/short desc, Column D = in description, Column E = in keyword field/long desc. Missing cells in column D are immediate copy tasks.

---

## Pattern 6: Keyword density > 2% for any single term (Android long description)

**Why it hurts:** Google Play's metadata policy prohibits keyword stuffing. Density above ~2% for any single term is a spam signal that can trigger demotion or policy warning.

- **A:** Paste description into wordcounter.net. Search for the primary term. Count ÷ total word count. Replace excess instances with natural synonyms.
- **B:** Restructure into named sections so the primary keyword appears naturally in the opening section only. Secondary sections use synonyms.
- **C:** Add a pre-submission density check to your release process. Spreadsheet formula: `=COUNTIF(range, "*keyword*")/word_count`. Flag any result above 0.02 before submitting.

---

## Pattern 7: Duplicate root keywords across iOS title, subtitle, and keyword field

**Why it hurts:** Apple's algorithm does not give incremental ranking credit for a keyword that appears in multiple indexed fields. Each duplicated token wastes a slot that could index a new, distinct search term.

- **A:** List every word in title, subtitle, and keyword field. Remove any token from the keyword field that shares a root with any title or subtitle word.
- **B:** Treat the three fields as three non-overlapping indexing layers: title = brand + primary keyword; subtitle = clarification + secondary keyword; keyword field = long-tail variations only.
- **C:** Build and maintain a keyword allocation matrix: Column A = token, Column B = assigned field, Column C = last updated. A keyword may appear in only one indexed field.

---

## Pattern 8: Preview video not tested against screenshots-only variant

**Why it hurts:** Preview videos autoplay muted and push screenshots right in the carousel. In some categories, a screenshots-only listing converts better because screenshots are more scannable [uncertain — category-dependent].

- **A:** Watch the existing video on mute. If no value prop is communicated in the first 5 seconds, rewrite the script or add text overlays — costs no design work if produced in CapCut or Canva.
- **B:** Run a native A/B test: Product Page Optimization (iOS, 7-day min) or Store Listing Experiment (Android, 14-day min). Variant A = current video; Variant B = screenshots only, with best screenshot in slot 1.
- **C:** Produce a second video variant — a tighter cut that front-loads the value prop in the first 3 seconds with large on-screen text. Test three-way: original video vs short cut vs screenshots only.

---

## Pattern 9: App title using < 20 characters of the allowed 30

**Why it hurts:** The app title is the highest-weighted indexing field on both platforms. Every unused character is an unrealized ranking opportunity.

- **A:** Append `— [Primary Keyword]` or `: [Descriptor]` to the brand name. Verify LEN() before submitting. Target 25–30 chars.
- **B:** If the brand name is short, treat the title as a combined brand + product name. Update the icon to reflect the expanded name so title and icon are visually coherent.
- **C:** Run a title A/B test before committing: Product Page Optimization (iOS, 7+ days) or Store Listing Experiments (Android, 14+ days). Track keyword ranking movement AND CVR.

---

## Pattern 10: No developer responses to reviews

**Why it hurts:** Developer responses are public and visible to every future visitor. Unanswered reviews signal disengagement. Personalized responses can prompt reviewers to update their star rating upward [uncertain — platforms do not publish data on this].

- **A:** Set a weekly 30-minute recurring calendar block for review management. Respond to every review — even single-word reviews deserve a personal acknowledgment.
- **B:** Build a review response playbook: 5–8 pre-written templates for the most common review categories. Personalize each template with the reviewer's name and one specific reference to their review text.
- **C:** Implement an in-app sentiment gate: internal thumbs up/down prompt before routing to the store review prompt. Users who tap thumbs down are routed to an in-app feedback form (not the store).

---

## Pattern 11: First screenshot shows a generic splash screen or login screen

**Why it hurts:** The first screenshot is the highest-conversion visual asset on the listing. Users decide whether to engage within 2–3 seconds of landing. A splash screen communicates nothing about value or differentiation.

- **A:** If redesign is not immediately possible, add a caption overlay to the existing screenshot 1 that states the app's primary benefit.
- **B:** Replace screenshot 1 with the app's hero moment — the screen a user reaches after their first meaningful action. Add a caption that names the benefit, not the feature: "Chapter 1 complete — your daily spiritual practice starts here" not "Chapter reading screen." Run a PPO or SLE test.
- **C:** Establish a screenshot hierarchy protocol: Slot 1 = hero moment (outcome); Slot 2 = primary USP; Slot 3 = social proof; Slots 4–6 = key use cases; Slots 7–8 = innovative features or updates. Lock this as a template for every listing update.

---

## Pattern 12: No CTA in final screenshot

**Why it hurts:** Users who scroll to the final screenshot are the highest-intent visitors on the product page. A listing that ends without a download prompt misses the conversion opportunity at the exact moment of maximum intent.

- **A:** Add a caption overlay to the current final screenshot: `Free to download — [one key benefit].` Under 1 hour in Canva.
- **B:** Create a dedicated "closing frame" screenshot — a full-bleed branded card with the app rating, a one-line value statement, and a "Download free" prompt. Test it against the current final screenshot.
- **C:** Add the closing CTA frame to your screenshot template system as a locked final slide. Update only the rating number and review count as they grow.

---

## Pattern 13: Short description repeats exact app title wording (Android)

**Why it hurts:** Both fields are displayed above the fold. Repeating title language wastes 80 chars of the short description on redundant information and adds no new ranking surface.

- **A:** Hard rule: no root word from the title may appear in the first 40 characters of the short description. Title = what the app is. Short desc = why to download it right now.
- **B:** Run three short description variants in Store Listing Experiments: (A) benefit-led, (B) social-proof-led, (C) use-case-led. Each introduces different secondary keywords.
- **C:** Treat short description as a standalone conversion headline — brief it separately from the long description and title. Assign to your strongest conversion copywriter, not your SEO writer.

---

## Pattern 14: iOS keyword field uses phrases instead of single words

**Why it hurts:** Apple's algorithm for the keyword field tokenizes single words. Multi-word phrases padded with spaces waste characters — Apple counts spaces, reducing the effective 100-char field.

- **A:** Split every multi-word phrase at the space. Remove spaces after commas. Remove every word already present in title or subtitle.
- **B:** Build a keyword research brief before touching the field. Use Apple Search Ads suggested bids to score each candidate token. Prioritize tokens with popularity ≥ 40/100 that don't appear in title or subtitle.
- **C:** Build a keyword field master spreadsheet: Column A = token, Column B = char count (LEN), Column C = in title? Column D = in subtitle? Column E = popularity score, Column F = included in field? Sum Column B for Y rows in Column F to verify total char count before submitting.

---

## Pattern 15: Rating below 4.0 with no review management strategy

**Why it hurts:** Ratings below 4.0 cause measurable conversion drag. Below 3.5, both Apple and Google may de-prioritize the app in category browse results.

- **A:** Respond to every 1–3 star review immediately with a personalized acknowledgment and resolution path. Implement SKStoreReviewRequest (iOS) or ReviewManager (Android) at the app's highest-satisfaction moment.
- **B:** Build a rating recovery campaign: (1) respond to all unanswered negative reviews in the past 90 days with a personalized update on what has changed; (2) release an update that addresses the top 3 recurring complaints; (3) reference the fixes in the update notes using language that mirrors the review complaints.
- **C:** Implement a full review management system: in-app sentiment gate, negative feedback routed to a support ticket system, weekly review monitoring with a dedicated responder, and quarterly review audit feeding themes into the product roadmap.
