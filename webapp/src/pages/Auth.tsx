import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const [active, setActive] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register form
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regError, setRegError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await login(loginEmail, loginPass);
      navigate("/dashboard");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    try {
      await register(regEmail, regPass);
      navigate("/dashboard");
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className={`auth-container ${active ? "active" : ""}`}>
        {/* Sign In Form */}
        <div className="form-panel sign-in">
          <form onSubmit={handleLogin}>
            <h1 className="text-2xl font-mono text-accent mb-4">Sign In</h1>
            <span>use your email and password</span>
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
            />
            {loginError && <p className="error-msg">{loginError}</p>}
            <a href="#">Forgot your password?</a>
            <button type="submit">Sign In</button>
          </form>
        </div>

        {/* Sign Up Form */}
        <div className="form-panel sign-up">
          <form onSubmit={handleRegister}>
            <h1 className="text-2xl font-mono text-accent mb-4">Create Account</h1>
            <span>use your email for registration</span>
            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
              required
              minLength={6}
            />
            {regError && <p className="error-msg">{regError}</p>}
            <button type="submit">Sign Up</button>
          </form>
        </div>

        {/* Toggle Panel */}
        <div className="toggle-panel-wrap">
          <div className="toggle-inner">
            <div className="toggle-side left">
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all site features</p>
              <button className="ghost" onClick={() => setActive(false)}>
                Sign In
              </button>
            </div>
            <div className="toggle-side right">
              <h1>Hello, Doctor!</h1>
              <p>Register to start practicing with clinical simulations</p>
              <button className="ghost" onClick={() => setActive(true)}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
