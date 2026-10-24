# Prompt: build the student pop-up food ordering app

Copy everything below the line into your AI app builder (Lovable, Bolt, v0, Replit, Cursor or Claude Code all work). Replace `Blazer Bites` with the venture's name once you pick it, or leave it and change it later in one config file.

---

You are a senior full-stack engineer and product designer. Build a complete, working, mobile-first ordering app called **Blazer Bites** for a student-run pop-up food venture at the University of Alabama at Birmingham (UAB). Build all three parts described below, use realistic seed data, and make it run end to end with no manual setup beyond environment variables.

## 1. Context: why this app exists

- UAB's dining is run by Sodexo. Its official app, **EVERYDAY**, only shows dining hall menus, has no ordering, and students report that almost nobody uses it. Our app has to be the one students actually choose to open.
- Students eat in 10 to 15 minute gaps between classes, labs and clinical rotations. Noon lines at the Hill Student Center eat most of that gap. A meal swipe costs about $11 and chain retail costs $10 to $14.
- Our venture runs student-led pop-up food carts at the edge of campus, cooked in a rented commissary kitchen. A professional chef mentor owns every recipe and tastes the food before every service.
- The venture is judged on three goals, in this order of weight. Every feature must serve at least one:
  1. **Taste (50%)**: every dish averages 4.3 of 5 or better.
  2. **Time (30%)**: under 3 minutes from arriving at the cart to food in hand for pre-orders; walk-ups under 6 minutes, **never over 10 minutes**.
  3. **Price (20%)**: every item at $8 or less, and one item always $5.
- Lesson from Stanford's student-run On Call Cafe: their pilot crowds became the evidence that won them university support, but they struggled with crowds on opening nights. So this app must **record every order, wait time and rating** from day one, export it as a report for administrators, and **cap crowds instead of letting lines build**.

## 2. Tech stack and constraints

- A **Progressive Web App** (installable on iPhone and Android home screens, works in any phone browser). Build with React + TypeScript + Vite, Tailwind CSS, and Supabase (Postgres, Auth, Realtime, Row Level Security). If your platform has its own preferred stack, use the closest equivalent and keep the same data model.
- Payments: integrate **Square** (Web Payments SDK + Orders API) in sandbox mode, behind a `PaymentProvider` interface so it can be swapped. Include a "demo mode" that fakes successful payment so the app can be shown at a pitch with no real card.
- Put all branding in one file (`src/config/brand.ts`): app name `Blazer Bites`, tagline "Chef-quality food. Under $10. In your hand in under 3 minutes.", colors, logo placeholder. Default palette: UAB green `#1E6B52` and gold `#F4C300`, warm off-white background, with a dark mode.
- Put all operating rules in one config file (`src/config/rules.ts`) with these defaults, editable by an admin in the app later: pickup window length 10 minutes, orders per window per cart 25, walk-up line cutoff 15 people, max posted wait 10 minutes, surge trigger 6 minutes for 2 windows in a row, express menu size 2 items, rating threshold to cut a dish 4.0 over 14 days, rating needed to join the fixed menu 4.3, loyalty reward every 10th meal free.
- Feature flags: `DRAGON_CASH_ENABLED` (default **false**, see Plan B below), `BLAZERBUCKS_ENABLED` (default false until approved), `LATE_NIGHT_ENABLED` (default false).
- Accessibility: WCAG AA contrast, large tap targets, screen-reader labels, works one-handed. Fast on a weak campus cell signal: skeleton loaders, cached menu, under 2 seconds to the menu.

## 3. Part one: the student app

Sign-in with a magic link to any email, plus guest checkout with just a name and phone number. Optional UAB email (`@uab.edu`) badge. Screens:

1. **Home / cart map.** A map (Leaflet + OpenStreetMap) of today's open carts with a card for each: location name, distance, **live wait in minutes**, orders ahead, next open pickup window, and a status chip (Open / Busy / Express menu / Closed). Wait times update in real time over Supabase Realtime. A cart whose wait would pass 10 minutes shows "Full right now, next window 12:20" instead of a longer wait. A one-line banner shows today's $5 item and the weekly chef's special.
2. **Menu.** Per cart. Small on purpose: 4 fixed items plus 1 weekly special. Each dish shows photo, price, **average rating and number of ratings**, short description, allergen icons and calories (labels are checked by Nutrition Sciences students; show a "Verified by UAB Nutrition students" tag when the flag is set on a dish). When a cart is in surge mode, show only the express items with a note: "Express menu while it's busy, so nobody waits long." Show "Coming next week" for the next special.
3. **Pickup window picker.** A row of 10-minute windows (for example 11:30, 11:40, 11:50) for the chosen cart, each with spots left. **Full windows are disabled**, and the app offers the next open window or a quieter nearby cart. Hold a spot for 5 minutes during checkout so two people can't take the last one. Suggest a window from the student's class schedule if they've entered one (optional "My class gaps" setting).
4. **Checkout.** Card, Apple Pay and Google Pay through Square. Show Blazerbucks when its flag is on and Dragon Cash only when its flag is on. Show the total clearly; no hidden fees. Apply loyalty rewards automatically.
5. **Order tracking.** A big pickup number and a QR code, with statuses: Received, Cooking, Ready, Picked up. Push notification (web push) when the order is Ready, and a reminder 5 minutes before the window. A "Running late?" button moves the order to the next open window once.
6. **Rate it.** After pickup, a one-tap 1 to 5 star rating per dish, with optional tags (Too salty, Perfect, Cold, Small portion, Would order again) and an optional comment. Also reachable by scanning the QR on the receipt without an account. One rating per dish per order.
7. **Loyalty card.** A punch card: 10th meal free. Show progress on Home.
8. **Profile.** Order history with one-tap reorder, favorite dishes, allergen preferences that warn on the menu, notification settings, and class gaps.

## 4. Part two: the crew and kitchen screens

A tablet-friendly view for signed-in crew (role `crew` or `lead`):

1. **Kitchen board.** Orders grouped by pickup window, with item counts totaled per window so the kitchen can **batch-prep** ("11:40 window: 9 hot chicken, 6 rice bowls..."). Tap to move orders Cooking to Ready. Shows today's prep totals by 9 a.m. from pre-orders.
2. **Cart handoff.** Scan the student's QR or type the pickup number, confirm, mark Picked up. The app records the arrival-to-handoff time.
3. **Walk-up register.** Quick-tap entry of walk-up orders from the same small menu. The crew taps a counter to update the walk-up line length. When the line passes 15 people or the wait passes 10 minutes, the register shows **"Stop walk-ups"** and a QR sign that sends people to the next open app window.
4. **Surge alert.** When waits run over 6 minutes for two windows in a row, alert the lead, switch the cart to the express menu in one tap (this updates the student app instantly), and send a "call standby crew" notification.
5. **Chef sign-off.** Before a cart can open, the lead checks off the chef mentor's taste test for each dish and the food-safety checklist (hot-hold and cold-hold temperatures logged). A cart cannot go Open without it.
6. **Sold out.** Mark any item sold out; it disappears from new orders.

## 5. Part three: the admin dashboard

For the role `admin` (the student general manager and chef mentor):

1. **Today:** orders per cart, live waits, windows filled, revenue, sold-out items.
2. **Taste board:** every dish's average rating over 7 and 14 days, rating count and top tags. Flag any dish **under 4.0 for 14 days** in red ("Fix or cut"). Flag a weekly special averaging **4.3 or higher** in green ("Ready for the fixed menu").
3. **Time board:** median and 90th-percentile arrival-to-food time for pre-orders and walk-ups, number of times any wait passed 10 minutes (target zero), and windows that hit their cap. Any spot that keeps hitting its cap is flagged "Needs a second cart or more windows."
4. **Price board:** highest menu price (must be $8 or less), share of orders at $7 or less (target 60%), and food cost percentage per dish (target about 30%) from plate costs the admin enters.
5. **Viability:** orders per day per cart against the break-even line of **68 orders a day** and the target of 100; repeat customers within 30 days (target 40%).
6. **Menu manager:** add or edit dishes, prices, plate costs, photos, allergens, and set the weekly special.
7. **Schedule and spots manager:** carts, spots, service days and hours, pickup window capacity per cart.
8. **Pilot report:** one-click export (PDF and CSV) of total customers, orders, average wait, ratings per dish and repeat rate for any date range, titled "Blazer Bites pilot results", for showing Campus Dining and student government.

## 6. Data model (Postgres)

Create tables with Row Level Security: `users` (role: student, crew, lead, admin), `carts`, `spots` (name, lat, lng, notes such as power available), `service_days`, `pickup_windows` (cart, start time, capacity, booked count), `menu_items` (name, description, price, plate cost, photo, allergens, calories, is_five_dollar_item, is_special, is_express, nutrition_verified, status), `orders` (user or guest, cart, window, status, pickup number, channel: app or walk_up, payment method, totals, timestamps for placed, ready, arrived and picked up), `order_items`, `ratings` (order item, stars, tags, comment), `loyalty_cards`, `wait_snapshots` (cart, time, wait minutes, orders ahead, walk-up line length, for the reports), `prep_checks` (chef taste sign-off and temperature logs), `settings` (the rules from section 2).

Compute **live wait time** as: (orders ahead in the current and earlier windows minus orders already handed off) times the cart's rolling average handoff time, plus the walk-up line length times the average walk-up service time. Recompute on every order status change and store a `wait_snapshot` every 2 minutes. Window capacity must be enforced in the database (a transaction or a Postgres function), not only in the UI.

## 7. Seed data

Seed four spots at the edge of UAB's campus, not on UAB property: "Sterne Library edge", "Campus Green edge (by the residence halls)", "Business & Engineering edge", and "Medical corridor (near the hospital)". Use approximate coordinates around 33.502, -86.806 and mark them as editable placeholders.

Seed the launch menu:

| Item | Price | Plate cost |
|---|---|---|
| Hot chicken sandwich, slaw, pickles | $7.00 | $2.20 |
| Rice bowl (chicken shawarma or tofu) | $7.50 | $2.30 |
| Three street tacos | $6.50 | $2.00 |
| $5 value item: biscuit sandwich or soup cup | $5.00 | $1.50 |
| Weekly chef's special: shrimp and grits | $8.00 | $2.60 |

Mark the chicken sandwich and tacos as the express menu. Service hours Monday to Friday, 10:30 a.m. to 2:30 p.m. Add a hidden late-night slot (8 p.m. to midnight near the residence halls) behind `LATE_NIGHT_ENABLED`. Seed two weeks of realistic sample orders, waits and ratings so the dashboards look alive in a demo, and label all sample data clearly as sample data in the admin view.

## 8. Plan A and Plan B

The venture launches **independently** (Plan A): carts off UAB property, card and mobile pay, Blazerbucks if approved. If UAB Campus Dining (Sodexo) partners with us later (**Plan B**), carts move onto campus and students can pay with **Dragon Cash**, the $225 every full-time undergraduate gets each semester. Design for both: spots are just data, and Dragon Cash is a payment method behind `DRAGON_CASH_ENABLED` with a stub integration and a clear TODO for UAB's campus card system. Do not use UAB or Sodexo logos anywhere.

## 9. Design direction

Feels like a friendly student brand, not a corporate dining portal: bold food photos (use placeholders), big readable wait times, green and gold accents, rounded cards, one primary action per screen. The most important thing on Home is "how long will I wait and when can I get my food". Copy is short and warm, for example "Ready in 3 minutes" and "Rate your tacos".

## 10. Deliverables and quality bar

- Working student app, crew screens and admin dashboard, with role-based routing.
- Database migrations, RLS policies, seed script, and a `.env.example`.
- Unit tests for window capacity, wait-time calculation, surge trigger, walk-up cutoff and the rating flags; one end-to-end test of order, kitchen, handoff and rating.
- A README covering setup, how to switch on demo mode for a pitch, how to rename the app, and how to change the operating rules.
- Before you finish, walk through this checklist and confirm each item works: a full window can't be booked; no cart ever shows a wait over 10 minutes; surge switches the student menu to express in real time; a dish under 4.0 for 14 days is flagged; the pilot report exports.

Start by showing me the data model and screen list, then build it.
