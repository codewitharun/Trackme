# TrackMe — Student Study Accountability Platform

A full-stack monorepo for tracking and holding students accountable to their study schedules.

## Architecture

```
TrackMe/
├── apps/
│   ├── mobile/          # React Native Expo (iOS + Android)
│   └── backend/         # Node.js + Express API
└── package.json         # Monorepo root
```

## Features

### Student
- 📸 **Study Check-ins** — Camera-only photo with activity description (no gallery uploads allowed)
- 📝 **Daily Summary** — Submit study summary by 11 PM deadline with mood + topics + hours
- 🔥 **Streak Tracking** — Consecutive daily summary streak, broken if missed
- 📅 **Schedule View** — See assigned study schedules from teacher
- 🔔 **Push Notifications** — Alerts at 8 AM, 2 PM, 7 PM, and 10 PM summary reminder

### Teacher (Manager)
- 📊 **Dashboard** — Live overview: check-ins, summaries, missing submissions, top students
- 📸 **Review Check-ins** — Approve/reject with optional feedback, notifies student
- 📝 **Review Summaries** — Rate (1–5 stars) and give written feedback
- 👥 **Student Management** — Add students, view profiles and stats
- 📅 **Schedule Management** — Create/delete study time windows by day of week
- 📢 **Send Alerts** — Push a check-in prompt to all your students instantly

### Admin (Principal)
- 👑 **Full Dashboard** — Platform-wide stats: all students, all teachers
- 👥 **User Management** — Create/deactivate students, teachers, and admins
- 📊 **Reports** — Today / 7-day / 30-day analytics with engagement rate bars and leaderboard
- 📢 **Global Alerts** — Push check-in alerts to all students across all teachers

## Auto-Scheduled Notifications (Backend Cron)

| Time | Action |
|------|--------|
| 8:00 AM daily | Morning prompt to all active students |
| 2:00 PM weekdays | Afternoon check-in reminder |
| 7:00 PM daily | Evening study session prompt |
| 10:00 PM daily | Summary deadline warning (students who haven't submitted) |
| 11:01 PM daily | Streak reset for students who missed summary |

## Image Upload — Cloudinary (Free)

**Why Cloudinary:** 25 GB storage + 25 GB bandwidth/month, no credit card required.

Sign up at https://cloudinary.com → get Cloud Name, API Key, API Secret → add to backend `.env`.

---

## Setup

### 1. Firebase Setup
1. Go to https://console.firebase.google.com → create a project
2. Enable **Authentication** (Email/Password provider)
3. Enable **Firestore Database** (start in test mode, add rules later)
4. Enable **Cloud Messaging** (for push notifications)
5. Create a **Web App** → copy config for mobile `.env`
6. Generate a **Service Account key** → Project Settings → Service Accounts → Generate new private key → use for backend `.env`

### 2. Cloudinary Setup
1. Sign up at https://cloudinary.com (free, no credit card)
2. Dashboard → copy Cloud Name, API Key, API Secret → add to backend `.env`

### 3. Backend
```bash
cd apps/backend
cp .env.example .env
# Fill in your Firebase and Cloudinary credentials

npm install
npm run dev
```

### 4. Mobile
```bash
cd apps/mobile
cp .env.example .env
# Fill in your Firebase web config and backend URL

npm install
npx expo start
```

### 5. First Admin User
Since there's no public registration, create the first admin directly in Firebase Console:
1. Go to Firebase Console → Authentication → Add User (email + password)
2. Go to Firestore → Create document in `users` collection with the user's UID as the doc ID:
   ```json
   {
     "uid": "<firebase-auth-uid>",
     "email": "admin@school.com",
     "name": "Principal Name",
     "role": "admin",
     "streak": 0,
     "totalCheckIns": 0,
     "isActive": true,
     "fcmToken": null,
     "createdAt": "2026-06-17T00:00:00.000Z"
   }
   ```
3. Log in on the mobile app → you'll land on the Admin Dashboard

### Firestore Security Rules (Recommended)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
> Tighten these rules for production based on roles.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo (SDK 56), Expo Router v4 |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Image Upload | Cloudinary (free tier) |
| Push Notifications | Expo Push Notifications + Firebase Cloud Messaging |
| Scheduling | node-cron |

## Roles

| Role | Access |
|------|--------|
| **Student** | Check-in, daily summary, view schedule, view own history |
| **Teacher** | Review check-ins/summaries, manage their students, create schedules, view analytics |
| **Admin** | Full access — all users, global analytics, reports |
