# Service page hero banners — image generation prompts

12 hero banners, one per service page. Written as one visual family so the set
reads as a system rather than twelve unrelated stock photos.

**Output:** 1536 × 640 px (5:2). The banner crops to `aspect-ratio: 5/2` on
desktop and `4/3` on mobile, so keep the subject roughly centred and leave the
outer thirds free of anything essential.

**Save to:** `public/images/services/<slug>.png` — filename given per prompt.

---

## The system prompt (prepend to every one)

Paste this block first, then the per-page subject line beneath it.

```
Photorealistic wide banner photograph, 1536x640, 5:2 aspect ratio.

STYLE: Candid documentary corporate photography, shot on 35mm, shallow depth
of field. Natural daylight from large windows, soft directional light, gentle
falloff. Muted, slightly desaturated colour grade with cool blue-grey shadows.
Calm and premium but warm and human — not glossy, not posed, not stock-photo
cheerful.

CAST: Indian professionals, mixed genders, ages 25–50, contemporary smart-
casual and business dress. Natural expressions — focused, engaged, mid-
conversation. No one looking at the camera.

SETTING: Real contemporary Indian office interiors — Ahmedabad / Bengaluru /
Pune character. Glass partitions, light wood, plants, matte surfaces, city
visible through windows. Lived-in, not a showroom.

COMPOSITION: Subject slightly off-centre, generous negative space, horizontal
framing that works as a wide banner. Nothing important in the outer thirds.

AVOID: text, logos, watermarks, signage, brand marks, screens with legible UI,
harsh flash, orange/teal grade, sci-fi holograms, floating icons, fisheye,
heavy vignette, crowds, empty white voids.
```

---

## 1. Contingent Staffing
`public/images/services/contingent-staffing.png`
> *"The right talent, when your business needs it."*

```
SUBJECT: A project team of four mid-session around a standing desk, one person
newly joined and being brought up to speed by a colleague pointing at a shared
laptop. Sense of a team flexing to absorb someone new. Mid-shot, natural
window light from the left.
```

## 2. Contract-to-Hire
`public/images/services/contract-to-hire.png`
> *"Evaluate talent before making the long-term commitment."*

```
SUBJECT: Two professionals working side by side at a shared desk, one slightly
senior reviewing the other's work on screen with an approving, evaluative
expression. Quiet mentorship. Warm daylight, soft shadows, mid-shot.
```

## 3. Direct Hire Recruitment
`public/images/services/direct-hire-recruitment.png`
> *"Make the right permanent hire."*

```
SUBJECT: A welcoming moment at the edge of an open-plan floor — a hiring
manager greeting a new permanent employee with a handshake, a colleague
smiling nearby. Sense of arrival and belonging. Bright, airy, mid-shot.
```

## 4. Executive Search
`public/images/services/executive-search.png`
> *"Find leaders who move your business forward."*

```
SUBJECT: A senior leader in a glass-walled meeting room, mid-conversation with
two colleagues across a long table. Composed, unhurried, authoritative. Cooler
palette, taller windows, city skyline softly out of focus behind. Wider shot,
more architectural than the others.
```

## 5. GCC Setup & Build
`public/images/services/gcc-setup-and-build.png`
> *"Build the talent foundation for your next capability center."*

```
SUBJECT: Wide view across a large, newly occupied office floor plate — some
desks in use, some still being set up, two people walking and talking through
the space. Scale and beginnings. High vantage, strong horizontal lines,
daylight flooding from a window wall.
```

## 6. Hire, Train & Deploy
`public/images/services/hire-train-deploy.png`
> *"Turn potential into job-ready talent."*

```
SUBJECT: A training room with six young professionals at laptops and an
instructor mid-explanation beside a whiteboard. Energy of learning, not
lecturing. Warm light, slightly closer framing, faces lit from the side.
```

## 7. Managed Talent Solutions
`public/images/services/managed-talent-solutions.png`
> *"A more connected way to manage your workforce."*

```
SUBJECT: Two operations colleagues at a desk reviewing a large monitor
together, one gesturing at the screen. Screen content abstract and
illegible — soft blue shapes only, no readable UI. Calm, controlled, orderly.
Cooler grade, mid-shot.
```

## 8. Offshore Staffing
`public/images/services/offshore-staffing.png`
> *"Extend your workforce beyond borders."*

```
SUBJECT: A small team in a meeting room on a video call, a large wall display
showing softly blurred remote participants. Sense of distance closed. Late-
afternoon light, screen glow mixing with daylight. Mid-wide shot from behind
the near team's shoulders.
```

## 9. Recruitment Process Outsourcing
`public/images/services/recruitment-process-outsourcing.png`
> *"Turn recruitment into a scalable capability."*

```
SUBJECT: A recruitment delivery floor — several people at workstations, two in
the foreground collaborating over a shortlist on screen. Purposeful volume and
rhythm. Repeating desks receding into soft focus. Bright, even daylight.
```

## 10. Remote Hiring Solutions
`public/images/services/remote-hiring-solutions.png`
> *"Find capable talent beyond the office."*

```
SUBJECT: A professional working from a well-lit home study — laptop, notebook,
plant, window with soft greenery beyond. Focused and comfortable, not
isolated. Warmer grade than the office shots, shallower depth of field.
```

## 11. Skill Upskilling
`public/images/services/skill-upskilling.png`
> *"Build the skills your workforce needs next."*

```
SUBJECT: A close working session at a whiteboard — one person sketching a
diagram (abstract shapes and arrows, no legible text) while two colleagues
watch and one asks a question. Momentum and curiosity. Closer, more intimate
framing than the rest of the set.
```

## 12. Technology Talent Sourcing
`public/images/services/technology-talent-sourcing.png`
> *"Find people who understand your technology."*

```
SUBJECT: Two engineers side by side at a dual-monitor desk, one pointing at
the screen mid-explanation. Screens show soft abstract blue-grey shapes, no
readable code or UI. Slightly cooler and more technical in feel. Mid-shot,
window light from behind creating a gentle rim on their shoulders.
```

---

---

## Category card images — Customized Solutions / Talent Solutions menu

6 images, one per service category. Used by `TALENTMESH_SERVICES` in
`content/home.ts`, which powers both the homepage "Customized Solutions"
carousel (`components/home/Services.tsx`) and the navbar's "Talent Solutions"
mega-menu (`components/layout/Navbar/Navbar.tsx`). Same visual family as the
12 hero banners above — use the same system prompt, adapted composition line
below since these crop to `4:3` (nav menu) and `16:10` (homepage carousel)
instead of `5:2`.

**Output:** 1600 × 1200 px (4:3), subject centered with clear margin top and
bottom so both crops stay clean. **Save to:** the existing filenames in
`public/images/services/` (no code changes needed — the images are replaced
in place).

```
Photorealistic wide banner photograph, 1536x640, 5:2 aspect ratio.

STYLE: Candid documentary corporate photography, shot on 35mm, shallow depth
of field. Natural daylight from large windows, soft directional light, gentle
falloff. Muted, slightly desaturated colour grade with cool blue-grey shadows.
Calm and premium but warm and human — not glossy, not posed, not stock-photo
cheerful.

CAST: Indian professionals, mixed genders, ages 25–50, contemporary smart-
casual and business dress. Natural expressions — focused, engaged, mid-
conversation. No one looking at the camera.

SETTING: Real contemporary Indian office interiors — Ahmedabad / Bengaluru /
Pune character. Glass partitions, light wood, plants, matte surfaces, city
visible through windows. Lived-in, not a showroom.

COMPOSITION: Subject centered with clear margin top and bottom (this crops to
both 4:3 and 16:10, so keep the subject safe within a centered 4:3 frame).

AVOID: text, logos, watermarks, signage, brand marks, screens with legible UI,
harsh flash, orange/teal grade, sci-fi holograms, floating icons, fisheye,
heavy vignette, crowds, empty white voids.
```

### 1. Flexible Workforce Solutions
`public/images/services/flexible_workforce_solutions.png`
*(pairs: Contingent Staffing, Contract-to-Hire)*

```
SUBJECT: A small flexible team assembling around a shared table on short
notice — one person still setting up a laptop while two others are already
mid-discussion, a sense of a team that can flex up quickly. Mid-shot, natural
window light from the side.
```

### 2. Scaled Hiring
`public/images/services/scaled_hiring_rpo.png`
*(pairs: Recruitment Process Outsourcing, Managed Talent Solutions)*

```
SUBJECT: A wide recruitment delivery floor with several people at
workstations in a steady rhythm, two in the foreground reviewing a shortlist
together. A sense of scale, structure, and repeatable process. Bright, even
daylight, desks receding into soft focus.
```

### 3. Technology & Platform
`public/images/services/technology_platform.png`
*(pairs: Remote Hiring Solutions, Technology Talent Sourcing)*

```
SUBJECT: Two engineers at a dual-monitor desk, one pointing at the screen
mid-explanation, with a third colleague joining remotely visible on a small
laptop screen nearby. Screens show soft abstract blue-grey shapes only, no
legible text. Cooler, more technical feel, window light from behind creating
a gentle rim on their shoulders.
```

### 4. Global Capability Centers (GCC)
`public/images/services/global_capability_centers.png`
*(pairs: GCC Setup & Build, Offshore Staffing)*

```
SUBJECT: Wide view across a large, newly occupied office floor plate — some
desks in use, some still being set up, two people walking and talking through
the space, while a wall display shows a softly blurred video call in the
background. A sense of scale and connection across distance. High vantage,
daylight flooding from a window wall.
```

### 5. Leadership & Strategic Hiring
`public/images/services/leadership_strategic_hiring.png`
*(pairs: Executive Search, Direct Hire Recruitment)*

```
SUBJECT: A senior leader in a glass-walled meeting room shaking hands with a
new permanent hire while two colleagues look on, composed and unhurried. A
sense of arrival at a senior level. Cooler palette, taller windows, city
skyline softly out of focus behind.
```

### 6. Workforce Creation & Enablement
`public/images/services/workforce_creation_enablement.png`
*(pairs: Hire, Train & Deploy, Skill Upskilling)*

```
SUBJECT: A training room with young professionals at laptops, an instructor
mid-explanation beside a whiteboard sketching an abstract diagram (no legible
text). Energy of learning and momentum. Warm light, slightly closer framing,
faces lit from the side.
```

---

## Wiring an image in

Once the file is saved, one line per page:

```tsx
imageSrc="/images/services/executive-search.png"
imageAlt="Two colleagues reviewing leadership candidate profiles together"
```

`imageAlt` should describe what is in the photo for a screen-reader user — not
repeat the service name, which the `<h1>` already announces.

The banner enforces its own crop (`.bannerImage`, `aspect-ratio: 5/2`), so a
slightly-off output still renders correctly; it will just crop tighter.
