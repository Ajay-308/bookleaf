import { useState } from "react";

type LoginScreenProps = {
  busy: boolean;
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
};

export function LoginScreen({ busy, error, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("priya.sharma@email.com");
  const [password, setPassword] = useState("Author123!");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void onLogin(email, password);
  }

  return <main className="login-shell">
    <section className="login-brand">
      <div className="brand-mark">b<span>.</span></div>
      <div className="brand-word">bookleaf</div>
      <div className="login-brand-copy">
        <p className="eyebrow">YOUR PUBLISHING PARTNER</p>
        <h1>Your stories.<br />Our support.</h1>
        <p>A calmer, clearer way to stay connected with your BookLeaf team.</p>
      </div>
      <span className="brand-foot">Independent voices, beautifully published.</span>
    </section>
    <section className="login-panel">
      <form className="login-form" onSubmit={handleSubmit}>
        <p className="eyebrow">BOOKLEAF AUTHOR SUPPORT</p>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to manage your books and support requests.</p>
        <label>Email address<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password
          <span className="password-field">
            <input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button
              type="button"
              className="password-visibility"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 9 5.3 9 7a9.7 9.7 0 01-3.1 4.2M6.2 6.2C4.2 7.5 3 9.4 3 12c0 1.7 3.8 7 9 7 1.1 0 2.2-.3 3.2-.7" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.3-7 9-7 9 7 9 7-3.3 7-9 7-9-7-9-7z" /><circle cx="12" cy="12" r="2.5" /></svg>
              )}
            </button>
          </span>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <span>→</span></button>
        <div className="demo-accounts">
          <span>DEMO ACCESS</span>
          <button type="button" onClick={() => { setEmail("priya.sharma@email.com"); setPassword("Author123!"); }}>Author portal <b>→</b></button>
          <button type="button" onClick={() => { setEmail("admin@bookleaf.local"); setPassword("Admin123!"); }}>Operations team <b>→</b></button>
        </div>
        <p className="login-foot">Secure access for BookLeaf authors and team members.</p>
      </form>
    </section>
  </main>;
}
