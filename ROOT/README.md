# RiaGo – Rianne's Food Corner

RiaGo is a React/Vite point-of-sale interface with a Node.js/Express API and a MySQL database.

## Requirements

- Node.js LTS
- MySQL (for example, through XAMPP)
- An SMTP account if customer email verification is enabled

## Set up the database

1. Start MySQL.
2. In phpMyAdmin, import `database/riago.sql`. This creates the `riago_db` database and its tables.

## Configure and run the backend

1. Create `backend/.env` with the MySQL connection settings, `JWT_SECRET`, admin credentials, and SMTP settings for email OTP.
2. From `backend`, run:

   ```bash
   npm ci
   npm run dev
   ```

The API starts at `http://localhost:3000`. Its database health check is `http://localhost:3000/health`.

## Run the frontend

In a second terminal, from `frontend`, run:

```bash
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). Vite proxies API and image requests to the backend.

## App routes

- `/login` – customer registration, email verification, and login
- `/staff-login` – admin and rider login
- `/cashier` and `/kitchen` – station dashboards
- `/rider` and `/admin` – protected staff dashboards

Cashier and Kitchen stations open automatically unless `REQUIRE_STATION_LOGIN=true` is set in `backend/.env`. Configure unique admin credentials and a private JWT secret; do not commit `.env` or place credentials in frontend code.

Menu photos are stored in `images/menu/`. Copy that folder when moving the project to another machine. The backend serves images from `images/`.

## Project structure

```text
backend/   Express API, routes, controllers, services, and MySQL models
database/  MySQL schema and starter menu
frontend/  React/Vite app, pages, components, and styles
images/    Logo, login artwork, and menu photos
```
