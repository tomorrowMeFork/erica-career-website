# Design Seed Summary

**Source:** `DESIGN.md`  
**Role:** Visual inspiration for future UI planning, not a binding brand specification.

`DESIGN.md` describes a Meta hardware-commerce design system with a stark white canvas, large rounded cards, pill-shaped controls, strong typographic hierarchy, cobalt commerce CTAs, and responsive product-marketing layouts. It is useful as a high-quality component and token reference, but the ERICA employment service should adapt it into an academic, trustworthy, Korean-first student-support interface rather than copying Meta's brand.

## Portable Patterns

- White canvas with soft secondary surfaces for calm information density.
- Large radius cards (`24px` to `32px`) for grouped content such as job cards, source cards, recommendations, and guidance panels.
- Pill-shaped buttons, tabs, badges, and chips for filters like major, job type, deadline, source, and recommendation reason.
- Clear three-tier typography for page title, section headers, and dense Korean body copy.
- Search-pill and text-input patterns that can become the chat input, source search, and profile preference controls.
- FAQ accordion and footer patterns that map well to career guidance, data-source explanations, privacy notices, and responsible-AI disclaimers.
- Responsive collapse rules: single-column mobile chat, two-column tablet layouts, and wider desktop with chat plus recommendation/source side rail.

## Required Adaptation

- Replace Meta-specific branding, Optimistic VF assumptions, Oculus purple, and commerce language.
- Reserve bright cobalt or Hanyang blue for primary actions and source trust markers, not every interactive element.
- Introduce Korean-first typography fallbacks such as Pretendard, Noto Sans KR, Apple SD Gothic Neo, and system sans.
- Shift visual voice from hardware merchandising to university career support: credible, calm, source-grounded, and student-centered.
- Treat product-gallery, SKU picker, checkout summary, warranty card, and commerce-specific components as non-transferable unless reinterpreted.

## Future UI Contract Seeds

- Chat answers should show source cards with URL, title, posted/fetched date, and citation snippets.
- Job recommendations should show match reasons as compact badges rather than opaque scores alone.
- Expired or uncertain postings should use explicit status labels.
- Mobile should prioritize chat input, latest answer, and saved recommendations; desktop can add source/recommendation side panels.
- UI design phases should run a dedicated `/gsd-ui-phase` before frontend implementation.
