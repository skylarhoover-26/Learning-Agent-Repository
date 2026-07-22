# AI Learning Coach — Rollout Plan

Captured from Bridget's app-review notes (2026-07-16). This is the launch/logistics
half of that review; the product feedback from the same notes was imported into the
in-app feedback view (`/admin/feedback`).

## Testing rounds

- **Round 1** wrapping up — review call tomorrow, overflow call Wednesday.
  - Known bugs to fix before Round 2: notification bell, regenerate option not persisting after the UI push.
- **Round 2** begins mid-next week with the People Enablement team.
  - Two comms needed: one to the People Enablement channel, one to the Training Enablement channel.
  - Separate message from Brian to PE leadership asking for volunteer testers.
  - Both comms must specify hours needed, kickoff meeting date, and the manager-approval requirement.
- **Broader tester diversity** needed: engineering, sales, and other departments.
  - Reach out to known-friendly leaders (Rachel Bowman, Courtney Montreal, etc.).

## Launch phases

Frame the rollout as: **alpha (internal) → beta (small group) → soft launch (2–3 departments via SMT)**.

- **Soft launch target:** mid-next week — show to Gabrielle, Sam, and Kelly for informal feedback.
- **SMT presentation:** after Round 2 wraps — likely **August 4th or 11th**.
- **Whole-company access target:** message Ethan for **August 7th**.

## Launch infrastructure & open questions

- **Skillshop integration:** an AI Learning Coach button appears on the homepage post-Test-2.
  - Verify SSO: users already logged into Okta should auto-connect — no double sign-in.
  - Add a **"beta" badge** to set expectations around data resets.
- **Non-Okta users** (e.g. SDRs who access via Salesforce) need a different Skillshop homepage.
  - **Option A:** ask Ethan whether non-Okta users can access the app via an alternate login.
  - **Option B:** if not, work with Jenny on a role-based alternate homepage.
- **Okta provisioning:** currently requires a manual list; needs automation via **Snowflake**.
- **Splash video:** use Louie's tool; deploy in comms and eventually at the town hall.
  - May not be ready for SMT but should be ready for full-company launch.
- **Nominations spreadsheet** in the SMT channel — nominate users for the beta; being in beta means providing feedback.

## Next steps

- **Meet with Rachel first** (book early next week) to build the full launch project plan before any other planning meetings.
- **Message Ethan today** about Okta provisioning — ask if non-Okta users can access via an alternate login; start provisioning all People Enablement members.
- **Book Jenny** after the Rachel call — determine the homepage approach for non-Okta users once Ethan answers.
- **Draft two Round-2 testing comms** — one to People Enablement + Training Enablement channels; one from Brian to PE leadership requesting volunteers.
- **Fix Round 1 bugs** before mid-next week: back-button placement, centered nav buttons, notification bell, regenerate option, and Discovery color coding.
- **Brian** sends a message to People & Enablement leadership; send Ethan the list of users we want included.
