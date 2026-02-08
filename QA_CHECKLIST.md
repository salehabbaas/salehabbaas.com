# QA CHECKLIST

## Public Website

- [ ] Home H1 contains "Saleh Abbaas"
- [ ] Public pages load: Home, About, Experience, Projects, Services, Certificates, Knowledge, Creator, Book Meeting, Contact
- [ ] "From the Creator" section shows latest 3 public items
- [ ] About page shows topic pillars
- [ ] Project details page shows related creator posts by tags

## Creator Public SEO

- [ ] `/creator` renders featured + latest feed + filters + pagination
- [ ] `/creator/<slug>` renders server-side with metadata
- [ ] Canonical URL present on creator detail pages
- [ ] OG/Twitter image uses dynamic OG route
- [ ] JSON-LD Article injected per creator detail page
- [ ] Sitemap includes `/creator` and only public `/creator/<slug>` items
- [ ] RSS available at `/creator/rss.xml`

## Creator Admin

- [ ] `/admin/login` requires Firebase auth
- [ ] Non-admin users blocked from `/admin/*`
- [ ] Content item CRUD works
- [ ] Variant CRUD works with platform fields
- [ ] Slug uniqueness enforced
- [ ] Visibility/private/unlisted/public behavior verified
- [ ] Scheduled calendar list renders
- [ ] Mark Published workflow sets `publishedAt`
- [ ] Metrics can be stored manually
- [ ] Template/hook/CTA libraries save and apply

## Job Tracker Admin

- [ ] Job form CRUD works
- [ ] Status/source/search filters work
- [ ] XLSX export works and headers match `JOB_EXPORT_HEADERS`
- [ ] Dropdown settings persist in Firestore

## Booking System

- [ ] `/book-meeting` loads availability, meeting types, and timezone input
- [ ] Booking submit blocks unavailable or already-booked slots
- [ ] Booking writes `bookings` + `bookingSlotLocks` documents
- [ ] Admin `/admin/bookings` can cancel/reschedule and lock cleanup occurs
- [ ] Remote Config toggle enables/disables booking end-to-end

## Security

- [ ] Firestore rules block admin collections for non-admins
- [ ] Public users can only read published public/unlisted variants
- [ ] Private variants are inaccessible for public users
- [ ] Storage rules enforce admin writes
- [ ] App Check enabled and enforced in Firebase console

## Performance

- [ ] Route revalidation works from admin panel
- [ ] Creator list/detail pages cached (`revalidate` set)
- [ ] Firestore indexes are deployed and query latency is acceptable

## Functions

- [ ] `submitContact` stores submissions
- [ ] `optimizeCreatorMedia` creates optimized webp assets
- [ ] `sendCreatorScheduleReminders` writes reminder docs daily
- [ ] `revalidateCreatorCache` callable works with admin claim
- [ ] `setAdminClaim` callable is admin-only

## Analytics

- [ ] `page_view` triggered on route change
- [ ] `view_creator_item` triggered on creator detail visit
- [ ] `click_external_post` triggered on outbound post link click
- [ ] `download_resume` triggered on resume click
- [ ] `contact_submit` triggered on contact success
- [ ] `book_meeting` triggered on booking success
- [ ] `subscribe_newsletter` triggered on subscribe success
- [ ] `social_click` triggered on social follow link clicks
