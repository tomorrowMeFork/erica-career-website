# 07-03 Design Standard Interpretation

**Phase:** 07 — UI Information Architecture and Design Contract  
**Requirements:** UXR-01, UXR-03  
**Status:** Project-specific interpretation of `DESIGN.md`  
**Scope:** Design contract only. No components, CSS, routes, or visual implementation.

## Design Standard Position

`DESIGN.md` is the active independent design standard for ERICA Career Chat v1.1. It informs spacing, typography scale, rounded surfaces, pill controls, restrained color roles, and CTA hierarchy. It must not be framed as a brand style to copy; ERICA Career Chat should feel like a trustworthy academic career-information consultation tool.

## Project Translation Rules

| Design dimension | `DESIGN.md` signal | ERICA Career Chat interpretation | Verification cue |
|---|---|---|---|
| Canvas | Calm white surfaces and soft cloud backgrounds | Use white/soft neutral page rhythm for trust and readability | Page does not feel like a dense dashboard or commerce grid. |
| Typography | Clear display → heading → body hierarchy | Korean body readability wins over large metric/card density | Headline, intro, body, caption roles are visibly distinct. |
| Cards | Rounded cards with limited borders/shadows | Use fewer, larger grouped cards; avoid overloaded micro-cards | Each card has one purpose and one clear next action. |
| Pills | Pill buttons/tabs/chips as state controls | Use pills for navigation, filters, and compact source/deadline state only | Pills clarify state; they do not decorate every label. |
| Accent color | Cobalt is visually strong and scarce | Reserve accent for one primary/active meaning per page | No repeated accent badges/CTAs competing for attention. |
| CTA hierarchy | One dominant primary action with secondary outline/ghost actions | Each page has one dominant Korean CTA; secondary actions stay visually quieter | A user can identify the primary action in 3 seconds. |
| Source cards | Rounded information surfaces | Source cards prioritize source identity, citation, freshness, deadline, and confidence limits | Source metadata is more prominent than decorative badges. |
| Mobile behavior | Single-column collapse and 44px targets | Four-page flow must remain readable on mobile later | No Phase 7 implementation; Phase 8+ must verify. |

## Page-Level Visual Priority

| Page | Visual focus | Primary action treatment | Secondary treatment | What to de-emphasize |
|---|---|---|---|---|
| Home | Service purpose + two next-step choices | `커리어 상담 시작하기` as dominant pill CTA | `커리어 정보 둘러보기` as outline/ghost | Metrics, repeated feature cards, recommendation claims |
| Explore | Source/deadline-scannable information list | Open/browse information | Filter chips and consultation handoff | Ranking badges, match scores, excessive accent labels |
| Detail/source verification | Original source + evidence metadata | `원문 출처 확인하기` | `상담에서 이 정보로 질문하기` | AI summary overpowering source facts |
| Consultation | Chat input and cited answer reading | `질문 보내기` / input focus | Evidence inspection links | Side panels full of unrelated listing cards |

## Color and Badge Rules

| Role | Allowed use | Disallowed use |
|---|---|---|
| Primary/accent | One active CTA or active state per page | Every card title, every badge, every source item |
| Ink/black | Main CTA on neutral/home-like surfaces | Multiple competing primary CTAs in one viewport |
| Soft neutral | Page background, grouping, quiet filters | Hiding source warnings or insufficient-evidence states |
| Success | Verified/available source-state label when true | Generic “good match” or implied recommendation quality |
| Warning/attention | Deadline uncertainty, stale/freshness caution, insufficient context | Promotional urgency or reminders |
| Critical | Errors, expired/unsafe/unavailable evidence | Decorative emphasis |

## Information Hierarchy Rules

| Surface | First | Second | Third |
|---|---|---|---|
| Home hero | Service purpose | Source-grounding and limits | Two route choices |
| Explore item | Information title and source identity | Deadline/freshness metadata | Summary and filters |
| Detail page | Original source link and identity | source_id/chunk_id, posted/fetched, deadline | AI interpretation with limits |
| Consultation answer | Korean answer/refusal | Citations and freshness/deadline metadata | Related source cards as support |

## Phase 5 Anti-Pattern Rule

Phase 5 may be used only for artifact format and historical critique. Its UI direction is a negative example for v1.1. The v1.1 contract must avoid:

- crowded single-dashboard composition
- overloaded left-side content
- weak central consultation emphasis
- ambiguous empty right-side source panel
- repeated accent color across unrelated badges/cards/CTAs
- overloaded cards with unclear hierarchy
- unclear page primary actions

## Requirement Coverage

| Requirement | Coverage |
|---|---|
| UXR-01 | Interprets `DESIGN.md` for spacing, typography, rounded surfaces, pill controls, restrained color roles, and CTA hierarchy. |
| UXR-03 | Defines one primary action per page and reduces competing color, badge, card, and CTA emphasis. |
