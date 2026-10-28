# Asset inventory

Every image, video and package in the demo, with its source. Required for handover (brief §1).

## Official (qatartourism.com)

`client/public/brand/qatar-tourism-logo.svg`, `qatar-tourism-logo-white.svg`: official logo SVGs from the site's static resources.

`client/public/images/official/`: photography downloaded from the qatartourism.com homepage at 1920 px wide:

| File                                         | Shows                                          |
| -------------------------------------------- | ---------------------------------------------- |
| westbay-skyline-007.jpg                      | West Bay skyline at dusk                       |
| doha-skyline-min.jpg                         | Doha skyline at sunset over water              |
| city-view.jpg                                | Towers and turquoise lagoon                    |
| katara-towers.jpg                            | Katara towers, aerial (portrait)               |
| tour-operator.jpg                            | The Pearl marina at sunset, aerial             |
| pearl-qatar-tourism-min.jpg                  | The Pearl, aerial                              |
| dhow-boat-min.jpg                            | Family on a dhow, Museum of Islamic Art behind |
| museum-family.jpg                            | Family walking at the National Museum of Qatar |
| grid-qatar-national-library-2-7740-wip-5.jpg | Visitors in the Qatar National Library         |
| al-hazm-0024.jpg                             | Family at Al Hazm mall                         |
| book-couples.jpg                             | Visitors under a glass dome (mall)             |
| fuwairit-kite-beach.jpg                      | Kite surfers at Fuwairit beach, aerial         |
| beaches-banner.jpg                           | Family in the surf                             |
| doha-sands-beach-club-image-4.jpg            | Beach club parasols                            |
| hilton-salwa-beach-resort-45.jpg             | Resort pool, Salwa Beach                       |
| waldorf-astoria-doha-west-bay-2.jpg          | Hotel lobby lounge                             |
| qatar-tourism-banner.jpg                     | Guests dining on a terrace                     |
| zulal-spa.jpg                                | Spa interior                                   |
| element-west-bay-13.jpg                      | Hotel meeting room (training venue)            |
| qabila-westbay-hotel1.jpg                    | Boardroom (training venue)                     |

These are used under the brief's instruction to use official Qatar Tourism assets (§2). Confirm usage approval with Potential before external distribution.

**Official photo usage needs Qatar Tourism's confirmation** before the demo is shared outside Potential.com (tracked in `docs/OPEN-QUESTIONS.md`). The logo proportions are preserved; the Visit Qatar identity is not used.

## Generated

Generated with model `gemini-2.5-flash-image` via the `image-gen` skill on 2026-10-27. All people shown are fictional (AI-generated, not real individuals). Images are 512x512 WebP (quality 85), converted from the generated PNGs.

**Shared base prompt** (`%s` is replaced by the varying fragment):

```
Professional photographic head-and-shoulders portrait of ONE single person: %s. Full-bleed square 1:1 photograph filling the entire frame edge to edge (no circular frame, no vignette, no border), face centred in the frame with comfortable headroom, looking at the camera with a friendly, warm, confident smile. Soft natural window light, shallow depth of field, realistic skin texture, high-end corporate headshot photography. Plain seamless warm sand off-white background (#FAF8F4) with a very subtle soft teal tint, no objects. Business-smart attire. No text, no logos, no watermarks, no borders, only one person.
```

| File                                                 | Person              | Varying prompt fragment                                                                                                                                                         | Placement                                                          |
| ---------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `client/public/images/generated/trainers/T01.webp`   | T01 Amal Al Nouri   | a Qatari woman in her late 30s wearing a modest black shayla headscarf and smart dark blazer, visitor service coach                                                             | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T02.webp`   | T02 Khalid Mansour  | an Arab man in his early 40s with a neatly trimmed beard, wearing a white ghutra and white thobe, tour guiding facilitator                                                      | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T03.webp`   | T03 Leila Haddad    | a Levantine Arab woman in her mid 30s with shoulder-length dark wavy hair, wearing a smart navy blazer, service recovery trainer                                                | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T04.webp`   | T04 Rafael Sousa    | a Brazilian-Portuguese man in his late 30s with short dark hair and light stubble, wearing a charcoal suit jacket and open-collar white shirt, hospitality trainer              | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T05.webp`   | T05 Noura Al Saleh  | a Gulf Arab woman in her early 40s wearing a soft beige hijab and elegant cream blazer, inclusive communication coach                                                           | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T06.webp`   | T06 Priya Menon     | a South Indian woman in her mid 30s with dark hair tied back, wearing a smart teal blouse and dark blazer, front office learning facilitator                                    | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T07.webp`   | T07 Youssef Karim   | a North African Arab man in his mid 30s with short curly dark hair and a short beard, wearing a navy suit and light blue shirt without tie, group experience trainer            | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T08.webp`   | T08 Sofia Martins   | a Portuguese woman in her early 40s with light brown shoulder-length hair, wearing a smart olive blazer, destination storytelling coach                                         | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T09.webp`   | T09 Hassan Farouk   | an Egyptian man in his late 40s with short greying hair and a moustache, wearing a grey suit and white shirt with a dark tie, transport service facilitator                     | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/trainers/T10.webp`   | T10 Aisha Rahman    | a Pakistani woman in her late 30s wearing a soft maroon dupatta loosely over her hair and a smart dark blazer, assessment and feedback coach                                    | Trainer avatar: trainer cards, profile, session pages              |
| `client/public/images/generated/personas/L0001.webp` | L0001 Maha Al Nouri | a young Qatari woman in her mid 20s wearing a modest black shayla headscarf and a plain smart navy blazer with no name badge or pin, early-career hotel guest services employee | Persona portrait: learner profile, demo toolbar, admin user detail |
| `client/public/images/generated/personas/L0002.webp` | L0002 Omar Al Safi  | an Arab man in his late 20s, clean-shaven with short dark hair, wearing a smart navy blazer and white open-collar shirt, tourism professional                                   | Persona portrait: learner profile, demo toolbar, admin user detail |
| `client/public/images/generated/personas/L0003.webp` | L0003 Leila Rahman  | a South Asian woman in her early 30s with dark hair in a neat bun, wearing a smart black blazer, front office supervisor                                                        | Persona portrait: learner profile, demo toolbar, admin user detail |
| `client/public/images/generated/personas/L0004.webp` | L0004 Daniel Costa  | a Portuguese man in his early 30s with short brown hair and light stubble, wearing a smart casual navy polo-style knit and light jacket, tour operator staff member             | Persona portrait: learner profile, demo toolbar, admin user detail |
| `client/public/images/generated/personas/L0005.webp` | L0005 Sara Mansour  | an Arab woman in her late 20s wearing a light grey hijab and a smart dark uniform-style blazer, transport and visitor services staff member                                     | Persona portrait: learner profile, demo toolbar, admin user detail |

## Media (`client/public/media/`)

| File                                           | What it is                                                   | Used by                               |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| `c01-welcoming-every-visitor.mp4`              | 1920x1080 H.264 sample video, 1 min 15 s, **no audio track** | C01 Welcoming every visitor           |
| `c01-welcoming-every-visitor.en.vtt`           | English captions: the brief's §7 C01 narration script        | C01 captions and transcript           |
| `c01-poster.jpg`                               | Poster frame                                                 | C01 player                            |
| `c03-clear-and-inclusive-communication.mp4`    | 1920x1080 H.264 sample video, 1 min 2 s, **no audio track**  | C03 Clear and inclusive communication |
| `c03-clear-and-inclusive-communication.en.vtt` | English captions: original fictional narration               | C03 captions and transcript           |
| `c03-poster.jpg`                               | Poster frame                                                 | C03 player                            |

**Source of the two videos and posters: not recorded in the repository. To be confirmed by the
developer before handover** (generated, stock or produced, and under what licence). The
captions are original demo content: C01 follows the brief's script, C03 is written for this demo.

## Interactive content

| Path                                                                | What it is                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scorm/qta-sample-c04/`                                             | Source of the **SCORM 2004 (4th Edition) sample package** for C04 Recovering a difficult service moment: `imsmanifest.xml`, `index.html`, `runtime.js`, `content.js`, `styles.css`. Original content written for this demo; no authoring tool or third-party package |
| `client/public/scorm/qta-sample-c04/`                               | The same package copied for serving, by `bun scorm/qta-sample-c04/build.ts`                                                                                                                                                                                          |
| `client/public/previews/c02-understanding-visitor-needs/index.html` | C02 branching HTML preview, labelled "not a verified SCORM package". Original content (the brief's §8 sample interaction)                                                                                                                                            |

## Fonts

Spectral and Jost, loaded from Google Fonts (SIL Open Font License). Stand-ins for Qatar
Tourism's commercial Orchidea Pro and VisitQatar fonts. Not bundled in the repository.

## Other

`client/public/favicon.svg`: the generic favicon from the project skeleton (not a Qatar Tourism mark).
