# Salesforce Validation Rule Manager

A full-stack web application built to remotely manage Salesforce Account Validation Rules. The application securely authenticates with Salesforce using OAuth 2.0, fetches validation rules via the Tooling API, and allows users to toggle the active state of rules and deploy those changes back to Salesforce.

## Project Structure

This project consists of two parts:
- **`frontend/`**: React application (built with Vite) that provides a dynamic, premium user interface.
- **`backend/`**: Express.js server that handles the OAuth 2.0 bridge and communicates with the Salesforce Tooling API.

## Prerequisites

Before running the application, you must create a Connected App in your Salesforce Developer Org to act as the OAuth bridge.

### 1. Create a Salesforce Connected App
1. Log into your Salesforce Developer Edition Org.
2. Go to **Setup** (gear icon) -> **App Manager**.
3. Click **New Connected App** in the top right.
4. Fill in the required basic information (Name, Email).
5. Under **API (Enable OAuth Settings)**:
   - Check **Enable OAuth Settings**.
   - Set the **Callback URL** to: `http://localhost:5000/api/auth/callback` (or your deployed backend URL).
   - Add the following **Selected OAuth Scopes**:
     - `Manage user data via APIs (api)`
     - `Perform requests at any time (refresh_token, offline_access)`
     - `Manage user data via Web browsers (web)`
     - `Access unique user identifiers (id)`
6. Save the Connected App (it may take up to 10 minutes for changes to propagate).
7. Once saved, click **Manage Consumer Details** to view and copy your **Consumer Key** (Client ID) and **Consumer Secret** (Client Secret).

### 2. Create Validation Rules
Ensure you have created 4-5 simple Validation Rules on the **Account** object in your Salesforce Org to test the application.

## Local Setup & Installation

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file by copying the example:
   ```bash
   cp .env.example .env
   ```
4. Open the `.env` file and replace the placeholders with your Salesforce Connected App credentials:
   ```env
   SALESFORCE_CLIENT_ID=your_consumer_key_here
   SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
   SALESFORCE_CALLBACK_URL=http://localhost:5000/api/auth/callback
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```
5. Start the backend server:
   ```bash
   npm start
   # or node server.js
   ```

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (optional if running locally on default ports):
   ```bash
   cp .env.example .env
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:5173`.
2. Click **Login with Salesforce**. You will be redirected to the secure Salesforce login page.
3. Log in with your Salesforce Developer credentials and click **Allow** to grant access to the Connected App.
4. Once redirected back, click **Get Validation Rules** to fetch the rules from your org.
5. Use the toggle switches or the "Enable All / Disable All" buttons to modify the rule states locally.
6. Click **Deploy Changes** to push the modifications back to Salesforce via the Tooling API.
7. Verify the changes directly in your Salesforce Org.

## Local Setup & Installation

You can run both the frontend and backend simultaneously from the root directory:

1. **Install all dependencies**:
   ```bash
   npm run build
   ```
2. **Setup Environment Variables**:
   Create a `.env` file in the root directory (use `.env.example` as a template).
3. **Run in Development Mode**:
   ```bash
   npm run dev
   ```

Alternatively, you can navigate into `frontend/` and `backend/` directories to run them individually as described in their respective folders.

## Vercel Deployment

This project is optimized for deployment on **Vercel** as a monorepo.

### 1. Configure Salesforce
Update your **Connected App**'s Callback URL in Salesforce to:
`https://your-app-name.vercel.app/api/auth/callback`

### 2. Deploy to Vercel
1. Push your code to a GitHub repository.
2. Import the project into Vercel.
3. Add the following **Environment Variables** in the Vercel dashboard:
   - `SALESFORCE_CLIENT_ID`: Your Consumer Key.
   - `SALESFORCE_CLIENT_SECRET`: Your Consumer Secret.
   - `SALESFORCE_CALLBACK_URL`: `https://your-app-name.vercel.app/api/auth/callback`
   - `FRONTEND_URL`: `https://your-app-name.vercel.app`
4. Vercel will automatically use the `vercel.json` and the root `package.json` to build and serve your application.

## Tech Stack
- **Frontend**: React.js, Vite, Axios, Lucide React, Vanilla CSS
- **Backend**: Node.js, Express.js (deployed as Vercel Serverless Functions), JSforce, dotenv
