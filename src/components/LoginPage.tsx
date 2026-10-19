import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader, LogIn } from 'lucide-react';

const API_BASE = '/api/v1';
const API_KEY  = 'smart-itt-sec-key-prod-2026';
const TOKEN_KEY = 'smart_itt_web_token';
const USER_KEY  = 'smart_itt_web_user';

const ADMIN_USERNAME = 'supervisor@smartitt.lk';
const ADMIN_PASSWORD = 'supervisor';

export interface WebUser {
  id: string;
  name: string;
  role: 'ADMIN';
  email: string;
  token: string;
}

interface LoginPageProps {
  onLogin: (user: WebUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [apiOnline, setApiOnline]     = useState<boolean | null>(null);

  /* probe backend once on mount */
  useEffect(() => {
    fetch(`${API_BASE}/dashboard`, {
      headers: { 'X-API-KEY': API_KEY },
      signal: AbortSignal.timeout(3000),
    })
      .then((r) => setApiOnline(r.ok))
      .catch(() => setApiOnline(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser || !password.trim()) {
      setError('PLEASE ENTER YOUR CREDENTIALS.');
      return;
    }

    setLoading(true);
    setError('');

    let token = '';
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
        body: JSON.stringify({ username: cleanUser, password }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const d = await res.json();
        token = d.token || d.accessToken || '';
        if (token) localStorage.setItem(TOKEN_KEY, token);

        const webUser: WebUser = {
          id: d.user?.id || 'supervisor-hq',
          name: d.user?.name || d.user?.fullName || 'Port Supervisor / Operations HQ',
          role: 'ADMIN',
          email: d.user?.email || cleanUser,
          token: token || 'online-auth-token',
        };
        localStorage.setItem(USER_KEY, JSON.stringify(webUser));
        onLogin(webUser);
        setLoading(false);
        return;
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'INVALID CREDENTIALS. ACCESS DENIED.';
        setError(errMsg.toUpperCase());
        setLoading(false);
        return;
      }
    } catch {
      /* offline fallback */
      if (cleanUser === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const adminUser: WebUser = {
          id: 'admin-hq',
          name: 'SCK Operations HQ',
          role: 'ADMIN',
          email: ADMIN_USERNAME,
          token: 'offline-admin',
        };
        localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
        onLogin(adminUser);
        setLoading(false);
        return;
      } else {
        setError('UNABLE TO REACH GATEWAY. PLEASE VERIFY CREDENTIALS.');
        setLoading(false);
        return;
      }
    }
  };

  return (
    <div style={s.root}>
      {/* ── grid overlay ── */}
      <div style={s.gridOverlay} />

      {/* ── centred scroll container ── */}
      <div style={s.scroll}>

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <div style={s.hero}>
          {/* company pill */}
          <div style={s.companyPill}>
            {/* shield icon via SVG inline */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={s.companyPillText}>POWERED BY SCK LOGISTICS</span>
          </div>

          {/* logo badge */}
          <div style={s.logoBadge}>
            <img src="/sck-logo.png" alt="SCK" style={s.heroLogo}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>

          <div style={s.brandTitle}>SCK ITT PROJECT</div>
          <div style={s.brandSubtitle}>INTER-TERMINAL TRANSPORTATION MANAGEMENT SYSTEM</div>

          {/* online badge */}
          <div style={s.onlineBadge}>
            <div style={{
              ...s.onlineDot,
              background: apiOnline ? '#22ef7e' : apiOnline === null ? '#f59e0b' : '#f43f5e',
              boxShadow: `0 0 6px ${apiOnline ? '#22ef7e' : apiOnline === null ? '#f59e0b' : '#f43f5e'}88`,
            }} />
            <span style={{
              ...s.onlineText,
              color: apiOnline ? '#22ef7e' : apiOnline === null ? '#f59e0b' : '#f43f5e',
            }}>
              {apiOnline === null
                ? 'PROBING FLEET TELEMATICS GATEWAY…'
                : apiOnline
                ? 'SCK FLEET TELEMATICS GATEWAY ONLINE'
                : 'GATEWAY OFFLINE — STANDALONE MODE'}
            </span>
          </div>
        </div>

        {/* ══ FORM CARD ══════════════════════════════════════════ */}
        <form style={s.sheet} onSubmit={handleSubmit} noValidate>

          {/* username */}
          <label style={s.inputLabel} htmlFor="adm-user">
            ADMIN PANEL CREDENTIALS (USERNAME / EMAIL)
          </label>
          <div style={s.inputWrap}>
            {/* admin settings icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <input
              id="adm-user"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Supervisor email, Employee ID, or Admin user"
              style={s.input}
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* password */}
          <label style={s.inputLabel} htmlFor="adm-pass">
            ADMIN PIN / PASSWORD
          </label>
          <div style={s.inputWrap}>
            {/* key icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
            <input
              id="adm-pass"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              style={{ ...s.input, paddingRight: '40px' }}
              autoComplete="current-password"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowPass(v => !v)} style={s.eyeBtn} tabIndex={-1}>
              {showPass ? <EyeOff size={18} color="#849396" /> : <Eye size={18} color="#849396" />}
            </button>
          </div>

          {/* error */}
          {error && (
            <div style={s.errorBox}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f43f5e"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* submit */}
          <button
            id="admin-login-submit"
            type="submit"
            disabled={loading}
            style={{ ...s.loginBtn, opacity: loading ? 0.55 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading
              ? <Loader size={20} color="#00363d" style={{ animation: 'ittSpin 1s linear infinite' }} />
              : <>
                  <LogIn size={20} color="#00363d" />
                  <span style={s.loginBtnText}>LAUNCH ADMIN CONTROL PANEL</span>
                </>}
          </button>
        </form>

        {/* ══ FOOTER ════════════════════════════════════════════ */}
        <div style={s.footerWrap}>
          <div style={s.footerLogoBox}>
            <img src="/sck-logo.png" alt="SCK" style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div style={s.footerText}>SCK LOGISTICS (PVT) LTD · PORT &amp; TERMINAL TELEMATICS</div>
          <div style={s.footerSub}>TLS 1.3 MESH · 256-BIT JWT ENCRYPTION</div>
        </div>
      </div>

      <style>{`
        @keyframes ittSpin { to { transform: rotate(360deg); } }
        #adm-user:focus, #adm-pass:focus {
          outline: none;
          border-color: #00e5ff !important;
          box-shadow: 0 0 0 2px rgba(0,229,255,0.12);
        }
        #adm-user::placeholder, #adm-pass::placeholder { color: #849396; }
        #admin-login-submit:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
        #admin-login-submit { transition: opacity .18s, transform .15s, filter .15s; }
      `}</style>
    </div>
  );
};

/* ─── styles ──────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    background: '#0e141d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: 'auto',
    zIndex: 9999,
  },
  gridOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),
                      linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)`,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  scroll: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
    padding: '32px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
  },
  /* hero */
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '20px',
  },
  companyPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(0,229,255,0.08)',
    border: '1px solid rgba(0,229,255,0.28)',
    borderRadius: '999px',
    padding: '5px 12px',
    marginBottom: '4px',
  },
  companyPillText: {
    fontSize: '10px',
    fontWeight: 900,
    color: '#00e5ff',
    letterSpacing: '1.2px',
  },
  logoBadge: {
    width: '76px',
    height: '76px',
    borderRadius: '18px',
    background: '#0e141d',
    border: '1.5px solid rgba(0,229,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,229,255,0.10)',
  },
  heroLogo: {
    width: '74px',
    height: '74px',
    objectFit: 'contain',
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#00e5ff',
    letterSpacing: '1.2px',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#849396',
    letterSpacing: '1.2px',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  onlineBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#080e17',
    border: '1px solid #242a34',
    borderRadius: '6px',
    padding: '4px 10px',
    marginTop: '4px',
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  onlineText: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.4px',
  },
  /* form card */
  sheet: {
    background: '#161c25',
    border: '1px solid #242a34',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '0',
  },
  inputLabel: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#849396',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    background: '#080e17',
    border: '1px solid #242a34',
    borderRadius: '8px',
    padding: '0 12px',
    height: '50px',
    position: 'relative',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    color: '#dde2f0',
    fontFamily: 'inherit',
    height: '50px',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    background: 'rgba(244,63,94,0.07)',
    border: '1px solid rgba(244,63,94,0.22)',
    borderRadius: '6px',
    padding: '9px 12px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#f43f5e',
    letterSpacing: '0.4px',
    lineHeight: 1.4,
  },
  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '52px',
    borderRadius: '8px',
    border: 'none',
    background: '#00e5ff',
    marginTop: '8px',
    boxShadow: '0 4px 20px rgba(0,229,255,0.22)',
  },
  loginBtnText: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#00363d',
    letterSpacing: '1px',
  },
  /* footer */
  footerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    marginTop: '22px',
  },
  footerLogoBox: {
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    background: '#ffffff',
    border: '1.5px solid #dfa837',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '4px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
  footerText: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#849396',
    letterSpacing: '0.8px',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  footerSub: {
    fontSize: '8px',
    color: '#3b494c',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};
