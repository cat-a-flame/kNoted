# Firebase setup

This app now uses Firebase (Firestore + Storage + Auth) instead of Supabase.
A few one-time steps happen in the Firebase console — they can't be done from
code.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and create a project (Google
   Analytics is not needed).
2. In **Build > Firestore Database**, create a database (production mode,
   pick any region).
3. In **Build > Storage**, click "Get started" to provision the default
   bucket.
4. In **Build > Authentication**, click "Get started" and enable the
   **Email/Password** sign-in provider.

## 2. Create your one login

This app has no sign-up page — there is exactly one account, created by hand:

1. In **Authentication > Users**, click "Add user" and enter the email/password
   you want to sign in with on every device.

## 3. Lock down security rules

Since there's a single user and no per-record ownership, rules just need to
require a signed-in request. In **Firestore Database > Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

In **Storage > Rules**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Publish both.

## 4. Get your web app config

In **Project settings > General > Your apps**, add a Web app and copy the
config values into environment variables (`.env.local` for local dev, and
your host's env var settings — e.g. Netlify — for deployment):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Once those are set, sign in at `/login` with the account created in step 2 —
it'll work from any device since it's a real Firebase Auth account, not
local-only storage.
