const express = require('express');
const cors = require('cors');
const jsforce = require('jsforce');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

const oauth2 = new jsforce.OAuth2({
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  redirectUri: process.env.SALESFORCE_CALLBACK_URL || 'http://localhost:5000/api/auth/callback'
});

app.get('/api/auth/login', (req, res) => {
  res.redirect(oauth2.getAuthorizationUrl({}));
});

app.get('/api/auth/callback', async (req, res) => {
  const conn = new jsforce.Connection({ oauth2: oauth2 });
  const code = req.query.code;
  try {
    await conn.authorize(code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?accessToken=${conn.accessToken}&instanceUrl=${encodeURIComponent(conn.instanceUrl)}`);
  } catch (err) {
    console.error("OAuth Error:", err.message);
    res.status(500).send(`Authentication failed! Please go back to http://localhost:5173 and try logging in again. (Error: ${err.message})`);
  }
});

// Middleware to initialize connection using the token passed from frontend
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
      // Tooling API requires the full Metadata object to update a rule
      const fullRule = await req.conn.tooling.sobject('ValidationRule').retrieve(rule.Id);
      
      // Update the active status inside the Metadata object
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

const path = require('path');

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
