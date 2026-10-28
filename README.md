# Student Image Voting App (Supabase + GitHub Pages)

A static web app where students can upload images and vote for multiple favorites. Images and votes are stored in a shared Supabase database.

## Files

- `index.html` — page structure
- `style.css` — responsive layout
- `app.js` — upload, voting, sorting, and refresh logic
- `config.js` — Supabase connection settings (**edit this for your project**)
- `supabase/setup.sql` — database tables, storage bucket, and public access policies

## A. Set up Supabase

1. Create a project at https://supabase.com.
2. Find the **Project URL** and **Publishable key** (or legacy `anon` key) in the project dashboard.
   - Look under Project Settings → API Keys or the Connect screen.
   - Never use a `service_role` or secret key in browser code.
3. Open the **SQL Editor** and run the full contents of `supabase/setup.sql`.
4. Open `config.js` and replace:
   - `SUPABASE_URL` with your Project URL
   - `SUPABASE_PUBLISHABLE_KEY` with your Publishable key or legacy anon key
5. Save the file.

## B. Publish with GitHub Pages

1. Sign in at https://github.com and create a new repository, e.g. `student-image-voting`.
2. Extract this ZIP. Upload the files `index.html`, `style.css`, `app.js`, `config.js`, `README.md`, and the `supabase` folder to the repository root. Upload the extracted files, not the ZIP itself.
3. Open **Settings → Pages** in the repository.
4. Under **Build and deployment → Source**, choose `Deploy from a branch`.
5. Choose branch `main`, folder `/(root)`, then click **Save**.
6. When deployment finishes, open the URL shown on the Pages settings screen. It usually looks like `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.
7. Share that URL with your students. The first deployment may take a few minutes.

## C. Test before sharing

- Upload an image and confirm it appears.
- Open the site on another browser or phone and confirm the same image and vote count appear.
- Vote and refresh to confirm the vote is saved.
- Wait about 15 seconds or click Refresh to see changes made by other participants.

## Important limitations and safety

- There is no login. Anyone can vote multiple times; browser-side restrictions would not reliably prevent abuse.
- Anyone can upload images using the public policy. Use this for a small classroom activity and avoid widely sharing the link outside the class.
- Image URLs are public. Tell students not to upload faces, names, contact details, sensitive photos, or material they do not have permission to share.
- To reduce abuse or unexpected costs, restrict uploads or add login/invite codes, server-side rate limits, or moderation.
- There is no admin delete screen. Manage inappropriate uploads through the Supabase dashboard, including both database rows and Storage files.
- Only use a public Publishable/anon key in `config.js`. Never expose `service_role` or secret keys.
- An internet connection is required because the app loads the Supabase JavaScript library from a CDN.

## How it works

- Images are resized and converted to JPEG in the browser, then uploaded to Supabase Storage.
- Image metadata is stored in the `images` table; each vote is stored as a row in `image_votes`.
- The gallery reloads every 15 seconds to reflect uploads and votes from other participants.
- Each image is limited to 5 MB before processing; up to 5 images can be selected per upload.
