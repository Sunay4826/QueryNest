export default function AttemptHistory({ attempts }) {
  if (!attempts?.length) {
    return <p className="panel__empty">No saved attempts yet.</p>;
  }

  return (
    <ul className="attempt-history">
      {attempts.map((item) => (
        <li key={item.id} className="attempt-history__item">
          <div className="attempt-history__meta">
            <span className={`difficulty difficulty--${item.status === 'success' ? 'easy' : 'hard'}`}>
              {item.status}
            </span>
            {item.is_correct === true ? (
              <span className="attempt-history__correct">Correct</span>
            ) : item.is_correct === false ? (
              <span className="attempt-history__wrong">Not yet correct</span>
            ) : null}
            <span>{new Date(item.created_at).toLocaleString()}</span>
          </div>
          <code>{item.sql_query}</code>
          {item.error_message ? <p className="attempt-history__error">{item.error_message}</p> : null}
        </li>
      ))}
    </ul>
  );
}
