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
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regCourse, setRegCourse] = useState("");
  const [regError, setRegError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await login(loginEmail, loginPass);
      navigate("/dashboard");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Кіру сәтсіз аяқталды");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    try {
      await register(regEmail, regPass, regFirstName, regLastName, regCourse);
      navigate("/dashboard");
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Тіркеу сәтсіз аяқталды");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className={`auth-container ${active ? "active" : ""}`}>
        {/* Sign In Form */}
        <div className="form-panel sign-in">
          <form onSubmit={handleLogin}>
            <h1 className="text-2xl font-mono text-accent mb-4">Кіру</h1>
            <span>Электрондық поштаңыз бен құпия сөзіңізді қолданыңыз</span>
            <input
              type="email"
              placeholder="Электрондық пошта"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Құпия сөз"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
            />
            {loginError && <p className="error-msg">{loginError}</p>}
            <a href="#">Құпия сөзді ұмыттыңыз ба?</a>
            <button type="submit">Кіру</button>
          </form>
        </div>

        {/* Sign Up Form */}
        <div className="form-panel sign-up">
          <form onSubmit={handleRegister}>
            <h1 className="text-2xl font-mono text-accent mb-4">Аккаунт құру</h1>
            <span>Тіркеу үшін электрондық поштаңызды қолданыңыз</span>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <input
                type="text"
                placeholder="Аты"
                value={regFirstName}
                onChange={(e) => setRegFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Тегі"
                value={regLastName}
                onChange={(e) => setRegLastName(e.target.value)}
                required
              />
            </div>
            <input
              type="text"
              placeholder="Курс (мысалы, 4-ші курс)"
              value={regCourse}
              onChange={(e) => setRegCourse(e.target.value)}
            />
            <input
              type="email"
              placeholder="Электрондық пошта"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Құпия сөз (минимум 6 таңба)"
              value={regPass}
              onChange={(e) => setRegPass(e.target.value)}
              required
              minLength={6}
            />
            {regError && <p className="error-msg">{regError}</p>}
            <button type="submit">Тіркелу</button>
          </form>
        </div>

        {/* Toggle Panel */}
        <div className="toggle-panel-wrap">
          <div className="toggle-inner">
            <div className="toggle-side left">
              <h1>Қайта қош келдіңіз!</h1>
              <p>Сайттың барлық мүмкіндіктерін пайдалану үшін жеке деректеріңізді енгізіңіз</p>
              <button className="ghost" onClick={() => setActive(false)}>
                Кіру
              </button>
            </div>
            <div className="toggle-side right">
              <h1>Сәлеметсіз бе, дәрігер!</h1>
              <p>Клиникалық симуляциялармен жұмыс істеуге тіркеліңіз</p>
              <button className="ghost" onClick={() => setActive(true)}>
                Тіркелу
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
