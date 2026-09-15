# Fantasy Seers UI redesign specification

Status: accepted design direction; implementation not started.

Source: screenshot-led design interview completed September 15, 2026. The decisions below supersede earlier suggestions in that interview. The screenshot is a visual reference, not a requirement to reproduce every feature or example value.

The original screenshot contains account information and is not published with this spec. The visual baselines and element treatments below are the repository's reviewable styling contract; implementation must not depend on access to the private attachment. Fidelity means following those documented treatments and dimensions, not pixel-matching the original image. Its right rail, promotional artwork, slogans, bell, duplicate desktop user footer, and example data are explicitly excluded below.

## Scope

Apply the screenshot's visual language across the app, redesign the shared desktop shell, and reshape the Master Sheet. Other pages inherit consistent typography, colors, surfaces, and controls; their workflows remain intact. Preserve the existing phone header and navigation arrangement.

The ranking table occupies the available content width. There is no right rail.

## Shared layout

### Desktop

The header spans the screen. Place the existing logo and Fantasy Seers name at the left, expanding player search in the center, and username, points, and Sign out on the right. Place sidebar navigation below the header alongside page content.

Keep current navigation destinations and role-based admin visibility. Remove the desktop sidebar's duplicate user footer. Do not add a promotional card to its vacant space.

### Phones

Preserve the existing hamburger/logo and account-control arrangement and the existing navigation drawer layout. The desktop footer removal does not require changing the phone drawer. Do not add search to the phone header.

Place player search within the Master Sheet, above position filters. The page heading and search scroll away. Keep position filters and Save available in a compact sticky toolbar without covering ranking rows or keyboard focus.

## Styling

Use dark navy surfaces and brighter violet accents in place of the current indigo emphasis. The following implementation baselines make the visual direction measurable. They translate the accepted design into starting values, rather than claiming exact sampled colors or separately approved pixel dimensions. Tune only as needed for contrast, content fit, and browser verification, and record material deviations.

| Baseline | Starting target |
| --- | --- |
| Shell geometry | Desktop at 1024px and above; 56px header, 192px sidebar below it; retain existing phone header/drawer dimensions below that breakpoint |
| Content geometry | 16px desktop gutters and section gaps; ranking table fills the remaining width; no reserved right-column space |
| Banner and type | Approximately 96px desktop banner with 16px padding; 32px desktop title, 20px phone title; allow growth for content/zoom |
| Surface tokens | Page #0C0F1A, navy surface #121626, subtle separator #252B3F; retain readable slate text tokens |
| Accent and row details | Violet fill #7C3AED, bright border/focus #A78BFA, 12% violet selected tint; 8px control corners, 12px panel corners; 48px minimum rows and 32px headshots |

The narrower sidebar and wide table intentionally replace the current centered narrow board. Verify at the reference's 1140px width as well as 1440px desktop and 390px/320px phone widths. A fixed height must never clip enlarged text. If the desktop header becomes crowded, let search shrink within readable limits before changing the phone layout.

| Element | Treatment |
| --- | --- |
| Save | Solid violet; subtle glow on hover or keyboard focus |
| Selected position filters | Violet tint and bright border, no glow |
| Active navigation | Violet tint and narrow bright left edge |
| Surfaces and separators | Quiet navy surfaces and subdued thin borders |
| Player rows | One navy surface, thin separators, subtle purple hover; no alternating striping |

Keep neutral readable player text and distinct semantic position colors. Keyboard focus must remain visible on all controls, even where glow is not used.

Use existing Cinzel for the app name and Master Sheet title. Use Inter for player names, navigation, buttons, and supporting text. Align numeric columns with tabular numerals. Increase the desktop title while retaining the compact phone title. No additional font families are required.

## Master Sheet heading and status

Keep a wide banner with CSS-only atmosphere: deep navy, subtle purple glow, and restrained abstract lines or geometry. No player, helmet, silhouette, stadium photograph, or generated football illustration. Preserve space and contrast for the text.

Display Fantasy Seers, Master Sheet, and the functional instruction "Drag players to build your personal rankings." Adapt instructions when the board is locked or search prevents reordering.

Show season and scoring settings under the title, for example `2026 · Half-PPR · Single-QB`. Values must come from the board's authoritative data; the example is not a hardcoded production default. If necessary, expose the board season through its response.

Place saved, saving, and unsaved state beside Save. Preserve manual save behavior and existing draft recovery, error handling, and disabled states. Keep the clear season-start lock notice and the dismissible consensus-default explanation when applicable.

Do not add player-count metrics or a last-saved timestamp for this redesign.

## Ranking rows

### Desktop contents, in order

| Element | Requirement |
| --- | --- |
| Drag handle | Six-dot appearance with at least a 44px usable target |
| Overall rank | Dark rounded rank tile; retain full-board rank under filters |
| Player image | Real headshot, approximately 32px, with initials fallback |
| Team image | Consistent team logo with abbreviation fallback |
| Identity | Player name with full team name below; omit repeated abbreviation |
| Position | Colored chip including positional rank, such as RB3 |
| ADP | Aligned numeric column preserving actual data and missing-value handling |

Start at a 48px minimum desktop row height. Allow rows to grow for enlarged text rather than clipping. Verify density with actual long names and the full board in a browser.

On narrow screens, hide the full team name and use the logo plus abbreviation. Retain headshots, drag handle, rank, position rank, and ADP with responsive spacing. Keep information readable without horizontal page overflow.

Do not add a decorative row chevron or imply an unimplemented player-detail action.

### Image data

Expose the existing Sleeper player identifier in the board response to support headshots. Sleeper image delivery was proposed and accepted but its current URL contract and coverage must be verified during implementation. Select and verify a consistent team-logo source at that time.

Handle missing identifiers, failed images, free agents, and team-defense entries with stable fallbacks. Reserve image dimensions to prevent layout shifts. Do not change database player identifiers or ranking identity. No image-provider endpoint has been verified by this specification.

## Filters and search

### Position filters

Retain multi-select behavior. `ALL` resets to the complete board; each individual position toggles independently. Deselecting the last individual position returns to `ALL`. Preserve combinations such as RB + WR + TE.

Each selected position has the accepted violet treatment. On phones, pills can scroll horizontally within their own area while Save remains reachable.

Dragging under position-only filtering preserves the slots occupied by excluded positions and recalculates overall and positional ranks consistently with existing behavior.

### Text search

Desktop search is available in the shared header. Entering a search elsewhere navigates to Master Sheet with the query retained. Search within the user's current board by player name, team, or position; this is not a user-account search. Phone search uses the same behavior within the Master Sheet page.

Search filters immediately and intersects with selected positions. Provide a labeled field, a clear action, and a useful no-matches state. A query must not reset unsaved board edits.

While a nonempty text query is active, disable dragging for pointer, touch, and keyboard input and explain why briefly. Search results provide a "Show in board" action that clears text and position filters, scrolls to the matching row, and briefly highlights it. On editable boards this restores reordering; locked boards remain locked.

Clearing search alone preserves the selected positions. The "Show in board" action specifically resets positions to ALL. Search and filter changes do not alter ranks or mark the board dirty.

## Explicit exclusions

- No right rail, My Board card, My Boldest Takes, or associated mobile insights sheet. Do not implement consensus-difference data solely for the removed feature.
- No Friends' Top 5, Community Pulse, placeholder metrics, or coming-soon replicas.
- No notification bell or duplicate invitation workflow.
- No football hero illustration or sidebar promotional artwork.
- No taglines, slogans, or inspirational quotes anywhere in the redesigned UI.

## Implementation sequence

1. Update shared visual tokens and desktop shell while preserving phone layout and existing routes.
2. Add verified player-image data and fallbacks, then reshape the Master Sheet banner, inline status, toolbar, and rows.
3. Add shared desktop/page-level phone search, navigation to matching rows, and the search drag guard.
4. Verify board interactions and responsive rendering, then update repository documentation to reflect implemented behavior.

## Acceptance checks

### Behavior

- Save the full board correctly with search or position filters active; preserve unsaved drafts and existing save-failure handling.
- Verify multi-select drag preserves excluded-position slots and updates ranks correctly; locked boards reject all edits.
- Verify search by name/team/position, cross-page search navigation, combined filters, empty results, clearing, and Show in board without losing unsaved edits.
- Verify all drag input methods are disabled under text search, and Show in board reveals the intended row without unlocking a locked board.
- Verify imagery fallback and correct response mapping for both default and personalized boards.

### Visual and accessibility

- Inspect wide desktop, laptop, tablet, and narrow phone layouts with real row content and a full board.
- Confirm the existing phone header/drawer arrangement remains intact, the toolbar does not obscure content, and the right rail is absent.
- Check long names, enlarged text, keyboard focus, and usable drag targets. Respect reduced motion for scroll/highlight effects.
- Review shared-style effects on existing authenticated pages and Login/Register, preserving their workflows.
- Run the frontend build and relevant behavior tests; run backend mapping tests when changing the board response. Record browser evidence separately from automated test results.

## Delivery boundary

This document records the accepted design and necessary implementation details. It does not claim that app code, external image integration, browser verification, or deployment is complete. No external publication is part of creating this specification.
