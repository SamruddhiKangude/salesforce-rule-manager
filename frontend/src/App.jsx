import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cloud, Shield, Settings, Server, UploadCloud, RefreshCw, LogOut, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

function App() {
  const [credentials, setCredentials] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check URL for tokens
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const instanceUrl = params.get('instanceUrl');

    if (accessToken && instanceUrl) {
      setCredentials({ accessToken, instanceUrl });
      // Remove tokens from URL for security and clean UI
      window.history.replaceState({}, document.title, '/');
      fetchUserInfo(accessToken, instanceUrl);
    }
  }, []);

  const fetchUserInfo = async (token, url) => {
    try {
      const response = await axios.get(`${API_BASE}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-instance-url': url
        }
      });
      setUserInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch user info', err);
    }
  };

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/login`;
  };

  const handleLogout = () => {
    setCredentials(null);
    setUserInfo(null);
    setRules([]);
    setSuccess('');
    setError('');
  };

  const getHeaders = () => ({
    'Authorization': `Bearer ${credentials.accessToken}`,
    'x-instance-url': credentials.instanceUrl
  });

  const fetchRules = async (preserveSuccess = false) => {
    setFetching(true);
    setError('');
    if (!preserveSuccess) setSuccess('');
    try {
      const response = await axios.get(`${API_BASE}/rules`, { headers: getHeaders() });
      setRules(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch rules');
    } finally {
      setFetching(false);
    }
  };

  const toggleRule = (ruleId) => {
    setRules(rules.map(rule =>
      rule.Id === ruleId ? { ...rule, Active: !rule.Active } : rule
    ));
  };

  const setAllRules = (state) => {
    setRules(rules.map(rule => ({ ...rule, Active: state })));
  };

  const deployChanges = async () => {
    setDeploying(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.post(`${API_BASE}/rules/deploy`, { rules }, { headers: getHeaders() });
      if (response.data.success) {
        setSuccess('All changes have been successfully deployed.');
        // Refresh rules to ensure sync, but preserve the success message
        await fetchRules(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to deploy changes');
    } finally {
      setDeploying(false);
    }
  };

  if (!credentials) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <Cloud size={64} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
          <h2>Salesforce Rule Manager</h2>
          <p>Securely connect to your Salesforce instance to manage your Account validation rules remotely.</p>
          <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
            <Server size={20} /> Login with Salesforce
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1><Shield color="var(--primary-color)" /> Salesforce Rule Manager</h1>
          <p>Connected to: {credentials.instanceUrl.replace('https://', '').split('.')[0]}</p>
          {userInfo && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              User: {userInfo.name} ({userInfo.username}) | Org: {userInfo.orgId}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      {error && !deploying && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="dashboard-controls">
        <button className="btn btn-primary" onClick={fetchRules} disabled={fetching || deploying}>
          <RefreshCw size={18} className={fetching ? 'spinner' : ''} />
          {fetching ? 'Fetching...' : 'Get Validation Rules'}
        </button>

        {rules.length > 0 && (
          <div className="control-group">
            <button className="btn btn-secondary" onClick={() => setAllRules(true)} disabled={deploying}>
              Enable All
            </button>
            <button className="btn btn-danger" onClick={() => setAllRules(false)} disabled={deploying}>
              Disable All
            </button>
            <button className="btn btn-success" onClick={deployChanges} disabled={deploying}>
              <UploadCloud size={18} /> {deploying ? 'Deploying...' : 'Deploy Changes'}
            </button>
          </div>
        )}
      </div>

      <main>
        {rules.length === 0 ? (
          <div className="empty-state">
            <Settings size={48} />
            <h3>No rules loaded</h3>
            <p>Click "Get Validation Rules" to fetch Account validation rules from Salesforce.</p>
          </div>
        ) : (
          <div className="rule-list">
            {rules.map((rule) => (
              <div className="rule-card" key={rule.Id}>
                <div className="rule-info">
                  <div className="rule-name">
                    {rule.ValidationName}
                    <span className={`rule-status ${rule.Active ? 'status-active' : 'status-inactive'}`}>
                      {rule.Active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {rule.Active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="rule-desc">{rule.Description || 'No description provided.'}</div>
                </div>
                <div className="rule-actions">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rule.Active}
                      onChange={() => toggleRule(rule.Id)}
                      disabled={deploying}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {deploying && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Processing</h2>
            </div>
            <div className="modal-body">
              <div className="progress-text">Deploying changes. Time will vary depending on number and type of components.</div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && !deploying && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Complete</h2>
              <span className="modal-close-icon" onClick={() => setSuccess('')}>&times;</span>
            </div>
            <div className="modal-body">
              <div className="success-box">
                {success}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-close" onClick={() => setSuccess('')}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
