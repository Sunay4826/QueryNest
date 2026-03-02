import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthPanel from '../components/AuthPanel';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../services/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect') || '/';

  useEffect(() => {
    if (getStoredUser()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  return (
    <PageShell
      className="auth-page"
      title="Login / Signup"
      subtitle="Authenticate to execute and save SQL attempts."
    >
      <Link to={redirectTo} className="link-back">
        Back
      </Link>
      <section className="auth-page__card">
        <AuthPanel
          onAuthChange={(user) => {
            if (user) {
              navigate(redirectTo, { replace: true });
            }
          }}
        />
      </section>
    </PageShell>
  );
}
