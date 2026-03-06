# LLRA App — Deployment Guide
## University of the Nations · Learning Level Readiness Assessment

---

## Step 1: Get your Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, name it "LLRA App", copy the key
5. Keep this key safe — you will need it in Step 4

---

## Step 2: Create a GitHub Repository

1. Go to https://github.com and sign in
2. Click the **+** button (top right) → **New repository**
3. Name it: `llra-app`
4. Set it to **Private** (recommended — protects your story content)
5. Do NOT check "Add README" or "Add .gitignore" — the project already has these
6. Click **Create repository**
7. Copy the repository URL shown (e.g., `https://github.com/yourusername/llra-app.git`)

---

## Step 3: Push the code to GitHub

Open a terminal on your computer and run these commands.
Replace `YOUR_REPO_URL` with the URL you copied in Step 2.

```bash
# Navigate to the project folder
cd llra-app

# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit — LLRA app v1.0"

# Add your GitHub repo as the destination
git remote add origin YOUR_REPO_URL

# Push the code
git push -u origin main
```

If Git asks for authentication, use your GitHub username and a Personal Access Token
(not your password). Create one at: https://github.com/settings/tokens → New token (classic)
with **repo** scope checked.

---

## Step 4: Deploy to Vercel

1. Go to https://vercel.com and sign in with your GitHub account
2. Click **Add New Project**
3. Find and click **Import** next to `llra-app`
4. Leave all build settings as default (Vercel detects Next.js automatically)
5. Click **Environment Variables** and add these five:

   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | Your key from Step 1 |
   | `ELEVENLABS_API_KEY` | Your ElevenLabs API key |
   | `ELEVENLABS_VOICE_ID` | The ElevenLabs voice ID you want to use |
   | `ELEVENLABS_MODEL_ID` | `eleven_multilingual_v2` |
   | `ADMIN_PASSWORD` | Choose a strong password for the admin dashboard |
   | `SESSION_SECRET` | Any long random string (e.g., `uofn-llra-secret-2024-xk9p2`) |

6. Use exact values only for IDs (no extra text like `(recommended)`).
7. Click **Deploy**
8. Wait ~2 minutes for the build to complete
9. Vercel gives you a URL like `https://llra-app-abc123.vercel.app`

---

## Step 5: Test the app

1. Open your Vercel URL in a browser
2. Test the **student flow**:
   - Select "Speak my answers" mode — test microphone permission prompt
   - Select "Type my answers" mode — go through a few questions
3. Test the **admin dashboard**:
   - Go to `https://your-url.vercel.app/admin`
   - Enter the admin password you set in Step 4
   - You should see completed sessions listed

---

## Step 6: Share with students

Give students this URL:
```
https://your-url.vercel.app
```

Give administrators this URL:
```
https://your-url.vercel.app/admin
```

---

## Audio Mode — Browser Requirements

Story/question narration uses ElevenLabs high-quality TTS.
Voice *input* (student speaking answers) uses the browser Web Speech API.

| Browser | Speech Input (answers) | Story/Question Audio |
|---------|-------------------------|---------------------|
| Chrome  | ✅ Full support | ✅ Full support |
| Edge    | ✅ Full support | ✅ Full support |
| Safari  | ✅ iOS/Mac supported | ✅ Full support |
| Firefox | ❌ Not supported | ✅ Full support |

**Recommendation:** Use Chrome or Edge for best overall experience.
The app detects browser limitations and falls back to text input when needed.

On **mobile** (iOS/Android), students must allow microphone access when prompted.
The app works on mobile browsers — no app download required.

---

## Updating the app

To make changes (e.g., add questions, update stories):

1. Edit the files locally
2. Run: `git add . && git commit -m "Update: describe your change" && git push`
3. Vercel automatically rebuilds and redeploys within ~2 minutes

---

## Important Notes

- **Sessions are stored in memory** — they reset if the Vercel function restarts (usually after inactivity). For permanent storage, consider adding Vercel KV (free tier available) or Supabase. Contact your developer for this upgrade.
- **API costs** — each assessment uses roughly 30–60 API calls. At current Anthropic pricing, one full assessment costs approximately $0.10–0.25 USD.
- **Story content** — both stories are embedded in the code on the server side. They are not visible to students.
- **Admin password** — stored as an environment variable, not in the code. Change it in Vercel dashboard → Settings → Environment Variables at any time.

---

## Troubleshooting

**"Application error" on the assessment page**
→ Check that `ANTHROPIC_API_KEY` is correctly set in Vercel environment variables.

**Audio not working**
→ Check `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in Vercel.
→ Verify the selected ElevenLabs voice is active and available in your account.
→ For spoken answers, student must allow microphone access.
→ HTTPS is required for microphone access — Vercel provides this automatically.

**Admin dashboard shows no sessions**
→ Sessions stored in memory reset on server restart. This is expected on the free Vercel plan.
→ To persist sessions, upgrade to Vercel KV storage.

**Build fails on Vercel**
→ Check the build log for errors. Most common cause: missing environment variables.
→ Ensure all five environment variables are set before deploying.

---

*For technical support, contact your developer with the Vercel build log and a description of the issue.*
