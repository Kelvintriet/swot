# Book Learning (Solid + Vite + Appwrite)

Personal book-learning tracker: library + login + basic “add book” flow.

## Setup

### 1) Install

```bash
npm install
```

### 2) Appwrite config

Copy env template:

```bash
cp .env.example .env.local
```

Fill in:

- `VITE_APPWRITE_ENDPOINT` (e.g. `https://cloud.appwrite.io/v1`)
- `VITE_APPWRITE_PROJECT_ID`
- `VITE_APPWRITE_DATABASE_ID`
- `VITE_APPWRITE_COLLECTION_BOOKS_ID`
- `VITE_APPWRITE_COLLECTION_LOGS_ID`
- `VITE_APPWRITE_COLLECTION_WORDS_ID`
- `VITE_APPWRITE_STORAGE_BUCKET_ID` (optional, for book cover uploads)

In the Appwrite Console:

1. Create a **Project**
2. Enable **Auth → Email/Password**
3. Create a **Database**
4. Create a **Collection** for books with these attributes:
	- `title` (string, required)
	- `author` (string, optional)
	- `status` (string, optional) e.g. `to-read|reading|done`
	- `totalPages` (integer, optional)
	- `startPage` (integer, optional)
	- `publishedDate` (datetime, optional)
	- `isbn` (string, optional)
	- `boughtDate` (datetime, optional)
	- `language` (string, optional)
	- `coverFileId` (string, optional)
	- `userId` (string, required)

If you want cover uploads, create a **Storage bucket** and set `VITE_APPWRITE_STORAGE_BUCKET_ID`.

5. Create a **Collection** for reading logs with these attributes:
	- `userId` (string, required)
	- `bookId` (string, required)
	- `date` (datetime, required)
	- `minutes` (integer, optional)
	- `pagesStart` (integer, optional)
	- `pagesEnd` (integer, optional)
	- `note` (string, optional)

6. Create a **Collection** for hard words with these attributes:
	- `userId` (string, required)
	- `bookId` (string, required)
	- `word` (string, required)
	- `meaning` (string, optional)
	- `context` (string, optional)
	- `srsDueAt` (datetime, required)
	- `srsIntervalDays` (integer, required)
	- `srsEase` (float, required)
	- `srsReps` (integer, required)
	- `lastReviewedAt` (datetime, optional)

Permissions suggestion (personal app): set the collection to allow authenticated users to read/write.

This app also sets per-document permissions (read/write) to the current user on create.

## Run

```bash
npm run dev
```

Open `http://localhost:5173/`.

## Email verification

This app now requires users to verify their email before accessing protected pages.

- Verification callback route: `/verify-email` (Appwrite sends `userId` + `secret`)
- Block screen for unverified users: `/verify-required` (includes “resend verification email”)

### Appwrite email template

You can paste a clean HTML template into the Appwrite Console for the verification email:

- [appwrite-templates/auth-email-verification.html](appwrite-templates/auth-email-verification.html)

## Build

```bash
npm run build
npm run preview
```
