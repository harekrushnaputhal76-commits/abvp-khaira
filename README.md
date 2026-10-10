# ABVP Khaira College Unit Web Application

> **IMPORTANT RUN INSTRUCTIONS:**
> Run with VS Code Live Server or `npx serve .` and open http://localhost:3000. Do not double-click index.html.
> (ES modules and Firebase Auth popups require an HTTP/HTTPS origin and cannot run over the `file://` protocol.)

---

## Overview
Official web platform for **Akhil Bharatiya Vidyarthi Parishad (ABVP) - Khaira College Unit**.
- **Motto:** *Students' Power, Nation's Power* | *Gyan, Sheel, Ekta*
- **Architecture:** Pure HTML5, CSS3, ES Module JavaScript (no build tools, frameworks, or bundlers).
- **Backend:** Google Firebase (Authentication & Cloud Firestore v10.12.2).

---

## Local Setup & Development

1. Open this project directory in your terminal or VS Code:
   ```bash
   cd c:\Users\GUDU\OneDrive\Desktop\avpb
   ```

2. Start a local HTTP server:
   - **Using npx serve:**
     ```bash
     npx serve . -l 3000
     ```
   - **Or using VS Code Live Server extension:** Right-click `index.html` and click **"Open with Live Server"**.

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Firebase Configuration & Services
- **Project ID:** `avbp-9ab57`
- **Auth Domain:** `avbp-9ab57.firebaseapp.com`
- **Firestore Collections:**
  - `notices`: Real-time announcements and official circulars
  - `events`: Real-time upcoming campus events sorted by date
  - `members`: Direct student membership records (`members/{uid}`)
  - `volunteers`: Volunteer karyakarta applications (`volunteers/{uid}`)
  - `leaders`: Leadership applications
  - `chat`: Volunteer live discussion messages (restricted to approved volunteers)

---

## Admin Portal
- Accessible at `http://localhost:3000/admin.html`.
- Allows authorized karyakartas to:
  - Post and delete notices
  - Schedule and delete events
  - Review, approve, and reject volunteer applications
  - Manage student member access
  - Review leader applications
  - Moderate live volunteer chat messages

