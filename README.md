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
   - Set `media_library.config.cloud_name` + `media_library.config.api_key`
5) Visit `/admin/` on your Netlify domain, invite yourself, log in, and post.

Notes:
- Cloudinary `api_key` is public; never put your Cloudinary API secret in this repo.
- Posts are stored in `content/posts.json`.
