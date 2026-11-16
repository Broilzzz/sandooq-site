# Sandooq website

Public pages for the Sandooq app: home, privacy policy, terms of service and
account deletion (the URLs Google Play asks for). Plain HTML and one stylesheet,
served by GitHub Pages from `main`. Colours and type follow the app
(`lib/app/theme.dart` in the app repo).

- `/` – home
- `/privacy/` – privacy policy
- `/terms/` – terms of service
- `/delete-account/` – how to delete an account (Play's web deletion link)
- `/waitlist/` – waitlist form (launch email and early-tester invites)

When anything about data handling changes in the app, update the privacy policy
and its "Last updated" date in the same week.

## Waitlist

`/waitlist/` posts to a Google Apps Script web app that keeps one row per email
in a Google Sheet (a second sign-up with the same email updates that row). The
script is `tools/waitlist.gs`; its header has the setup steps. The web app URL
goes in `ENDPOINT` at the top of `waitlist/waitlist.js`; until it's set, the
form says the waitlist isn't open yet.

Links you share can say where they were posted, e.g.
`/waitlist/?ref=reel-ml` or `?utm_source=whatsapp`; it lands in the sheet's
"Came from" column (first source wins). The form's share buttons use
`?ref=share`.

Early testers ticked "I'd like to test it early": add their emails to the Play
Console closed test (12 testers for 14 days are needed before production on a
new personal account), then write the date in "Invited to test". The privacy
policy promises the list is deleted once Sandooq has launched and invites are
sent.
