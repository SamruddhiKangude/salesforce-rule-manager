const express = require('express');
const cors = require('cors');
const jsforce = require('jsforce');
require('dotenv').config();

const app = express();

// Enhanced CORS to support Vercel and Local
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://salesforce-rule-manager.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Dynamic OAuth2 Factory
const getOAuth2 = (env = 'Production') => {
  const loginUrl = env === 'Sandbox' ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
  
  // Important: Use the same Callback URL as configured in Salesforce Connected App
  const redirectUri = process.env.SALESFORCE_CALLBACK_URL || 'http://localhost:5000/api/auth/callback';

  return new jsforce.OAuth2({
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: redirectUri,
    loginUrl: loginUrl
  });
};

app.get('/api/auth/login', (req, res) => {
  const env = req.query.env || 'Production';
  const oauth2 = getOAuth2(env);
  
  const authUrl = oauth2.getAuthorizationUrl({
    prompt: 'login',
    state: env
  });
  res.redirect(authUrl);
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, state: env } = req.query;
  if (!code) return res.status(400).send('No code provided');

  const oauth2 = getOAuth2(env || 'Production');
  const conn = new jsforce.Connection({ oauth2: oauth2 });

  try {
    // Authorize and get token
    await conn.authorize(code);
    
    // Redirect back to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = new URL(frontendUrl);
    redirectUrl.searchParams.set('accessToken', conn.accessToken);
    redirectUrl.searchParams.set('instanceUrl', conn.instanceUrl);
    
    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("OAuth Error:", err.message);
    res.status(500).send(`Authentication failed! (Error: ${err.message}). Check if your Connected App supports "Authorization Code" grant type.`);
  }
});

// Middleware for JSForce Connection
const jsforceAuth = (req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  const instanceUrl = req.headers['x-instance-url'];

  if (!accessToken || !instanceUrl) {
    return res.status(401).json({ error: 'Unauthorized: Missing Salesforce credentials' });
  }

  req.conn = new jsforce.Connection({ 
    instanceUrl, 
    accessToken,
    version: '58.0' // Explicit Tooling API version
  });
  next();
};

app.get('/api/user', jsforceAuth, async (req, res) => {
  try {
    const identity = await req.conn.identity();
    res.json({
      name: identity.display_name,
      username: identity.username,
      orgId: identity.organization_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rules', jsforceAuth, async (req, res) => {
  try {
    // Fetch Account Validation Rules using Tooling API
    const result = await req.conn.tooling.query(
      "SELECT Id, ValidationName, Active, Description, ErrorMessage FROM ValidationRule WHERE EntityDefinition.DeveloperName = 'Account' ORDER BY ValidationName"
    );
    res.json(result.records);
  } catch (err) {
    console.error("Fetch Rules Error:", err.message);
    res.status(500).json({ error: `Tooling API Error: ${err.message}` });
  }
});

app.post('/api/rules/deploy', jsforceAuth, async (req, res) => {
  const { rules } = req.body;
  if (!rules || !Array.isArray(rules)) {
    return res.status(400).json({ error: 'Invalid rules payload' });
  }

  try {
    // Batch update rules
    const results = [];
    for (const rule of rules) {
      // We must fetch full metadata before updating 'active' status
      const fullRule = await req.conn.tooling.sobject('ValidationRule').retrieve(rule.Id);
      
      const updateResult = await req.conn.tooling.sobject('ValidationRule').update({
        Id: rule.Id,
        Metadata: {
          ...fullRule.Metadata,
          active: rule.Active
        }
      });
      results.push(updateResult);
    }
    
    res.json({ success: true, results });
  } catch (err) {
    console.error("Deploy Error:", err.message);
    res.status(500).json({ error: `Deployment failed: ${err.message}` });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

