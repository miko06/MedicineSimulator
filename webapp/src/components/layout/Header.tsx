import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useLocale } from "../../hooks/useLocale";

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { nextLocale, label } = useLocale();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 glass flex items-center justify-between px-6">
      <Link
        to="/"
        className="flex items-center gap-2 text-accent font-mono text-sm tracking-tight"
      >
        <span className="text-lg font-medium">+</span>
        <span className="hidden sm:inline">MedSim</span>
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface transition-colors"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 9.5A5.5 5.5 0 016.5 2.5a5.5 5.5 0 107 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <button
          onClick={nextLocale}
          className="w-8 h-8 flex items-center justify-center rounded text-xs font-mono text-muted hover:text-text hover:bg-surface transition-colors"
        >
          {label}
        </button>

        {user ? (
          <>
            <Link
              to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
              className="text-muted hover:text-text transition-colors"
            >
              {user.role === "ADMIN" ? "Admin" : "Dashboard"}
            </Link>
            <Link to="/progress" className="text-muted hover:text-text transition-colors">Progress</Link>
            <Link to="/profile" className="text-muted hover:text-text transition-colors">Profile</Link>
            <button onClick={handleLogout} className="text-muted hover:text-text transition-colors">
              Log out
            </button>
            <span className="text-xs text-muted hidden sm:inline">{user.email}</span>
          </>
        ) : (
          <>
            <Link to="/login" className="text-muted hover:text-text transition-colors">
              Log in
            </Link>
            <Link to="/register" className="text-accent hover:text-text transition-colors">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
