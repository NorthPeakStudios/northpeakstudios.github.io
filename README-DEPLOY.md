# Northpeak Studios website: how to put it online

This folder is a finished static website (plain HTML, CSS and a tiny script). No build step, nothing to install. Upload it as-is.

Pages
- index.html: studio home with the Apps section
- synapse/: Synapse app page
- synapse/privacy/: Synapse privacy policy (use this link for Google Play)
- support/: FAQ and contact (northpeak.support@gmail.com)
- about/: about the studio
- 404.html: "page not found"

## Option A: free on GitHub Pages (recommended)

You need a free GitHub account (13+ is allowed).

1. Make the repo. Sign in at github.com, click New repository, and name it exactly `<your-username>.github.io` (for example `northpeakstudios.github.io`). Set it to Public and create it.
2. Upload the files. In the new repo click "Add file" > "Upload files". Open this folder on your computer, select everything INSIDE it (index.html, 404.html, styles.css, script.js, favicon files, CNAME.example, and the folders assets, synapse, support, about) and drag it in. Click "Commit changes". Tip: on Windows, hidden files like `.nojekyll` may not show; that's fine, the site works without it.
3. Turn on Pages. Go to Settings > Pages. Under "Build and deployment" pick Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`, and Save. After a minute or two the site is live at `https://<your-username>.github.io/`.

Your Google Play privacy policy URL will then be:
`https://<your-username>.github.io/synapse/privacy/`

Tip: if your username is not studio-like, make a GitHub organization (free) called something like `northpeakstudios` and create the repo `northpeakstudios.github.io` inside it.

## Option B: add your own domain later

1. Buy a domain. Good places: Cloudflare Registrar (sells at cost, no markup), Porkbun, or Namecheap. Rough yearly prices (they change, check at checkout):
   - northpeakstudios.com: about $10 to $12 a year
   - northpeak.studio: about $20 to $30 a year (".studio" costs more, and renewals can be higher than the first year)
   - northpeak.app or .dev: about $12 to $15 a year (these force HTTPS, which GitHub Pages provides)
   You need to be 18 to buy one yourself, so a parent or guardian should do the purchase.
2. Tell GitHub. In the repo go to Settings > Pages > Custom domain, type your domain (for example `northpeakstudios.com`) and Save. GitHub adds a file called `CNAME` to the repo for you. (Or rename `CNAME.example` to `CNAME` and put your domain on its one line.)
3. Add DNS records at the place you bought the domain:

   | Type  | Name / Host | Value                    |
   |-------|-------------|--------------------------|
   | A     | @           | 185.199.108.153          |
   | A     | @           | 185.199.109.153          |
   | A     | @           | 185.199.110.153          |
   | A     | @           | 185.199.111.153          |
   | AAAA  | @           | 2606:50c0:8000::153      |
   | AAAA  | @           | 2606:50c0:8001::153      |
   | AAAA  | @           | 2606:50c0:8002::153      |
   | AAAA  | @           | 2606:50c0:8003::153      |
   | CNAME | www         | <your-username>.github.io |

   (The AAAA rows are optional.) If you use Cloudflare for DNS, set these records to "DNS only" (grey cloud) until GitHub shows the domain as verified.
4. Wait for DNS (minutes to a few hours), then tick "Enforce HTTPS" in Settings > Pages.

Then update the privacy URL in Google Play to `https://<your-domain>/synapse/privacy/`.

## Option C: Cloudflare Pages (also free)

Cloudflare dashboard > Workers & Pages > Create > Pages > "Upload assets", name the project (for example `northpeak`), and drag this folder in. It goes live at `https://northpeak.pages.dev/`, and you can attach a custom domain from the project's Custom domains tab.

## Editing later

- Support email is in every page footer, on support/index.html and in synapse/privacy/index.html. Search for `northpeak.support@gmail.com` to change it.
- When the Google Play listing is live, replace the "Coming soon to Google Play" badge in index.html and synapse/index.html with a link to the listing. If you use Google's official "Get it on Google Play" badge image, download it from Google's badge page (play.google.com/intl/en_us/badges/) and follow their rules.
- Add a new app: copy the Synapse card in index.html and the synapse folder, then edit the text.
- All links are relative, so the site works in any folder. The only exception is 404.html, which uses links starting with "/" because it is shown at any address; that is correct on GitHub Pages user sites, Cloudflare Pages and custom domains.
