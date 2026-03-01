import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { fetchAssignments, getApiError } from '../services/api';

const SUPPORTED_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function DifficultySectionPage() {
  const { difficulty } = useParams();
  const normalizedDifficulty = normalizeDifficulty(difficulty);

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    fetchAssignments()
      .then((data) => {
        if (!mounted) return;
        const filtered = data
          .filter((item) => item.difficulty === normalizedDifficulty)
          .sort((a, b) => a.id - b.id);
        setAssignments(filtered);
        setCurrentIndex(0);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getApiError(err, 'Failed to load section assignments.'));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [normalizedDifficulty]);

  const activeAssignment = useMemo(() => {
    if (!assignments.length) return null;
    return assignments[currentIndex] || assignments[0];
  }, [assignments, currentIndex]);

  function goPrevious() {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setCurrentIndex((prev) => Math.min(assignments.length - 1, prev + 1));
  }

  if (!SUPPORTED_DIFFICULTIES.includes(normalizedDifficulty)) {
    return (
      <PageShell title="Section Not Found" subtitle="Use Easy, Medium, or Hard.">
        <Link className="link-back" to="/">
          Back to sections
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${normalizedDifficulty} Assignment Section`}
      subtitle="Navigate questions in this section and attempt any question."
    >
      <Link className="link-back" to="/">
        Back to sections
      </Link>

      {loading ? <p className="status">Loading section...</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}

      {!loading && !error && assignments.length ? (
        <section className="section-browser panel">
          <div className="question-nav">
            <div className="question-nav__meta">
              <span className={`difficulty difficulty--${normalizedDifficulty.toLowerCase()}`}>
                {normalizedDifficulty}
              </span>
              <span>
                Question {currentIndex + 1} of {assignments.length}
              </span>
            </div>
            <div className="question-nav__actions">
              <button
                className="btn btn--ghost"
                type="button"
                onClick={goPrevious}
                disabled={currentIndex === 0}
              >
                Previous
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={goNext}
                disabled={currentIndex === assignments.length - 1}
              >
                Next Question
              </button>
            </div>
            <div className="question-nav__chips">
              {assignments.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={`question-chip ${index === currentIndex ? 'question-chip--active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  Q{index + 1}
                </button>
              ))}
            </div>
          </div>

          {activeAssignment ? (
            <article className="assignment-preview">
              <h2 className="assignment-preview__title">{activeAssignment.title}</h2>
              <p className="assignment-preview__question">{activeAssignment.question}</p>
              <Link
                className="btn btn--primary assignment-preview__cta"
                to={`/assignments/${activeAssignment.id}`}
              >
                Attempt This Question
              </Link>
            </article>
          ) : null}
        </section>
      ) : null}
    </PageShell>
  );
}

function normalizeDifficulty(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'easy') return 'Easy';
  if (normalized === 'hard') return 'Hard';
  return 'Medium';
}
