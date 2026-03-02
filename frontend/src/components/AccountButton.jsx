import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAttemptSummary, getApiError, getStoredUser, logout } from '../services/api';

export default function AccountButton({ totalQuestions }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [doneCount, setDoneCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (!open || !user) return;

    fetchAttemptSummary()
      .then((data) => {
        setDoneCount(data.doneCount || 0);
        setError('');
      })
      .catch((err) => {
        setError(getApiError(err, 'Could not load account summary.'));
      });
  }, [open, user]);

  const growthPercent = useMemo(() => {
    if (!totalQuestions) return 0;
    return Math.round((doneCount / totalQuestions) * 100);
  }, [doneCount, totalQuestions]);

  if (!user) {
    return (
      <div className="account-box">
        <Link className="btn btn--ghost" to="/auth?redirect=/">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="account-box">
      <button className="btn btn--ghost" type="button" onClick={() => setOpen((v) => !v)}>
        Account
      </button>

      {open ? (
        <section className="account-box__panel">
          <p className="account-box__name">{user.name}</p>
          <p className="account-box__email">{user.email}</p>
          <p className="account-box__metric">
            Questions Done: {doneCount}/{totalQuestions || 0}
          </p>
          <p className="account-box__metric">Growth: {growthPercent}%</p>
          <div className="account-box__progress" aria-hidden="true">
            <span style={{ width: `${growthPercent}%` }} />
          </div>
          {error ? <p className="status status--error">{error}</p> : null}
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => {
              logout();
              setOpen(false);
              navigate('/');
              window.location.reload();
            }}
          >
            Logout
          </button>
        </section>
      ) : null}
    </div>
  );
}
