# Admin Setup — one-time steps

The site is live at https://the-straight-path-tsp.web.app. All public pages work. The admin surface at `/admin` is built and deployed, but Firebase Auth needs a **one-time console click** to enable Email/Password sign-in.

## 1. Enable Email/Password auth (≈30 seconds)

1. Open the Firebase Auth console:
   <https://console.firebase.google.com/project/the-straight-path-tsp/authentication/providers>
2. Click **Get started** (first time only).
3. Under "Sign-in method", click **Email/Password** → toggle **Enable** → **Save**.

## 2. Create your admin account

1. Visit <https://the-straight-path-tsp.web.app/admin/login>
2. Use the **"Create account"** flow in the login page (or, if the login page doesn't expose sign-up, create one via the Firebase Auth console: Authentication → Users → Add user).
3. After signing in, copy your **User UID** from the Auth console:
   <https://console.firebase.google.com/project/the-straight-path-tsp/authentication/users>

## 3. Grant yourself admin rights

Open the Firestore console:
<https://console.firebase.google.com/project/the-straight-path-tsp/firestore/databases/-default-/data>

1. Click **Start collection** → ID: `admins`
2. **Document ID**: paste the UID from step 2.
3. Add field: `email` (string) = your email address.
4. Add field: `role` (string) = `owner`.
5. Save.

## 4. Reload `/admin`

You are now authorized. The admin dashboard lists Articles, Resources, FAQ, Channels, and Settings.

---

## Optional: Enable Firebase Storage (for Media Library)

The admin `/admin/media` page can host images once Storage is initialized.

1. Open <https://console.firebase.google.com/project/the-straight-path-tsp/storage>
2. Click **Get Started** → accept the default region (`us-east4` — closest to Delaware).
3. Redeploy storage rules: `firebase deploy --only storage`.
4. `/admin/media` will immediately start accepting uploads (≤10 MB, `image/*`).

## Optional: Upgrade to Blaze (for email delivery + Functions)

Cloud Functions and the contact-form email delivery require the Blaze plan. Set a $5/mo billing alert and upgrade at:
<https://console.firebase.google.com/project/the-straight-path-tsp/usage/details>
