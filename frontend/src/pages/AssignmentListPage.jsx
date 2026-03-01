import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthPanel from '../components/AuthPanel';
import PageShell from '../components/PageShell';
import { fetchAssignments, getApiError } from '../services/api';

export default function AssignmentListPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDifficulty, setActiveDifficulty] = useState('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    fetchAssignments()
      .then((data) => {
        if (!mounted) return;
        setAssignments(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getApiError(err, 'Failed to load assignments.'));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const groupedAssignments = useMemo(() => {
    const grouped = {
      Easy: [],
      Medium: [],
      Hard: []
    };

    for (const assignment of assignments) {
      const key = grouped[assignment.difficulty] ? assignment.difficulty : 'Medium';
      grouped[key].push(assignment);
    }

    return grouped;
  }, [assignments]);

  const activeAssignments = groupedAssignments[activeDifficulty] || [];
  const activeQuestion = activeAssignments[activeQuestionIndex] || null;

  function openSection(difficulty) {
    if (activeDifficulty === difficulty) {
      setActiveDifficulty('');
      setActiveQuestionIndex(0);
      return;
    }
    setActiveDifficulty(difficulty);
    setActiveQuestionIndex(0);
  }

  function goPrevious() {
    setActiveQuestionIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setActiveQuestionIndex((prev) =>
      Math.min((groupedAssignments[activeDifficulty] || []).length - 1, prev + 1)
    );
  }

  return (
    <PageShell
      title="QueryNest"
      subtitle="Choose one section. When you open it, the question navigator appears below."
    >
      <AuthPanel />
      {loading ? <p className="status">Loading assignments...</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}

      {!loading && !error ? (
        <>
          {assignments.length ? (
            <div className="track-grid">
              {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                <article className={`track-card track-card--${difficulty.toLowerCase()}`} key={difficulty}>
                  <div className="track-card__head">
                    <h2 className="track-card__title">{difficulty} Section</h2>
                    <span className="track-card__count">
                      {groupedAssignments[difficulty].length} Questions
                    </span>
                  </div>
                  <p className="track-card__desc">
                    Open this section to browse questions and solve them one by one.
                  </p>
                  <button
                    className="btn btn--primary track-card__cta"
                    type="button"
                    onClick={() => openSection(difficulty)}
                  >
                    {activeDifficulty === difficulty
                      ? `Hide ${difficulty} Section`
                      : `Open ${difficulty} Section`}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="status">No assignments available yet.</p>
          )}

          {activeDifficulty ? (
            <section className="section-browser panel">
              <div className="question-nav">
                <div className="question-nav__meta">
                  <span className={`difficulty difficulty--${activeDifficulty.toLowerCase()}`}>
                    {activeDifficulty}
                  </span>
                  <span>
                    Question {activeQuestionIndex + 1} of {activeAssignments.length}
                  </span>
                </div>
                <div className="question-nav__actions">
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={goPrevious}
                    disabled={activeQuestionIndex === 0}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn--primary"
                    type="button"
                    onClick={goNext}
                    disabled={activeQuestionIndex === activeAssignments.length - 1}
                  >
                    Next Question
                  </button>
                </div>
                <div className="question-nav__chips">
                  {activeAssignments.map((item, index) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`question-chip ${index === activeQuestionIndex ? 'question-chip--active' : ''}`}
                      onClick={() => setActiveQuestionIndex(index)}
                    >
                      Q{index + 1}
                    </button>
                  ))}
                </div>
              </div>

              {activeQuestion ? (
                <article className="assignment-preview">
                  <h2 className="assignment-preview__title">{activeQuestion.title}</h2>
                  <p className="assignment-preview__question">{activeQuestion.description}</p>
                  <Link
                    className="btn btn--primary assignment-preview__cta"
                    to={`/assignments/${activeQuestion.id}`}
                  >
                    Attempt This Question
                  </Link>
                </article>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
