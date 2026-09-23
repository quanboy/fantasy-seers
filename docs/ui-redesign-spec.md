# Fantasy Seers UI redesign specification

Status: implemented and verified locally; not deployed.

Source: screenshot-led design interview completed September 15, 2026. The decisions below supersede earlier suggestions in that interview. The screenshot is a visual reference, not a requirement to reproduce every feature or example value.

The original screenshot contains account information and is not published with this spec. The visual baselines and element treatments below are the repository's reviewable styling contract; implementation must not depend on access to the private attachment. Fidelity means following those documented treatments and dimensions, not pixel-matching the original image. Its right rail, promotional artwork, slogans, bell, duplicate desktop user footer, and example data are explicitly excluded below.

## Implementation record

The redesign was implemented on September 22, 2026 in three checkpoints:

- `404017c` redesigned the shared shell and visual tokens while preserving the phone header and drawer.
- `748e47e` reshaped the Master Sheet banner, status, toolbar, player imagery, team identity, and ranking rows.
- `90a448f` added shared player search, cross-page navigation, Show in board, and the search drag guard.

Local verification covered the complete frontend test suite, production build, and all 40 backend tests. Browser rendering was measured at 320px, 390px, 639px, 640px, 1023px, 1024px, 1140px, and 1440px. The 640px identity change and 1024px shell/search change occurred on the intended sides of their breakpoints, with no horizontal page overflow. Rows remained at least 48px tall, headshots remained 32px, and drag targets remained 44px by 44px. At 200% root text size, the desktop header grew from 57px to 113px and the sidebar offset followed it to 113px without horizontal overflow.

Keyboard traversal retained visible focus on the brand link, search field, search submit, account controls, and navigation. The authenticated Props, Leagues, Leaderboard, and Profile pages plus Login and Register were checked for shared-style regressions and horizontal overflow. Automated behavior coverage includes draft recovery, save failure, locked-board messaging, position filtering, complete-board saving under filters, image fallbacks, search matching and clearing, Show in board, and cross-page search submission semantics.

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
| Shell geometry | Desktop at 1024px and above; minimum 56px header, 192px sidebar below it; retain existing phone header/drawer baseline dimensions below that breakpoint |
| Content geometry | 16px desktop gutters and section gaps; ranking table fills the remaining width; no reserved right-column space |
| Banner and type | Approximately 96px desktop banner with 16px padding; 32px desktop title, 20px phone title; allow growth for content/zoom |
| Surface tokens | Page #0C0F1A, navy surface #121626, subtle separator #252B3F; retain readable slate text tokens |
| Accent and row details | Violet fill #7C3AED, bright border/focus #A78BFA, 12% violet selected tint; 8px control corners, 12px panel corners; 48px minimum rows and 32px headshots |

The narrower sidebar and wide table intentionally replace the current centered narrow board. Verify at the reference's 1140px width as well as 1440px desktop and 390px/320px phone widths. A fixed height must never clip enlarged text. If the desktop header becomes crowded, let search shrink within readable limits before changing the phone layout.

The header may wrap its content and grow above its baseline height when enlarged text requires it. Preserve the phone control arrangement while allowing vertical growth. Sidebar positioning and sticky-toolbar offsets must follow the actual header height, rather than assuming a constant 56px.

Shell and row breakpoints are independent: use the existing drawer shell below 1024px, and compact row identity below 640px. At 640-1023px, tablets use the drawer shell and the full team-name row presentation. These are starting implementation breakpoints; verify at 639/640px and 1023/1024px as well as the phone and desktop widths above.

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

Start at a 48px minimum row height at every viewport width. Use 32px headshots and at least 44px by 44px drag targets on phones as well as desktop. Allow rows to grow for enlarged text rather than clipping. Verify density with actual long names and the full board in a browser.

Below 640px, hide the full team name and use the logo plus abbreviation. Retain headshots, drag handle, rank, position rank, and ADP with responsive spacing. Keep information readable without horizontal page overflow; reduce inter-column gaps and allow player names to wrap before shrinking the image or drag target.

Do not add a decorative row chevron or imply an unimplemented player-detail action.

### Team-name data

The board currently supplies `nflTeam` abbreviations. Add a shared frontend lookup from normalized team codes to full display names; the existing `NFL_TEAMS` dropdown list is not this lookup. Use the same lookup for row identity and team-name search, and align logo resolution with those codes. Preserve stored codes and board response semantics.

Verify the lookup against codes supplied by the player sync and add explicit aliases where needed. Keep it with the shared team utilities so future team-name or code changes have one mapping to maintain. An unknown nonempty code displays and remains searchable as that code; a missing team displays "Free Agent" with "FA" in compact rows. Missing logo assets still use the abbreviation fallback. Verify code/full-name search and unknown/free-agent fallbacks during implementation.

### Image data

Expose the existing Sleeper player identifier in the board response to support headshots. Sleeper image delivery was proposed and accepted but its current URL contract and coverage must be verified during implementation. Select and verify a consistent team-logo source at that time.

Handle missing identifiers, failed images, free agents, and team-defense entries with stable fallbacks. Reserve image dimensions to prevent layout shifts. Do not change database player identifiers or ranking identity. No image-provider endpoint has been verified by this specification.

## Filters and search

### Position filters

Retain multi-select behavior. `ALL` resets to the complete board; each individual position toggles independently. Deselecting the last individual position returns to `ALL`. Preserve combinations such as RB + WR + TE.

Each selected position has the accepted violet treatment. On phones, pills can scroll horizontally within their own area while Save remains reachable.

Dragging under position-only filtering preserves the slots occupied by excluded positions and recalculates overall and positional ranks consistently with existing behavior.

### Text search

Desktop search is available in the shared header. From another page, typing edits the search field without navigating. Pressing Enter or activating its labeled submit control navigates to Master Sheet with the trimmed query retained and applied. Blur does not navigate; an empty or whitespace-only submission does nothing. Preserve input focus through navigation so the user can continue typing.

Within Master Sheet, desktop and phone search both filter immediately as the query changes. Search within the user's current board by player name, team abbreviation or mapped full name, or position; this is not a user-account search. Phone search remains inside the Master Sheet page.

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
- Verify search by name/team code/full team name/position and unknown/free-agent fallbacks. Verify that cross-page typing and blur do not navigate, Enter/submit navigates with query and focus retained, and blank submission does nothing. Check immediate in-page filtering, combined filters, empty results, clearing, and Show in board without losing unsaved edits.
- Verify all drag input methods are disabled under text search, and Show in board reveals the intended row without unlocking a locked board.
- Verify imagery fallback and correct response mapping for both default and personalized boards.

### Visual and accessibility

- Inspect wide desktop, laptop, tablet, and narrow phone layouts with real row content and a full board, including both sides of the 640px row and 1024px shell breakpoints.
- Confirm the existing phone header/drawer arrangement remains intact, the toolbar does not obscure content, and the right rail is absent.
- Check long names, enlarged text, keyboard focus, and 44px drag targets at all widths. Verify 48px minimum mobile rows, 32px headshots, and growing headers with correctly adjusted sidebar/toolbar offsets. Respect reduced motion for scroll/highlight effects.
- Review shared-style effects on existing authenticated pages and Login/Register, preserving their workflows.
- Run the frontend build and relevant behavior tests; run backend mapping tests when changing the board response. Record browser evidence separately from automated test results.

## Delivery boundary

This document records the accepted design, completed local implementation, and verification evidence. Deployment remains a separate action; no production publication is claimed here.
