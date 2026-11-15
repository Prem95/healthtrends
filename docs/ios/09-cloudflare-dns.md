# 09 — Cloudflare DNS

The domain does four jobs for the app. Only the first is strictly required;
do them in this order.

| Job | Required for App Store? | Records |
| --- | --- | --- |
| 1. Website, privacy policy, terms, support pages | **Yes** — App Store Connect requires a privacy policy URL and a support URL | apex + `www` |
| 2. Sending sign-in emails from your own address | Effectively yes — Supabase's built-in sender allows a handful of emails an hour | SPF, DKIM, DMARC, (return-path) |
| 3. A branded API domain (`api.YOUR_DOMAIN`) for Supabase | No — optional, paid Supabase add-on | CNAME + TXT |
| 4. Domain hardening | No, but cheap | DNSSEC, CAA |

`YOUR_DOMAIN` below is your registered domain in Cloudflare (for example
`bbiom.app`). Everything is done in the Cloudflare dashboard under the
domain › **DNS › Records** unless stated.

## 1. The website

The website (this repository's Next.js app) is deployed on Vercel. Point the
domain at it:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| `A` | `@` | `76.76.21.21` | DNS only |
| `CNAME` | `www` | `cname.vercel-dns.com` | DNS only |

Use the exact values Vercel shows under Project › Settings › Domains when you
add the domain; they are authoritative if they differ from the above.

**Proxy status: DNS only (grey cloud).** Vercel issues the certificate and
runs its own CDN; putting Cloudflare's proxy in front adds a second CDN,
breaks Vercel's certificate renewal unless configured carefully, and gains
nothing here. If you do want the orange cloud, set SSL/TLS mode to **Full
(strict)** first — never "Flexible", which sends traffic to the origin
unencrypted.

Then, on the website:

- `https://YOUR_DOMAIN/privacy` — the privacy policy (`10-build-release.md` §6
  lists what it must say).
- `https://YOUR_DOMAIN/terms` — terms of use (or use Apple's standard EULA in
  the app and link it here).
- `https://YOUR_DOMAIN/support` — how to get help: a contact address, how to
  export, how to delete the account, how to cancel the subscription.

Update in Supabase › Authentication › URL Configuration: **Site URL**
`https://YOUR_DOMAIN`, and redirect URLs `https://YOUR_DOMAIN/**` and
`bbiom://auth/callback`.

## 2. Email: sign-in codes from your own address

Supabase sends the sign-in code. Its default sender is for testing only, so
configure custom SMTP (Supabase › Authentication › Emails › SMTP Settings)
with any transactional provider (Resend, Postmark, Amazon SES, …). The
provider gives you the exact records; they always fall into these four:

| Purpose | Type | Name (typical) | Content (shape) |
| --- | --- | --- | --- |
| SPF — who may send for the domain | `TXT` | `@` or `send` | `v=spf1 include:<provider> ~all` |
| DKIM — signature key | `TXT` or `CNAME` | `<selector>._domainkey` | provider's key or target |
| Return path / bounce | `CNAME` or `MX` | `bounces` / `send` | provider's host |
| DMARC — policy | `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@YOUR_DOMAIN` |

Rules:

- **One SPF record per name.** If one exists, add the provider's `include:` to
  it; two `v=spf1` records on the same name both fail.
- All email records are **DNS only** — Cloudflare cannot proxy them anyway.
- Start DMARC at `p=none`, check the reports for two weeks, then move to
  `p=quarantine`. Sign-in emails that land in spam are a broken sign-in.
- Send from a sub-address such as `hello@YOUR_DOMAIN` or `no-reply@YOUR_DOMAIN`
  and set the sender name to "bbiom".
- If you also want to *receive* mail at the domain (for the support address),
  enable **Email › Email Routing** in Cloudflare and forward
  `support@YOUR_DOMAIN` to your inbox; it adds its own MX and SPF entries
  (merge the SPF as above).

Check: send yourself a code from the app, open the message's original source,
and confirm `spf=pass`, `dkim=pass`, `dmarc=pass`.

## 3. Optional: `api.YOUR_DOMAIN` for Supabase

By default the app talks to `https://<ref>.supabase.co`. That works, is
secure, and is what this guide assumes. A custom domain makes the Google
sign-in page show your domain instead of `<ref>.supabase.co`, and lets you move
Supabase projects later without an app update. It is a paid add-on on Supabase.

1. Supabase › Project Settings › Add-ons: enable **Custom domain**.
2. Cloudflare: add

   | Type | Name | Content | Proxy status |
   | --- | --- | --- | --- |
   | `CNAME` | `api` | `<ref>.supabase.co` | **DNS only** |

   It must be DNS only: Supabase issues the certificate for the hostname and
   must see requests directly.
3. Register it:

   ```sh
   supabase domains create --project-ref <ref> --custom-hostname api.YOUR_DOMAIN
   ```

   The command prints a `TXT` record for `_acme-challenge.api` (name and
   value). Add it in Cloudflare exactly as printed (DNS only), then:

   ```sh
   supabase domains reverify --project-ref <ref>   # repeat until verified
   supabase domains activate --project-ref <ref>
   ```

4. **Before activating**, add the new callback URL at every OAuth provider:
   Google Cloud Console › Credentials › your OAuth client › Authorized redirect
   URIs: `https://api.YOUR_DOMAIN/auth/v1/callback` (keep the old one too).
   Native Sign in with Apple and email codes are unaffected.
5. Point the clients at it: `EXPO_PUBLIC_SUPABASE_URL=https://api.YOUR_DOMAIN`
   in the Expo environments, `NEXT_PUBLIC_SUPABASE_URL` in Vercel, and the App
   Store Server Notifications URLs in App Store Connect
   (`https://api.YOUR_DOMAIN/functions/v1/app-store-notifications`).

The original `<ref>.supabase.co` keeps working after activation, so installed
copies of the app are not broken; ship the new URL in the next build.

## 4. Hardening

- **DNSSEC**: Cloudflare › DNS › Settings › Enable DNSSEC. If the domain is
  registered with Cloudflare Registrar it is one click; otherwise copy the DS
  record to your registrar.
- **CAA** — restrict who may issue certificates. Add one record per issuer
  you actually use:

  | Type | Name | Tag | Value |
  | --- | --- | --- | --- |
  | `CAA` | `@` | `issue` | `letsencrypt.org` |
  | `CAA` | `@` | `issue` | `pki.goog` |
  | `CAA` | `@` | `issue` | `sectigo.com` |

  Vercel uses Let's Encrypt; Supabase custom domains and Cloudflare's own
  certificates may use Google Trust Services or Sectigo. If a certificate
  stops renewing after adding CAA, check which CA it needs and add it — or
  leave CAA out; it is the least important item on this page.
- **SSL/TLS › Edge Certificates**: Always Use HTTPS on, minimum TLS 1.2, HSTS
  on once everything is served over HTTPS (start with a short max-age).
- **Do not** turn on Cloudflare features that rewrite responses (Rocket
  Loader, Email Address Obfuscation, Automatic HTTPS Rewrites) for proxied
  hosts serving the website; they are unnecessary with Vercel and can break
  the app's pages.

## 5. What the app does not need

- **Universal links / `apple-app-site-association`.** The app's sign-in uses a
  code (no link to open) and a custom-scheme redirect inside an
  authentication session for Google. Nothing in v1 needs `https://YOUR_DOMAIN/...`
  links to open the app. If a later version wants "open this link in the app",
  host `/.well-known/apple-app-site-association` on the website (served as
  `application/json`, no redirect) and add `ios.associatedDomains` in
  `app.config.ts`.
- **Cloudflare Workers, R2, or proxied API traffic.** Supabase is reached
  directly.

## 6. Final record set

With everything above (custom API domain included) the zone holds:

```
@                A      76.76.21.21                  DNS only   website
www              CNAME  cname.vercel-dns.com         DNS only   website
api              CNAME  <ref>.supabase.co            DNS only   Supabase (optional)
_acme-challenge.api TXT <from supabase domains>      DNS only   Supabase (optional)
@ (or send)      TXT    v=spf1 include:… ~all        —          email
<sel>._domainkey TXT/CNAME …                         DNS only   email
_dmarc           TXT    v=DMARC1; p=none; rua=…      —          email
@                MX     (Email Routing, if used)     —          support inbox
@                CAA    0 issue "letsencrypt.org"    —          hardening
```

Checks (from any machine):

```sh
dig +short YOUR_DOMAIN A
dig +short www.YOUR_DOMAIN CNAME
dig +short api.YOUR_DOMAIN CNAME          # if used
dig +short TXT _dmarc.YOUR_DOMAIN
curl -sI https://YOUR_DOMAIN/privacy | head -1   # HTTP/2 200
curl -sI https://YOUR_DOMAIN/support | head -1   # HTTP/2 200
```
