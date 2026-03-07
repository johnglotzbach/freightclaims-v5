# Getting FreightClaims v5 Up — What I Need From You

Hey Mike,

v5 is ready to go live on a test server. I need you to set up a few accounts and give me access so I can deploy everything. This is the stuff I can't do myself because it requires payment info and account ownership.

Once you do these steps, I handle the rest — connecting everything, deploying, and getting you a working URL to test.

---

## Step 1 — Create a Render account

Render is where everything runs — the app, the database, the cache, everything. One platform.

1. Go to **https://render.com**
2. Click **Get Started for Free**
3. Sign up using your **GitHub account** (the one that has the FreightClaims code)
4. When it asks to authorize Render to access your GitHub, click **Authorize**
5. Add me as a team member so I can set up the services:
   - Go to **Account Settings → Team**
   - Invite my email as an **Admin**

That's it for Render. I'll create the database, the web services, and configure everything once I have access.

---

## Step 2 — Get a Google Gemini API key

This powers all the AI features — document reading, claim intake, email drafting, risk scoring, etc.

1. Go to **https://aistudio.google.com**
2. Sign in with a Google account
3. Click **Get API key** at the top
4. Click **Create API key**
5. Pick **Create API key in new project**
6. Copy the key it generates — it looks like `AIzaSyB...long string...XYZ`
7. Send me that key

---

## Step 3 — Get a ConvertAPI key

This handles converting documents (Word, Excel, images) to PDF for processing.

1. Go to **https://www.convertapi.com**
2. Click **Sign Up Free**
3. Create an account
4. After login, go to **Account → API Secret**
5. Copy the secret
6. Send me that secret

---

## What to send me

Once you've done the steps above, send me:

- [ ] Render team invite (to my email)
- [ ] Gemini API key
- [ ] ConvertAPI secret

I'll handle everything from there — database setup, deployment, connecting all the services, and getting you a live test URL.

---

## Cost

| Service | Monthly |
|---------|---------|
| Render (hosting + database + cache) | $28 |
| Gemini AI | ~$5–10 |
| ConvertAPI | Free |
| **Total** | **~$33–38/month** |

vs. what we're paying now: **~$3,200/month**

Let me know when you've done the steps and I'll get it deployed.
