import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Shield, RefreshCw, LogOut, AlertCircle, Info, X, CheckCircle2 } from 'lucide-react';
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

  const fetchUserInfo = useCallback(async (token, url) => {
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
      
      // Automatically fetch rules after user info is fetched
      await fetchRules({ accessToken: token, instanceUrl: url });
    } catch (err) {
      console.error('Failed to fetch user info', err);
      if (err.response?.status === 401) handleLogout();
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  const fetchRules = async (explicitCreds = null) => {
    setFetching(true);
    setError('');
    
    const activeCreds = explicitCreds || credentials;
    if (!activeCreds) {
      setFetching(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/rules`, { 
        headers: {
          'Authorization': `Bearer ${activeCreds.accessToken}`,
          'x-instance-url': activeCreds.instanceUrl
        } 
      });
      setRules(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch rules');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const instanceUrl = params.get('instanceUrl');

    if (accessToken && instanceUrl) {
      const creds = { accessToken, instanceUrl };
      setCredentials(creds);
      window.history.replaceState({}, document.title, '/');
      fetchUserInfo(creds.accessToken, creds.instanceUrl);
    } else {
      const savedCreds = localStorage.getItem('sf_creds');
      if (savedCreds) {
        const creds = JSON.parse(savedCreds);
        setCredentials(creds);
        fetchUserInfo(creds.accessToken, creds.instanceUrl);
      }
    }
  }, [fetchUserInfo]);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      window.location.href = `${API_BASE}/auth/login?env=${environment}`;
    }, 1000);
  };

  const handleLogout = () => {
    setCredentials(null);
    setUserInfo(null);
    setRules([]);
    setSuccess('');
    setError('');
    localStorage.removeItem('sf_creds');
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
      const response = await axios.post(`${API_BASE}/rules/deploy`, 
        { rules }, 
        { 
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'x-instance-url': credentials.instanceUrl
          } 
        }
      );
      if (response.data.success) {
        setSuccess('Changes deployed successfully to your Salesforce Org.');
        await fetchRules();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to deploy changes');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="app-container">
      {/* Auth Screen */}
      {!credentials && !loading ? (
        <div className="app-layout">
          <div className="content-container animate-fade-in">
            <h1 className="main-title">Salesforce Rule Manager</h1>
            <p className="description">
              Securely manage your Salesforce Validation Rules. Log in with any Developer, Sandbox, or Production account to view and toggle rules on the fly.
            </p>
            
            <div className="login-card">
              <div className="login-row">
                <div className="input-group">
                  <label className="label">Environment</label>
                  <select 
                    className="select-box" 
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                  >
                    <option value="Production">Production / Developer Org</option>
                    <option value="Sandbox">Sandbox</option>
                  </select>
                </div>
                
                <button className="btn-login" onClick={handleLogin}>
                  <Shield size={18} style={{ marginRight: '8px' }} />
                  LOGIN WITH SALESFORCE
                </button>
              </div>
              <p className="hint-text">You will be redirected to Salesforce secure login page.</p>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="app-layout">
          <div className="loading-state animate-pulse">
            <div className="spinner-gradient"></div>
            <div className="loading-text">
              <h2>Connecting to Salesforce...</h2>
              <p>Authenticating your session</p>
            </div>
          </div>
        </div>
      ) : (
        /* Dashboard Screen */
        <div className="dashboard-layout animate-fade-in">
          <div className="dashboard-content">
            <header className="dashboard-header">
              <h1 className="main-title-small">Salesforce Switch</h1>
              <div className="user-profile">
                <div className="user-info-text">
                  <span className="user-name">{userInfo?.name || 'User'}</span>
                  <span className="user-org">{userInfo?.username}</span>
                </div>
                <button className="btn-icon-logout" title="Logout" onClick={handleLogout}>
                  <LogOut size={20} />
                </button>
              </div>
            </header>
            
            {showInfo && (
              <div className="info-alert gradient-border">
                <div className="info-content">
                  <Info size={20} className="info-icon" />
                  <p>Toggle the switches below and click <strong>Deploy Changes</strong> to update your Salesforce Org. All changes are immediate.</p>
                </div>
                <X className="close-info" size={20} onClick={() => setShowInfo(false)} />
              </div>
            )}

            <div className="tabs-container">
              <div className="tabs-header">
                {tabs.map(tab => (
                  <div 
                    key={tab} 
                    className={`tab-item ${activeTab === tab ? 'active' : ''} ${tab !== 'Validation Rules' ? 'disabled' : ''}`}
                    onClick={() => tab === 'Validation Rules' && setActiveTab(tab)}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              <div className="tab-actions-row">
                <div className="object-info">
                  <span className="object-badge">Account Object</span>
                  <span className="rules-count">{rules.length} Rules Found</span>
                </div>
                <div className="action-buttons">
                  <button className="btn-refresh" onClick={() => fetchRules()} disabled={fetching}>
                    <RefreshCw size={16} className={fetching ? 'spin' : ''} />
                    REFRESH
                  </button>
                  <button className="btn-deploy-main" onClick={deployChanges} disabled={deploying || rules.length === 0}>
                    {deploying ? 'DEPLOYING...' : 'DEPLOY CHANGES'}
                  </button>
                </div>
              </div>

              <div className="batch-controls">
                <button onClick={() => setAllRules(true)}>ENABLE ALL</button>
                <button onClick={() => setAllRules(false)}>DISABLE ALL</button>
              </div>

              <div className="rules-scroll-area">
                {fetching ? (
                  <div className="fetching-loader">
                    <div className="spinner-small"></div>
                    <p>Loading rules from Salesforce...</p>
                  </div>
                ) : rules.length > 0 ? (
                  <div className="rules-grid">
                    {rules.map(rule => (
                      <div className={`rule-card ${rule.Active ? 'is-active' : 'is-inactive'}`} key={rule.Id}>
                        <div className="rule-card-header">
                          <span className="rule-title">{rule.ValidationName}</span>
                          <div 
                            className={`modern-toggle ${rule.Active ? 'active' : ''}`}
                            onClick={() => !deploying && toggleRule(rule.Id)}
                          >
                            <div className="toggle-thumb"></div>
                          </div>
                        </div>
                        <p className="rule-desc">{rule.Description || 'No description provided.'}</p>
                        <div className="rule-footer">
                          <span className="status-label">{rule.Active ? 'ACTIVE' : 'INACTIVE'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <AlertCircle size={48} />
                    <h3>No Rules Found</h3>
                    <p>We couldn't find any validation rules for the Account object in this Org.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Modal */}
      {deploying && (
        <div className="modal-overlay">
          <div className="modal-box glassmorphism">
            <div className="loader-container">
              <div className="spinner-gradient-large"></div>
            </div>
            <h2>Deploying to Salesforce</h2>
            <p>Please wait while we update your validation rules. This may take a moment...</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {success && (
        <div className="modal-overlay" onClick={() => setSuccess('')}>
          <div className="modal-box success animate-bounce-in" onClick={e => e.stopPropagation()}>
            <CheckCircle2 size={64} className="success-icon" />
            <h2>Deployment Complete</h2>
            <p>{success}</p>
            <button className="btn-modal-close" onClick={() => setSuccess('')}>CONTINUE</button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="modal-overlay" onClick={() => setError('')}>
          <div className="modal-box error animate-shake" onClick={e => e.stopPropagation()}>
            <AlertCircle size={64} className="error-icon" />
            <h2>Error Occurred</h2>
            <p>{error}</p>
            <button className="btn-modal-close" onClick={() => setError('')}>TRY AGAIN</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

