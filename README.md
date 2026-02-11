# RedXolo (redxolo.com)

Simple static site (no build tools) with a cute landing page + an Instagram-style updates section.

## Pages
- Home: `/index.html`
- Services: `/services/`
- About: `/about/`
- Contact: `/contact/`
- Admin: `/admin/` (Decap CMS)

## Local preview
- `python3 -m http.server 5173`
- Open `http://localhost:5173`

## Admin setup (Netlify recommended)
1) Push this folder to a GitHub repo.
2) Create a Netlify site from the repo.
3) Enable **Identity** + **Git Gateway** (Identity → Settings).
4) In `admin/config.yml`:
   - Set `repo: YOUR_GITHUB_USERNAME/Redxolo`
5) Visit `/admin/` on your Netlify domain, invite yourself, log in, and post.

Notes:
- Uploads are stored in `uploads/` and committed via Git Gateway (so media lives on your site, not a separate service).
- Posts are stored in `content/posts.json`.
