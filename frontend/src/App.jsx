import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, RefreshCw, LogOut, AlertCircle, Info, X } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('Validation Rules');
  const [environment, setEnvironment] = useState('Production');
  const [showInfo, setShowInfo] = useState(true);

  const tabs = ['Validation Rules', 'Workflows', 'Process Flows', 'Triggers'];

  useEffect(() => {
    // Check URL for tokens (OAuth flow)
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const instanceUrl = params.get('instanceUrl');

    if (accessToken && instanceUrl) {
      const creds = { accessToken, instanceUrl };
      setCredentials(creds);
      window.history.replaceState({}, document.title, '/');
      fetchUserInfo(creds.accessToken, creds.instanceUrl);
    }

    // Check localStorage for saved session
    const savedCreds = localStorage.getItem('sf_creds');
    if (savedCreds) {
      const creds = JSON.parse(savedCreds);
      setCredentials(creds);
      fetchUserInfo(creds.accessToken, creds.instanceUrl);
    }
  }, []);

  const fetchUserInfo = async (token, url) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-instance-url': url
        }
      });
      setUserInfo(response.data);
      localStorage.setItem('sf_creds', JSON.stringify({ accessToken: token, instanceUrl: url }));
      // Automatically fetch rules after login success
      fetchRules({ accessToken: token, instanceUrl: url });
    } catch (err) {
      console.error('Failed to fetch user info', err);
      if (err.response?.status === 401) handleLogout();
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleLogin = () => {
    setLoading(true);
    // Give time to see the "Accessing Salesforce" screen before redirecting
    setTimeout(() => {
      window.location.href = `${API_BASE}/auth/login?env=${environment}`;
    }, 1500);
  };

  const handleLogout = () => {
    setCredentials(null);
    setUserInfo(null);
    setRules([]);
    setSuccess('');
    setError('');
    localStorage.removeItem('sf_creds');
  };

  const getHeaders = (creds = credentials) => ({
    'Authorization': `Bearer ${creds.accessToken}`,
    'x-instance-url': creds.instanceUrl
  });

  const fetchRules = async (explicitCreds = null) => {
    setFetching(true);
    
    const activeCreds = explicitCreds || credentials;
    if (!activeCreds) {
      console.error('No credentials available to fetch rules');
      setFetching(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/rules`, { headers: getHeaders(activeCreds) });
      setTimeout(() => {
        setRules(response.data);
        setFetching(false);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch rules');
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
        fetchRules();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to deploy changes');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="app-container">
      {/* Auth Logic Branches */}
      {!credentials && !loading ? (
        <div className="app-layout">
          <div className="content-container">
            <h1 className="main-title">Salesforce Switch</h1>
            <p className="description">
              This tool provides an interface to easily enable and disable components in your Salesforce Org - Workflows, Triggers and Validation Rules. Very useful when doing data migrations and needing to disable certain automation.
            </p>
            <p className="description">
              None of your organisation information or data is captured or kept from running this tool.
            </p>
            
            <div className="login-row">
              <span className="label">Environment</span>
              <select 
                className="select-box" 
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="Production">Production</option>
                <option value="Sandbox">Sandbox</option>
              </select>
              <button className="btn-login" onClick={handleLogin}>LOGIN</button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="app-layout">
          <div className="content-container">
            <h1 className="main-title">Salesforce Switch</h1>
            <p className="description">
              This tool provides an interface to easily enable and disable components in your Salesforce Org - Workflows, Triggers and Validation Rules. Very useful when doing data migrations and needing to disable certain automation.
            </p>
            <p className="description">
              None of your organisation information or data is captured or kept from running this tool.
            </p>

            <div className="loading-state">
              <div className="spinner-gradient"></div>
              <div className="loading-text">
                <h2>Accessing Salesforce...</h2>
                <p>Logging in with OAuth 2.0</p>
              </div>
            </div>
          </div>
        </div>
      ) : credentials && rules.length === 0 && !fetching ? (
        <div className="app-layout">
          <div className="content-container">
            <h1 className="main-title">Salesforce Switch</h1>
            <p className="description">
              This tool provides an interface to easily enable and disable components in your Salesforce Org - Workflows, Triggers and Validation Rules. Very useful when doing data migrations and needing to disable certain automation.
            </p>
            <p className="description">
              None of your organisation information or data is captured or kept from running this tool.
            </p>

            <div className="logged-in-box">
              <h2 className="section-subtitle">Logged in as:</h2>
              <div className="user-details">
                <div className="detail-item">
                  <span className="detail-label">Username:</span>
                  <span className="detail-value">{userInfo?.username || 'Loading...'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Organisation:</span>
                  <span className="detail-value">{userInfo?.orgId || 'Loading...'}</span>
                </div>
              </div>

              <div className="button-group-row">
                <button className="btn-logout-alt" onClick={handleLogout}>LOGOUT</button>
                <button className="btn-metadata" onClick={fetchRules}>GET METADATA</button>
              </div>
            </div>
          </div>
        </div>
      ) : fetching ? (
        <div className="app-layout">
          <div className="content-container">
            <h1 className="main-title">Salesforce Switch</h1>
            <p className="description">
              This tool provides an interface to easily enable and disable components in your Salesforce Org - Workflows, Triggers and Validation Rules. Very useful when doing data migrations and needing to disable certain automation.
            </p>
            <p className="description">
              None of your organisation information or data is captured or kept from running this tool.
            </p>

            <div className="logged-in-header">
               <h2 className="section-subtitle">Logged in as:</h2>
            </div>

            <div className="loading-state">
              <div className="spinner-gradient"></div>
              <div className="loading-text">
                <h2>Querying metadata</h2>
                <p>Building a list of validation rules, workflows and triggers...</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-layout">
          <div className="dashboard-content">
            <h1 className="main-title">Salesforce Switch</h1>
            
            {showInfo && (
              <div className="info-alert">
                <div className="info-content">
                  <p>Use the Off/On switches and the Enable All/Disable All buttons to specify what you want to activate and deactivate for your Org. Once ready, click Deploy to apply the changes to your Org. Deployment times will vary depending on the number of changes you are making. Triggers tend to take longer than Validation Rules and Workflows (especially for Production Orgs, as all Apex Tests must run on deployment).</p>
                  <p style={{ marginTop: '1rem' }}>You can click on the component names to have a look at what the components are made up of.</p>
                </div>
                <X className="close-info" size={20} onClick={() => setShowInfo(false)} />
              </div>
            )}

            <div className="user-banner">
              {userInfo?.username} ({userInfo?.orgId})
            </div>

            <div className="tabs-container">
              <div className="tabs-header">
                {tabs.map(tab => (
                  <div 
                    key={tab} 
                    className={`tab-item ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              <div className="tab-actions">
                 <button className="btn-rollback" onClick={fetchRules}>ROLLBACK TO ORIGINAL</button>
                 <button className="btn-deploy" onClick={deployChanges} disabled={deploying}>
                   {deploying ? 'DEPLOYING...' : 'DEPLOY CHANGES'}
                 </button>
              </div>

              <div className="object-header">
                <span className="object-name">Account</span>
                <div className="batch-buttons">
                  <button className="btn-enable-all" onClick={() => setAllRules(true)}>ENABLE ALL</button>
                  <button className="btn-disable-all" onClick={() => setAllRules(false)}>DISABLE ALL</button>
                </div>
              </div>

              <div className="rules-list">
                {rules.map(rule => (
                  <div className="rule-row" key={rule.Id}>
                    <span className="rule-name">{rule.ValidationName}</span>
                    <div 
                      className={`toggle-switch ${rule.Active ? 'on' : 'off'}`}
                      onClick={() => !deploying && toggleRule(rule.Id)}
                    >
                      <span className="toggle-label">{rule.Active ? 'ON' : 'OFF'}</span>
                      <div className="toggle-handle"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals & Overlays */}
      {deploying && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">Processing</h2>
            <p className="modal-text">Deploying changes. Time will vary depending on number and type of components.</p>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill"></div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ padding: 0, width: '500px' }}>
            <div className="modal-header-line">
              <h2 className="modal-title" style={{ margin: 0 }}>Complete</h2>
              <X className="modal-close-icon" size={20} onClick={() => setSuccess('')} />
            </div>
            <div className="modal-body-padding">
              <div className="success-message">{success}</div>
            </div>
            <div className="modal-footer-line">
              <button className="btn-close-modal-alt" onClick={() => setSuccess('')}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">Error</h2>
            <X className="modal-close" size={24} onClick={() => setError('')} />
            <div className="success-message" style={{ backgroundColor: '#f2dede', color: '#a94442', borderColor: '#ebccd1' }}>
              {error}
            </div>
            <button className="btn-close-modal" onClick={() => setError('')}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
