const express = require('express');
const cors = require('cors');
const jsforce = require('jsforce');
require('dotenv').config();

const app = express();

// Use FRONTEND_URL from env or default to Vite's default dev port
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://salesforce-rule-manager.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Helper to create OAuth2 object
const getOAuth2 = (env = 'Production') => {
  const loginUrl = env === 'Sandbox' ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
  return new jsforce.OAuth2({
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: process.env.SALESFORCE_CALLBACK_URL || 'http://localhost:5000/api/auth/callback',
    loginUrl: loginUrl
  });
};

app.get('/api/auth/login', (req, res) => {
  const env = req.query.env || 'Production';
  const oauth2 = getOAuth2(env);
  
  res.redirect(oauth2.getAuthorizationUrl({
    prompt: 'login',
    state: env
  }));
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, state: env } = req.query;
  const oauth2 = getOAuth2(env || 'Production');
  const conn = new jsforce.Connection({ oauth2: oauth2 });

  try {
    await conn.authorize(code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?accessToken=${conn.accessToken}&instanceUrl=${encodeURIComponent(conn.instanceUrl)}`);
  } catch (err) {
    console.error("OAuth Error:", err.message);
    res.status(500).send(`Authentication failed! (Error: ${err.message})`);
  }
});

const jsforceAuth = (req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  const instanceUrl = req.headers['x-instance-url'];

  if (!accessToken || !instanceUrl) {
    return res.status(401).json({ error: 'Unauthorized: Missing Salesforce credentials' });
  }

  req.conn = new jsforce.Connection({ instanceUrl, accessToken });
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
    const result = await req.conn.tooling.query("SELECT Id, ValidationName, Active, Description, ErrorMessage FROM ValidationRule WHERE EntityDefinition.DeveloperName = 'Account'");
    res.json(result.records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rules/deploy', jsforceAuth, async (req, res) => {
  const { rules } = req.body;
  if (!rules || !Array.isArray(rules)) {
    return res.status(400).json({ error: 'Invalid rules payload' });
  }

  try {
    const promises = rules.map(async (rule) => {
      const fullRule = await req.conn.tooling.sobject('ValidationRule').retrieve(rule.Id);
      fullRule.Metadata.active = rule.Active;
      return req.conn.tooling.sobject('ValidationRule').update({
        Id: fullRule.Id,
        Metadata: fullRule.Metadata
      });
    });

    const results = await Promise.all(promises);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
