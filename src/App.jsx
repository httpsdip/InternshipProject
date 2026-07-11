import React, { useState, useMemo, useEffect } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Static fallbacks for indices in case backend is loading
const STATIC_INDICES = [
  { name: 'NIFTY BANK', value: '48,125.40', change: '-0.3%', up: false },
  { name: 'GOLD', value: '72,400.00', change: '+2.1%', up: true },
  { name: 'USD/INR', value: '83.45', change: '-0.1%', up: false },
  { name: 'NASDAQ', value: '16,215.10', change: '+1.5%', up: true },
  { name: 'NIFTY 50', value: '22,453.30', change: '+1.2%', up: true },
  { name: 'SENSEX', value: '74,012.15', change: '+0.8%', up: true },
];

function App() {
  // Live Feeds State
  const [tickerData, setTickerData] = useState(STATIC_INDICES);
  const [mutualFunds, setMutualFunds] = useState([]);
  const [newsList, setNewsList] = useState([]);
  
  // Auth States
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Dashboard / Menu Navigation
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'portfolio' | 'news'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Slide-out panel states
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState('calculator'); // 'calculator' | 'compare' | 'riskAnalysis' | 'buy'
  const [selectedFund, setSelectedFund] = useState(null);

  // User Portfolio States
  const [portfolio, setPortfolio] = useState([]);
  const [buyAmount, setBuyAmount] = useState(5000);
  const [isBuying, setIsBuying] = useState(false);

  // AI Analysis specific states
  const [userAge, setUserAge] = useState(30);
  const [investmentHorizon, setInvestmentHorizon] = useState('5+ years');
  const [riskTolerance, setRiskTolerance] = useState('High');
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI News impact states
  const [activeNewsId, setActiveNewsId] = useState(null);
  const [newsAnalysis, setNewsAnalysis] = useState(null);
  const [isNewsAnalyzing, setIsNewsAnalyzing] = useState(false);
  
  // SIP Calculator States
  const [calcType, setCalcType] = useState('SIP'); // 'SIP' or 'Lumpsum'
  const [monthlyInvest, setMonthlyInvest] = useState(10000);
  const [oneTimeInvest, setOneTimeInvest] = useState(100000);
  const [returnRate, setReturnRate] = useState(12);
  const [tenureYears, setTenureYears] = useState(10);
  
  // Comparison States
  const [compareId1, setCompareId1] = useState('');
  const [compareId2, setCompareId2] = useState('');

  // Sync Live data states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  // Double indices for marquee loops
  const tickerItems = useMemo(() => [...tickerData, ...tickerData], [tickerData]);

  // Headers helper for JWT
  const authHeaders = useMemo(() => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, [token]);

  // Logout utility
  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    setPortfolio([]);
  };

  // Fetch indices on load
  useEffect(() => {
    fetch(`${API_BASE_URL}/indices`)
      .then(res => res.json())
      .then(data => setTickerData(data))
      .catch(() => console.log("Using static index feeds."));
  }, []);

  // Fetch mutual funds
  const fetchFunds = async (showSpinner = false) => {
    if (!token) return;
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/funds?category=${activeCategory}&search=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setMutualFunds(data);
        if (data.length > 0) {
          // Initialize compare selection if empty
          if (!compareId1) setCompareId1(data[0].id);
          if (!compareId2) setCompareId2(data[1]?.id || data[0].id);
        }
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Error fetching funds", err);
    } finally {
      if (showSpinner) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Fetch news list
  const fetchNews = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/news`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setNewsList(data);
      }
    } catch (err) {
      console.error("Error fetching news", err);
    }
  };

  // Fetch portfolio list
  const fetchPortfolio = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (err) {
      console.error("Error fetching portfolio", err);
    }
  };

  // Trigger data updates when user login state changes
  useEffect(() => {
    if (token) {
      fetchFunds(false);
      fetchPortfolio();
      fetchNews();
    }
  }, [token, activeCategory, searchQuery]);

  // Auth form submissions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    
    if (!authEmail || !authPassword) {
      setAuthError('Please fill in all details.');
      return;
    }
    if (authMode === 'signup' && !authName) {
      setAuthError('Please enter your full name.');
      return;
    }

    try {
      if (authMode === 'signup') {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
        });
        const data = await res.json();
        if (res.ok) {
          setAuthSuccess(data.message || 'Registration successful! Please login.');
          setAuthMode('login');
          setAuthName('');
          setAuthPassword('');
        } else {
          setAuthError(data.detail || 'Registration failed.');
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          localStorage.setItem('auth_token', data.token);
          setAuthEmail('');
          setAuthPassword('');
          setIsAuthOpen(false);
        } else {
          setAuthError(data.detail || 'Invalid email or password.');
        }
      }
    } catch (err) {
      setAuthError('Could not connect to backend server.');
    }
  };

  // Buy mutual fund transaction
  const handleBuySubmit = async (e) => {
    e.preventDefault();
    if (!selectedFund || buyAmount <= 0) return;
    setIsBuying(true);

    const payload = {
      fund_id: selectedFund.id,
      fund_name: selectedFund.name,
      amount: buyAmount,
      purchase_nav: parseFloat(selectedFund.nav),
      category: selectedFund.category,
      return3Y: selectedFund.return3Y
    };

    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/buy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(`Successfully invested ${formatCurrency(buyAmount)} in ${selectedFund.name}!`);
        setIsPanelOpen(false);
        fetchPortfolio();
      } else {
        const data = await res.json();
        alert(data.detail || "Transaction failed.");
      }
    } catch (err) {
      alert("Error processing investment.");
    } finally {
      setIsBuying(false);
    }
  };

  // Sell mutual fund holding
  const handleSellHolding = async (holdingId) => {
    if (!confirm("Are you sure you want to sell/remove this holding?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/sell/${holdingId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        fetchPortfolio();
      }
    } catch (err) {
      alert("Error deleting holding.");
    }
  };

  // Run Gemini AI Risk check report
  const runAiRiskAnalysis = async () => {
    if (!selectedFund) return;
    setIsAnalyzing(true);
    setAiAnalysisResult(null);

    const payload = {
      fund_data: selectedFund,
      user_profile: {
        age: userAge,
        investment_horizon: investmentHorizon,
        risk_tolerance: riskTolerance
      }
    };

    try {
      const res = await fetch(`${API_BASE_URL}/analyze-risk`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysisResult(data);
      } else {
        throw new Error();
      }
    } catch (err) {
      alert("Session expired or API error. Please verify server connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Gemini AI News Analysis check
  const runNewsAnalysis = async (newsId) => {
    setActiveNewsId(newsId);
    setIsNewsAnalyzing(true);
    setNewsAnalysis(null);
    try {
      const res = await fetch(`${API_BASE_URL}/news/${newsId}/analyze`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        const data = await res.json();
        setNewsAnalysis(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNewsAnalyzing(false);
    }
  };

  // Dynamic portfolio valuations
  const portfolioSummary = useMemo(() => {
    let investedSum = 0;
    let currentSum = 0;
    let categoryAllocation = { Equity: 0, Debt: 0, Hybrid: 0 };

    portfolio.forEach(item => {
      investedSum += item.invested_value;
      currentSum += item.current_value;
      
      const cat = item.category === 'Equity' || item.category === 'Debt' || item.category === 'Hybrid' ? item.category : 'Equity';
      categoryAllocation[cat] += item.current_value;
    });

    const totalPnL = currentSum - investedSum;
    const totalPnLPercent = investedSum > 0 ? (totalPnL / investedSum * 100) : 0;
    const totalCurrent = currentSum || 1; // Avoid divide by zero

    return {
      totalInvested: investedSum,
      totalCurrent: currentSum,
      pnl: totalPnL,
      pnlPercent: totalPnLPercent,
      allocation: {
        Equity: Math.round(categoryAllocation.Equity / totalCurrent * 100),
        Debt: Math.round(categoryAllocation.Debt / totalCurrent * 100),
        Hybrid: Math.round(categoryAllocation.Hybrid / totalCurrent * 100)
      }
    };
  }, [portfolio]);

  // SIP Calculator calculation
  const calculatorResults = useMemo(() => {
    const years = tenureYears;
    const rate = returnRate;
    let totalInvested = 0;
    let futureValue = 0;

    if (calcType === 'SIP') {
      const P = monthlyInvest;
      const monthlyRate = rate / 12 / 100;
      const totalMonths = years * 12;
      totalInvested = P * totalMonths;
      if (monthlyRate > 0) {
        futureValue = P * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
      } else {
        futureValue = totalInvested;
      }
    } else {
      const P = oneTimeInvest;
      totalInvested = P;
      futureValue = P * Math.pow(1 + rate / 100, years);
    }

    const estimatedReturns = Math.max(0, futureValue - totalInvested);
    const returnPercent = futureValue > 0 ? (estimatedReturns / futureValue) * 100 : 0;
    const investPercent = futureValue > 0 ? (totalInvested / futureValue) * 100 : 100;

    return {
      totalInvested: Math.round(totalInvested),
      estimatedReturns: Math.round(estimatedReturns),
      totalValue: Math.round(futureValue),
      returnPercent,
      investPercent
    };
  }, [calcType, monthlyInvest, oneTimeInvest, returnRate, tenureYears]);

  const selectedCompareFund1 = useMemo(() => mutualFunds.find(f => f.id === compareId1), [compareId1, mutualFunds]);
  const selectedCompareFund2 = useMemo(() => mutualFunds.find(f => f.id === compareId2), [compareId2, mutualFunds]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const openPanel = (type, data = null) => {
    setPanelType(type);
    setSelectedFund(data);
    if (type === 'riskAnalysis') setAiAnalysisResult(null);
    setIsPanelOpen(true);
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
          <div className="logo" style={{ fontSize: '1.25rem' }}>
            AI Mutual Fund Analyzer<span>.</span>
          </div>
          <div className="live-badge">
            <span className="live-dot" style={{ backgroundColor: user ? '#22c55e' : '#ef4444' }}></span>
            {user ? 'PORTAL ACTIVE' : 'LOCKED'}
          </div>
        </div>
        
        {user && (
          <ul className="nav-menu">
            <li>
              <button 
                className={`nav-link ${activeTab === 'explore' && (!isPanelOpen || panelType !== 'about') ? 'active' : ''}`}
                onClick={() => { setActiveTab('explore'); setSearchQuery(''); setActiveCategory('All'); setIsPanelOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Home
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activeTab === 'portfolio' ? 'active' : ''}`}
                onClick={() => { setActiveTab('portfolio'); setIsPanelOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                My Portfolio
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${activeTab === 'news' ? 'active' : ''}`}
                onClick={() => { setActiveTab('news'); setIsPanelOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                AI Signals News
              </button>
            </li>
            <li>
              <button 
                className={`nav-link ${isPanelOpen && panelType === 'about' ? 'active' : ''}`}
                onClick={() => openPanel('about')}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                About Platform
              </button>
            </li>
          </ul>
        )}

        <div className="nav-right">
          {user ? (
            <>
              <button className="btn btn-outline-green" onClick={() => openPanel('compare')}>
                Compare Funds
              </button>
              <button className="btn btn-solid-orange" onClick={() => openPanel('calculator')}>
                SIP Calculator
              </button>
              <div className="auth-success-badge">
                <div className="auth-avatar">{user.name[0].toUpperCase()}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{user.name}</span>
                <a href="#logout" className="auth-link" style={{ fontSize: '0.7rem', marginLeft: '0.25rem', fontWeight: 700 }} onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a>
              </div>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Sign in to unlock analyzers</span>
          )}
        </div>
      </nav>

      {/* Stock Ticker */}
      <div className="ticker-container">
        <div className="ticker-track">
          {tickerItems.map((item, idx) => (
            <div className="ticker-item" key={idx}>
              <span className="ticker-name">{item.name}</span>
              <span className="ticker-value">{item.value}</span>
              <span className={`ticker-change ${item.up ? 'up' : 'down'}`}>
                {item.up ? '▲' : '▼'} {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* GATED WELCOME & SIGN IN SECTION */}
      {!user ? (
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '4rem 1rem' }}>
          <div className="auth-header" style={{ marginBottom: '3rem', maxWidth: '650px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', border: '2px solid var(--color-border)', marginBottom: '1.5rem', boxShadow: '0 8px 24px rgba(228, 110, 20, 0.15)' }} />
            <h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              Empower Your Wealth with<br />
              <span>AI Mutual Fund Analyzer</span>
            </h1>
            <p className="auth-subtitle" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
              Dono real-time AMFI mutual fund data aur market news signals check karein. Portfolios ko manage karne aur risk evaluation report simple Hinglish mein pane ke liye login karein.
            </p>
          </div>

          <div className="auth-card" style={{ transform: 'scale(1)', margin: '0 auto' }}>
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
              >
                Register Account
              </button>
            </div>

            {authSuccess && <div style={{ color: 'var(--color-success)', background: 'var(--color-success-bg)', border: '1px solid rgba(34,197,94,0.2)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.75rem', textAlign: 'center', marginBottom: '1rem' }}>{authSuccess}</div>}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <div className="auth-group">
                  <label className="auth-label">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter name" 
                    className="auth-input"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                </div>
              )}

              <div className="auth-group">
                <label className="auth-label">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="auth-input"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div className="auth-group">
                <label className="auth-label">Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="auth-input"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              {authError && <div className="auth-error-msg">{authError}</div>}

              <button type="submit" className="btn btn-solid-orange" style={{ padding: '0.8rem', width: '100%', marginTop: '0.5rem' }}>
                {authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>
          </div>
        </section>
      ) : (
        <>
          {/* TAB 1: MUTUAL FUND EXPLORER */}
          {activeTab === 'explore' && (
            <section className="explorer-section" id="explore">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="section-info">
                  <h2>Interactive Fund Explorer</h2>
                  <p>Invest in Indian Mutual Funds parsed directly from AMFI rates.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                    Source: <strong style={{ color: 'var(--color-accent)' }}>AMFI Live Feed</strong> (Synced: {lastUpdated})
                  </span>
                  <button 
                    className={`btn ${isRefreshing ? 'btn-outline-orange' : 'btn-solid-orange'}`}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
                    onClick={() => fetchFunds(true)}
                    disabled={isRefreshing}
                  >
                    <span>{isRefreshing ? '🔄' : '⚡'}</span>
                    {isRefreshing ? 'Syncing...' : 'Sync Live AMFI'}
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="search-filter-bar">
                <div className="search-input-wrapper">
                  <svg className="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search by title (e.g. Parag Parikh, ABSL)..." 
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-buttons">
                  {['All', 'Equity', 'Debt', 'Hybrid'].map(category => (
                    <button 
                      key={category} 
                      className={`filter-btn ${activeCategory === category ? 'active' : ''}`}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Funds Grid */}
              <div className="funds-grid">
                {mutualFunds.map(fund => (
                  <div className="fund-card" key={fund.id}>
                    <div className="fund-header">
                      <span className="fund-category">{fund.category} • {fund.type}</span>
                      <span className={`fund-risk-badge ${
                        fund.risk === 'Low' ? 'low' : fund.risk === 'High' || fund.risk === 'Very High' ? 'high' : 'moderate'
                      }`}>
                        {fund.risk} Risk
                      </span>
                    </div>
                    <h3 className="fund-title" style={{ fontSize: '0.95rem', minHeight: '3.2rem' }}>{fund.name}</h3>
                    
                    <div className="fund-stats">
                      <div className="stat-box">
                        <span className="stat-label">3Y CAGR</span>
                        <span className="stat-value up">{fund.return3Y}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Expense Ratio</span>
                        <span className="stat-value">{fund.expenseRatio}</span>
                      </div>
                    </div>

                    <div className="fund-footer" style={{ marginTop: '1rem' }}>
                      <div className="fund-nav-price">
                        NAV: <span>₹{fund.nav}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-solid-orange" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', borderRadius: '8px' }}
                          onClick={() => openPanel('buy', fund)}
                        >
                          Buy 💰
                        </button>
                        <button 
                          className="btn btn-outline-dark" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', borderRadius: '8px', gap: '0.1rem', display: 'flex', alignItems: 'center' }}
                          onClick={() => openPanel('riskAnalysis', fund)}
                        >
                          <span>🤖</span> AI Suitability
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {mutualFunds.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-secondary)' }}>
                    No funds found in this criteria.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 2: PORTFOLIO DASHBOARD */}
          {activeTab === 'portfolio' && (
            <section className="explorer-section">
              <div className="section-header" style={{ marginBottom: '2rem' }}>
                <div className="section-info">
                  <h2>My Investment Portfolio</h2>
                  <p>Track your active SQLite mutual fund holdings recalculating live on AMFI rates.</p>
                </div>
              </div>

              {/* Valuation Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Invested</span>
                  <h3 style={{ fontSize: '1.8rem', color: '#fff', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(portfolioSummary.totalInvested)}
                  </h3>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Value</span>
                  <h3 style={{ fontSize: '1.8rem', color: 'var(--color-accent)', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>
                    {formatCurrency(portfolioSummary.totalCurrent)}
                  </h3>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Gain / Loss</span>
                  <h3 style={{ 
                    fontSize: '1.8rem', 
                    color: portfolioSummary.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)', 
                    marginTop: '0.5rem', 
                    fontFamily: 'var(--font-display)' 
                  }}>
                    {portfolioSummary.pnl >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.pnl)} 
                    <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                      ({portfolioSummary.pnlPercent >= 0 ? '+' : ''}{portfolioSummary.pnlPercent.toFixed(2)}%)
                    </span>
                  </h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem', alignItems: 'start' }}>
                {/* Holdings table */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', overflowX: 'auto' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Active Holdings</h4>
                  {portfolio.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-secondary)', fontSize: '0.85rem' }}>
                      Aapka portfolio khali hai! 🎯 Explorer grid par jakar funds buy karein.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-secondary)' }}>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Scheme Name</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Units</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Invested</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Current Val</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Returns</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.map(holding => (
                          <tr key={holding.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#fff', maxWidth: '200px' }}>{holding.fund_name}</td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-display)' }}>{holding.units}</td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-display)' }}>{formatCurrency(holding.invested_value)}</td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>{formatCurrency(holding.current_value)}</td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-display)', color: holding.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              {holding.pnl >= 0 ? '+' : ''}{holding.pnl_percent}%
                            </td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                              <button 
                                className="btn" 
                                style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'none', padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px' }}
                                onClick={() => handleSellHolding(holding.id)}
                              >
                                Sell
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Allocation pie chart display */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>Asset Allocation</h4>
                  {portfolio.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-secondary)', fontSize: '0.85rem' }}>No allocation data.</div>
                  ) : (
                    <>
                      <svg className="svg-pie" viewBox="0 0 120 120" style={{ width: '150px', height: '150px' }}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="12" />
                        
                        {/* Equity Slice */}
                        <circle 
                          cx="60" cy="60" r="50" fill="none" stroke="#e46e14" strokeWidth="12"
                          strokeDasharray="314.16"
                          strokeDashoffset={(314.16 * (100 - portfolioSummary.allocation.Equity)) / 100}
                        />

                        {/* Debt Slice */}
                        <circle 
                          cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="12"
                          strokeDasharray="314.16"
                          strokeDashoffset={(314.16 * (100 - portfolioSummary.allocation.Debt)) / 100}
                          transform={`rotate(${portfolioSummary.allocation.Equity * 3.6} 60 60)`}
                        />

                        {/* Hybrid Slice */}
                        <circle 
                          cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="12"
                          strokeDasharray="314.16"
                          strokeDashoffset={(314.16 * (100 - portfolioSummary.allocation.Hybrid)) / 100}
                          transform={`rotate(${(portfolioSummary.allocation.Equity + portfolioSummary.allocation.Debt) * 3.6} 60 60)`}
                        />
                      </svg>
                      
                      <div className="legend" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e46e14' }}></span> Equity</span>
                          <strong>{portfolioSummary.allocation.Equity}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></span> Debt</span>
                          <strong>{portfolioSummary.allocation.Debt}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span> Hybrid</span>
                          <strong>{portfolioSummary.allocation.Hybrid}%</strong>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: AI SIGNALS NEWS AND RECOMMENDATIONS */}
          {activeTab === 'news' && (
            <section className="explorer-section">
              <div className="section-header" style={{ marginBottom: '2rem' }}>
                <div className="section-info">
                  <h2>AI Signals Market News</h2>
                  <p>Analyze global market news and receive matching mutual fund advice in Hinglish.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* News Feed items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {newsList.map(news => (
                    <div 
                      key={news.id} 
                      style={{ 
                        background: 'var(--bg-card)', 
                        border: activeNewsId === news.id ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', 
                        borderRadius: '16px', 
                        padding: '1.5rem',
                        transition: 'all 0.25s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>
                        <span style={{ background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{news.category}</span>
                        <span>{news.published_at}</span>
                      </div>
                      <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.75rem', lineHeight: '1.4' }}>{news.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', lineHeight: '1.5', marginBottom: '1.25rem' }}>{news.content}</p>
                      
                      <button 
                        className="btn btn-solid-orange" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', gap: '0.25rem' }}
                        onClick={() => runNewsAnalysis(news.id)}
                        disabled={isNewsAnalyzing && activeNewsId === news.id}
                      >
                        <span>🤖</span> {isNewsAnalyzing && activeNewsId === news.id ? 'Analyzing...' : 'Analyze Signals with AI'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* News report card */}
                <div style={{ position: 'sticky', top: '100px' }}>
                  {isNewsAnalyzing && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
                      <div style={{ width: '35px', height: '35px', border: '3px solid rgba(228,110,20,0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'pulse 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
                      <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>Processing AI news analysis...</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Gemini is scanning tech, capex, and macro indices impact...</p>
                    </div>
                  )}

                  {!isNewsAnalyzing && !newsAnalysis && (
                    <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--color-border)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', color: 'var(--color-secondary)', fontSize: '0.85rem' }}>
                      <span>👈</span> Kisi bhi news update ke niche "Analyze Signals with AI" button daba kar dekhie ki is news se mutual funds par kya impact padega.
                    </div>
                  )}

                  {!isNewsAnalyzing && newsAnalysis && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <span>🤖</span> News Suitability Signals
                      </h3>
                      
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                        <h5 style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Market Impact (Hinglish)</h5>
                        <p style={{ fontSize: '0.8rem', lineHeight: '1.5', color: '#fff' }}>{newsAnalysis.impact_summary}</p>
                      </div>

                      <h4 style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggested Actions:</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {newsAnalysis.suggested_funds.map((fund, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              background: 'rgba(255,255,255,0.02)', 
                              border: '1px solid rgba(255,255,255,0.04)', 
                              borderRadius: '10px', 
                              padding: '1rem' 
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <h5 style={{ fontSize: '0.8rem', color: '#fff', maxWidth: '200px' }}>{fund.fund_name}</h5>
                              <span style={{ 
                                fontSize: '0.7rem', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px',
                                background: fund.verdict === 'BUY' ? 'var(--color-success-bg)' : fund.verdict === 'AVOID' ? 'var(--color-danger-bg)' : 'rgba(255,255,255,0.05)',
                                color: fund.verdict === 'BUY' ? 'var(--color-success)' : fund.verdict === 'AVOID' ? 'var(--color-danger)' : '#fff',
                                fontWeight: 700
                              }}>{fund.verdict}</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', lineHeight: '1.4' }}>{fund.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Side Slide-out Panel */}
      <div 
        className={`side-panel-overlay ${isPanelOpen ? 'open' : ''}`}
        onClick={() => setIsPanelOpen(false)}
      >
        <div className="side-panel" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
          <div className="panel-header">
            <h2>
              {panelType === 'calculator' && 'SIP Calculator'}
              {panelType === 'compare' && 'Compare Mutual Funds'}
              {panelType === 'riskAnalysis' && 'Gemini AI Risk Suitability'}
              {panelType === 'buy' && 'Invest in Mutual Fund'}
              {panelType === 'about' && 'About Platform'}
            </h2>
            <button className="panel-close-btn" onClick={() => setIsPanelOpen(false)}>
              &times;
            </button>
          </div>

          {/* PANEL TYPE: BUY TRANSACTION */}
          {panelType === 'buy' && selectedFund && (
            <form onSubmit={handleBuySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <span className="fund-category" style={{ fontSize: '0.65rem' }}>Purchasing holding</span>
                <h3 style={{ fontSize: '1.05rem', margin: '0.25rem 0' }}>{selectedFund.name}</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                  <span>Live NAV: <strong>₹{selectedFund.nav}</strong></span>
                  <span>|</span>
                  <span>Category: <strong>{selectedFund.category}</strong></span>
                </div>
              </div>

              <div className="auth-group">
                <label className="auth-label">Enter Investment Amount (INR)</label>
                <input 
                  type="number" 
                  className="auth-input"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(Number(e.target.value))}
                  min="500"
                  step="100"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1000, 5000, 10000, 25000].map(amt => (
                  <button 
                    key={amt} 
                    type="button" 
                    className="btn" 
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', background: buyAmount === amt ? 'rgba(228,110,20,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${buyAmount === amt ? 'var(--color-accent)' : 'var(--color-border)'}`, color: '#fff' }}
                    onClick={() => setBuyAmount(amt)}
                  >
                    +{formatCurrency(amt)}
                  </button>
                ))}
              </div>

              <button type="submit" className="btn btn-solid-orange" style={{ padding: '0.8rem', fontSize: '0.9rem', marginTop: '1rem' }} disabled={isBuying}>
                {isBuying ? 'Processing Purchase...' : 'Confirm & Purchase Holding'}
              </button>
            </form>
          )}

          {/* PANEL TYPE: ABOUT THE PLATFORM */}
          {panelType === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--color-secondary)' }}>
              <div style={{ background: 'rgba(228, 110, 20, 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(228, 110, 20, 0.2)', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--color-accent)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>AI Mutual Fund Analyzer 🤖</h3>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Version 2.0 • Full-Stack Premium Edition</span>
              </div>

              <p>
                Yeh ek state-of-the-art wealth management platform hai jo Indian retail investors ko simple Hinglish financial advisor reports aur live market feeds ki help se smarter investments choose karne mein help karta hai.
              </p>

              <h4 style={{ color: '#fff', fontSize: '0.9rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem', marginTop: '0.5rem' }}>Key Architectural Pillars:</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem' }}>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>⚡ Live AMFI Scraper</h5>
                  <p style={{ margin: 0, fontSize: '0.75rem' }}>Hum direct amfiindia.com se raw text NAV feeds fetch karte hain. Direct plan and Growth option funds scrape hote hain taaki commission margins transparent rahein.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem' }}>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>📂 Local SQLite Portfolio Sync</h5>
                  <p style={{ margin: 0, fontSize: '0.75rem' }}>Aapka personal portfolio SQLite backend DB se linked hai. Har buy/sell transaction secure JWT key authorization ke under DB tables mein update hota hai.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem' }}>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>🤖 Gemini AI Hinglish Advisor</h5>
                  <p style={{ margin: 0, fontSize: '0.75rem' }}>Gemini LLM system se linked hai. Aapka age, horizon, aur investment goals analyze karke yeh recommendations pure simple Hinglish (ye le sakte ho / nehi le sakte) mein banata hai.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem' }}>
                  <h5 style={{ color: '#fff', marginBottom: '0.25rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>📈 SIP & Lumpsum Calculator</h5>
                  <p style={{ margin: 0, fontSize: '0.75rem' }}>Investment compound calculations handle karta hai, jisse dynamic graphs aur metrics easily estimate ho sakein.</p>
                </div>
              </div>
            </div>
          )}

          {/* PANEL TYPE: AI RISK SUITABILITY CHECK (HINGLISH REPORT) */}
          {panelType === 'riskAnalysis' && selectedFund && (
            <div>
              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                <span className="fund-category" style={{ fontSize: '0.65rem' }}>Selected Mutual Fund</span>
                <h3 style={{ fontSize: '1.05rem', margin: '0.25rem 0' }}>{selectedFund.name}</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                  <span>Risk Level: <strong style={{ color: (selectedFund?.risk && selectedFund.risk.includes('High')) ? 'var(--color-danger)' : 'var(--color-success)' }}>{selectedFund?.risk || 'Moderate'}</strong></span>
                  <span>|</span>
                  <span>3Y Return: <strong style={{ color: 'var(--color-success)' }}>{selectedFund.return3Y}</strong></span>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>1. Tell Us About Yourself:</h4>
              
              <div className="slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">Your Age</span>
                  <span className="slider-val">{userAge} Years Old</span>
                </div>
                <input 
                  type="range" 
                  min="18" 
                  max="85" 
                  value={userAge}
                  onChange={(e) => setUserAge(Number(e.target.value))}
                  className="custom-slider"
                />
              </div>

              <div className="slider-group" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Investment Duration</label>
                  <select 
                    value={investmentHorizon}
                    onChange={(e) => setInvestmentHorizon(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="Less than 1 year">Less than 1 year (Very Short)</option>
                    <option value="1-3 years">1 to 3 years (Short term)</option>
                    <option value="3-5 years">3 to 5 years (Medium term)</option>
                    <option value="5+ years">5+ years (Long term)</option>
                  </select>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Your Risk Tolerance</label>
                  <select 
                    value={riskTolerance}
                    onChange={(e) => setRiskTolerance(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="Low">Low (Safety First)</option>
                    <option value="Moderate">Moderate (Balanced)</option>
                    <option value="High">High (Wealth Maximize)</option>
                  </select>
                </div>
              </div>

              <button 
                className="btn btn-solid-orange" 
                style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem' }}
                onClick={runAiRiskAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '🤖 Generating AI Suitability Report...' : 'Analyze Risk Suitability'}
              </button>

              {/* Loader */}
              {isAnalyzing && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ width: '30px', height: '30px', border: '3px solid rgba(228,110,20,0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'pulse 1s linear infinite', margin: '0 auto 1rem' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>Gemini is evaluating standard portfolio risks against your timeframe...</span>
                </div>
              )}

              {/* AI REPORT DISPLAY */}
              {aiAnalysisResult && (
                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff' }}>🤖 AI Suitability Report</h3>
                  
                  {/* Verdict Badge */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem', 
                    borderRadius: '8px', 
                    background: aiAnalysisResult.verdict === 'RECOMMENDED' ? 'var(--color-success-bg)' : aiAnalysisResult.verdict === 'NOT RECOMMENDED' ? 'var(--color-danger-bg)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${aiAnalysisResult.verdict === 'RECOMMENDED' ? 'rgba(34,197,94,0.3)' : aiAnalysisResult.verdict === 'NOT RECOMMENDED' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-secondary)', display: 'block' }}>ADVISORY VERDICT</span>
                      <strong style={{ 
                        fontSize: '1.05rem', 
                        color: aiAnalysisResult.verdict === 'RECOMMENDED' ? 'var(--color-success)' : aiAnalysisResult.verdict === 'NOT RECOMMENDED' ? 'var(--color-danger)' : '#f59e0b'
                      }}>{aiAnalysisResult.verdict}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-secondary)', display: 'block' }}>SUITABILITY SCORE</span>
                      <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>{aiAnalysisResult.risk_suitability_score}/10</strong>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', lineHeight: '1.5', marginBottom: '1.25rem', padding: '0 0.25rem' }}>
                    {aiAnalysisResult.verdict_reason}
                  </p>

                  {/* Suitability Score Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${aiAnalysisResult.risk_suitability_score * 10}%`, 
                      height: '100%', 
                      background: aiAnalysisResult.risk_suitability_score >= 7.5 ? 'var(--color-success)' : aiAnalysisResult.risk_suitability_score >= 5 ? '#f59e0b' : 'var(--color-danger)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }}></div>
                  </div>

                  {/* Summary */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                    <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Detailed Rationale</h5>
                    <p style={{ fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--color-primary)' }}>{aiAnalysisResult.analysis_summary}</p>
                  </div>

                  {/* Pros & Cons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h5 style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>✔️ Pros</h5>
                      <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                        {(aiAnalysisResult?.pros || []).map((p, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>⚠️ Risks / Cons</h5>
                      <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                        {(aiAnalysisResult?.cons || []).map((c, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{c}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Alternative Suggestions */}
                  {aiAnalysisResult.alternative_suggestion && (
                    <div style={{ background: 'rgba(228, 110, 20, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px dotted rgba(228, 110, 20, 0.3)' }}>
                      <h5 style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginBottom: '0.25rem' }}>💡 AI Actionable Advice</h5>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', lineHeight: '1.4' }}>{aiAnalysisResult.alternative_suggestion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PANEL TYPE: CALCULATOR */}
          {panelType === 'calculator' && (
            <div>
              <div className="calculator-tabs">
                <button 
                  className={`calc-tab ${calcType === 'SIP' ? 'active' : ''}`}
                  onClick={() => setCalcType('SIP')}
                >
                  Monthly SIP
                </button>
                <button 
                  className={`calc-tab ${calcType === 'Lumpsum' ? 'active' : ''}`}
                  onClick={() => setCalcType('Lumpsum')}
                >
                  Lumpsum / One-Time
                </button>
              </div>

              {calcType === 'SIP' ? (
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span className="slider-label">Monthly Investment</span>
                    <span className="slider-val">{formatCurrency(monthlyInvest)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max="100000" 
                    step="500"
                    value={monthlyInvest}
                    onChange={(e) => setMonthlyInvest(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>
              ) : (
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span className="slider-label">Total Investment</span>
                    <span className="slider-val">{formatCurrency(oneTimeInvest)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5000" 
                    max="1000000" 
                    step="5000"
                    value={oneTimeInvest}
                    onChange={(e) => setOneTimeInvest(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>
              )}

              <div className="slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">Expected Return Rate (p.a.)</span>
                  <span className="slider-val">{returnRate}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  step="0.5"
                  value={returnRate}
                  onChange={(e) => setReturnRate(Number(e.target.value))}
                  className="custom-slider"
                />
              </div>

              <div className="slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">Time Period</span>
                  <span className="slider-val">{tenureYears} Years</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="40" 
                  step="1"
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="custom-slider"
                />
              </div>

              <div className="results-display">
                <div className="result-row">
                  <span className="result-label">Invested Amount</span>
                  <span className="result-val">{formatCurrency(calculatorResults.totalInvested)}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Est. Returns</span>
                  <span className="result-val">{formatCurrency(calculatorResults.estimatedReturns)}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Total Value</span>
                  <span className="result-val total-wealth">{formatCurrency(calculatorResults.totalValue)}</span>
                </div>
              </div>

              <div className="visual-chart-container">
                <svg className="svg-pie" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="12" />
                  
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="rgba(255, 255, 255, 0.25)" 
                    strokeWidth="12"
                    strokeDasharray="314.16"
                    strokeDashoffset={(314.16 * (100 - calculatorResults.investPercent)) / 100}
                    style={{ transition: 'stroke-dashoffset 0.3s' }}
                  />

                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="url(#accentGradient)" 
                    strokeWidth="12"
                    strokeDasharray="314.16"
                    strokeDashoffset={(314.16 * (100 - calculatorResults.returnPercent)) / 100}
                    transform={`rotate(${(calculatorResults.investPercent / 100) * 360} 60 60)`}
                    style={{ transition: 'stroke-dashoffset 0.3s' }}
                  />
                  
                  <defs>
                    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff8c32" />
                      <stop offset="100%" stopColor="#e46e14" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: 'rgba(255, 255, 255, 0.25)' }}></span>
                    Invested ({Math.round(calculatorResults.investPercent)}%)
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: 'linear-gradient(135deg, #ff8c32, #e46e14)' }}></span>
                    Est. Returns ({Math.round(calculatorResults.returnPercent)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PANEL TYPE: COMPARE */}
          {panelType === 'compare' && (
            <div className="compare-container">
              <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>
                Select two funds to compare their parsed AMFI metrics:
              </p>

              <div className="compare-select-row">
                <select 
                  className="compare-dropdown"
                  value={compareId1}
                  onChange={(e) => setCompareId1(e.target.value)}
                >
                  {mutualFunds.map(f => (
                    <option key={f.id} value={f.id} disabled={f.id === compareId2}>{f.name}</option>
                  ))}
                </select>

                <select 
                  className="compare-dropdown"
                  value={compareId2}
                  onChange={(e) => setCompareId2(e.target.value)}
                >
                  {mutualFunds.map(f => (
                    <option key={f.id} value={f.id} disabled={f.id === compareId1}>{f.name}</option>
                  ))}
                </select>
              </div>

              {selectedCompareFund1 && selectedCompareFund2 && (
                <div className="comparison-card-grid">
                  {/* Fund 1 */}
                  <div className="comparison-column">
                    <h4 className="comp-header" style={{ fontSize: '0.8rem', minHeight: '3.2rem' }}>{selectedCompareFund1.name}</h4>
                    <div className="comp-stat-row">
                      <span>Category</span>
                      <span style={{ fontWeight: 600 }}>{selectedCompareFund1.category}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>Type</span>
                      <span style={{ color: '#fff' }}>{selectedCompareFund1.type}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>3Y Return</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{selectedCompareFund1.return3Y}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>1Y Return</span>
                      <span style={{ color: 'var(--color-success)' }}>{selectedCompareFund1.return1Y}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>Expense Ratio</span>
                      <span style={{ color: '#fff' }}>{selectedCompareFund1.expenseRatio}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>NAV Price</span>
                      <span>₹{selectedCompareFund1.nav}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>Risk Profile</span>
                      <span style={{ color: (selectedCompareFund1?.risk && selectedCompareFund1.risk.includes('High')) ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {selectedCompareFund1?.risk || 'Moderate'}
                      </span>
                    </div>
                    <div className="comp-stat-row">
                      <span>AUM Size</span>
                      <span>{selectedCompareFund1.aum}</span>
                    </div>
                  </div>

                  {/* Fund 2 */}
                  <div className="comparison-column">
                    <h4 className="comp-header" style={{ fontSize: '0.8rem', minHeight: '3.2rem' }}>{selectedCompareFund2.name}</h4>
                    <div className="comp-stat-row">
                      <span>Category</span>
                      <span style={{ fontWeight: 600 }}>{selectedCompareFund2.category}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>Type</span>
                      <span style={{ color: '#fff' }}>{selectedCompareFund2.type}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>3Y Return</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{selectedCompareFund2.return3Y}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>1Y Return</span>
                      <span style={{ color: 'var(--color-success)' }}>{selectedCompareFund2.return1Y}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>Expense Ratio</span>
                      <span style={{ color: '#fff' }}>{selectedCompareFund2.expenseRatio}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>NAV Price</span>
                      <span>₹{selectedCompareFund2.nav}</span>
                    </div>
                    <div className="comp-stat-row">
                      <span>Risk Profile</span>
                      <span style={{ color: (selectedCompareFund2?.risk && selectedCompareFund2.risk.includes('High')) ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {selectedCompareFund2?.risk || 'Moderate'}
                      </span>
                    </div>
                    <div className="comp-stat-row">
                      <span>AUM Size</span>
                      <span>{selectedCompareFund2.aum}</span>
                    </div>
                  </div>
                </div>
              )}

              <button 
                className="btn btn-solid-orange compare-btn-action"
                onClick={() => {
                  setCalcType('SIP');
                  const fund = selectedCompareFund1;
                  const rateNum = parseFloat(fund?.return3Y.replace('%', '') || '12');
                  setReturnRate(rateNum);
                  openPanel('calculator');
                }}
              >
                Simulate Returns
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
