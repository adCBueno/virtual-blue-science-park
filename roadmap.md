# Interactive science park
- [x] Optimise mobile navigation, in-flow profiles/editing, touch universe, details and full-screen chat; verified 320–1024px, guest accordions, simulated editing and chat scroll restoration without changing desktop.
- [x] Build the universe and company focus transitions with distinct demo ecosystems.
- [x] Add opportunity details, collaboration explanations, and category filters.
- [x] Make company interests change recommendation ranking and layout.
- [x] Verify interactions and mobile layout, then save the work.

# Accounts and contextual navigation
- [x] Remove opportunity category tabs and make top navigation background-free.
- [x] Add password login, server-enforced staff/company access and persistent profiles.
- [x] Add private saves, confirmed publishing, and in-app review requests with a lightweight staff workspace.
- [x] Add a development-only role preview that never grants database permissions.
- [x] Verify guest access, account boundaries, profile persistence, review workflow and mobile layout.
- [x] Add animated connection waves behind the login form and verify readability.
- [ ] Provision actual organisational and employee accounts — waiting for registered emails and account associations from the owner.

# Inline company profile and AI assistant
- [x] Show the focused company's profile inline with expandable sections and provenance labels.
- [x] Add authorised inline editing with private saves and publishing of selected sections only.
- [x] Add a floating assistant that answers from the data each visitor may see and can act on the universe.
- [x] Verify guest answers, model replies, simulated-role editing, and phone layouts.

# Blue the companion
- [x] Replace the rectangular chat button with an animated mascot inspired by the Blue Science Park symbol.
- [x] Add the first-visit greeting bubble, "Ask Blue" tooltip, click reaction and chat-header avatar.
- [x] Keep every chat answer, source and permission exactly as before, with reduced-motion and keyboard support.

# Company profile panel fixes
- [x] Widen the focused-company panel to about 400px (about 500px while editing), with a sticky header and actions, no overlap with the zoom controls or Back to Universe, and the universe still visible.
- [x] Make Edit Profile work inline: editable description, products, technologies, markets, geography, priorities, projects and interests, with Save privately / Publish / Cancel.
- [x] Add an "Evidence & Sources" section listing provenance for every section, and keep saved interests feeding recommendations.
- [x] Verify the panel on desktop and phone: guest read-only, representative and staff actions, editing shift, phone drawer with a solid save bar.

## Still open
- [ ] Signed-in save/publish write path has not been exercised end-to-end (no auth users in the backend yet); the RPC and row policies were checked by inspection.
## Mobile focus tabs (done)
- [x] Map / Company Info tabs below 768px, Map default, state preserved across switches
- [x] Demo role dropdown moved into Company in Focus on phones; desktop position unchanged

## Mobile universe radial layout (done)
- [x] Removed mobile connection pagination; all connected nodes show at once in a radial arrangement around the focused company
- [x] Taller mobile map (560px) when focused; desktop and tablet positioning untouched
