# TruthLens Website

A multi-page hackathon-ready frontend for TruthLens.

## Run with the existing Node server

Copy the files inside this folder into your existing project's `public/` directory if your Express app serves `public/`.

If your existing app serves another static directory, use that directory instead.

The frontend expects the verification API at:

POST /api/verify

Request:
{"claim":"..."}

The UI has a demo mode that works without the live API.

## Pages

Home, Verify, Features, How It Works, Demo, Dashboard, History, Reports, Claim Detail, About, Contact, Login, Register, Forgot Password, Profile, Privacy, Terms, 404.

## Important

Authentication forms and contact form are UI-ready but require connection to your actual backend/auth/email services before production use.
