# Salesforce Validation Rule Manager

> [!IMPORTANT]
> **Instruction for User:**
> To test this project, please ensure you have at least 1-2 **Validation Rules** created on the **Account** object in your **Salesforce Developer Org**. When you click "LOGIN TO SALESFORCE" and use your own credentials, this app will automatically fetch and display those rules from your org.

A full-stack web application built to remotely manage Salesforce Account Validation Rules. The application securely authenticates with Salesforce using OAuth 2.0, fetches validation rules via the Tooling API, and allows users to toggle the active state of rules and deploy those changes back to Salesforce.

## Project Structure

- **`frontend/`**: React application (built with Vite).
- **`api/`**: Express.js backend (OAuth bridge & Salesforce API).

## Quick Start (Local Setup)

Follow these simple steps to run the project locally:

### 1. Environment Configuration
Create a `.env` file in the **root directory** and add your Salesforce Connected App credentials:

```env
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_CALLBACK_URL=http://localhost:5000/api/auth/callback
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 2. Installation
Install all necessary dependencies for both the frontend and backend with a single command:
```bash
npm run build
```

### 3. Run the Application
Start both the frontend and backend servers simultaneously:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to use the app.

## Vercel Deployment

This project is optimized for deployment on **Vercel**.

1. Create a **Connected App** in Salesforce with the Callback URL set to your Vercel production URL.
2. Push the code to GitHub and import to Vercel.
3. Add the `.env` variables in the Vercel dashboard.
4. Vercel will automatically build and deploy the app.

## Tech Stack
- **Frontend**: React.js, Vite, Axios, Lucide React, Vanilla CSS
- **Backend**: Node.js, Express.js, JSforce, dotenv

## Features

- Salesforce OAuth 2.0 Login
- Fetch Account Validation Rules using Tooling API
- Enable/Disable Validation Rules
- Deploy updated metadata back to Salesforce
- Responsive UI
- Secure backend API handling

---------------------------------------------------------------- -
