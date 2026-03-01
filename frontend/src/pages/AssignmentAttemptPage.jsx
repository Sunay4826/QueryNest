import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import SampleDataViewer from '../components/SampleDataViewer';
import SqlEditorPanel from '../components/SqlEditorPanel';
import ResultTable from '../components/ResultTable';
import AttemptHistory from '../components/AttemptHistory';
import {
  executeQuery,
  fetchAttempts,
  fetchAssignments,
  fetchAssignmentById,
  fetchHint,
  getApiError,
  getStoredUser,
  saveAttempt
} from '../services/api';

export default function AssignmentAttemptPage() {
  const { assignmentId } = useParams();

  const [assignment, setAssignment] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);

  const [sql, setSql] = useState('SELECT * FROM table_name LIMIT 10');
  const [result, setResult] = useState({ columns: [], rows: [], rowCount: 0 });
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([fetchAssignmentById(assignmentId), fetchAssignments()])
      .then(([assignmentData, assignmentList]) => {
        if (!mounted) return;
        setAssignment(assignmentData);
        setAllAssignments(assignmentList);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getApiError(err, 'Failed to load assignment.'));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [assignmentId]);

  useEffect(() => {
    if (!assignment) return;
    const firstTable = assignment.sampleData?.[0]?.tableName || 'table_name';
    setSql(`SELECT * FROM ${firstTable} LIMIT 10`);
    setResult({ columns: [], rows: [], rowCount: 0 });
    setHint('');
  }, [assignment]);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, [assignmentId]);

  useEffect(() => {
    if (!currentUser) {
      setAttempts([]);
      return;
    }

    fetchAttempts(Number(assignmentId))
      .then((data) => {
        setAttempts(data);
      })
      .catch(() => {
        setAttempts([]);
      });
  }, [assignmentId, currentUser]);

  async function handleExecute() {
    try {
      setLoadingQuery(true);
      setError('');
      const response = await executeQuery({
        assignmentId: Number(assignmentId),
        sql
      });
      setResult(response);
      if (currentUser) {
        const saved = await saveAttempt({
          assignmentId: Number(assignmentId),
          sql,
          status: 'success',
          errorMessage: null
        });
        setAttempts((prev) => [saved, ...prev].slice(0, 20));
      }
    } catch (err) {
      const message = getApiError(err, 'Failed to execute query.');
      setError(message);
      setResult({ columns: [], rows: [], rowCount: 0 });
      if (currentUser) {
        try {
          const saved = await saveAttempt({
            assignmentId: Number(assignmentId),
            sql,
            status: 'error',
            errorMessage: message
          });
          setAttempts((prev) => [saved, ...prev].slice(0, 20));
        } catch {
          // Non-blocking: query execution feedback should still be shown.
        }
      }
    } finally {
      setLoadingQuery(false);
    }
  }

  async function handleHint() {
    try {
      setLoadingHint(true);
      setError('');
      const response = await fetchHint({
        assignmentId: Number(assignmentId),
        sql
      });
      setHint(response.hint);
    } catch (err) {
      setError(getApiError(err, 'Failed to get hint.'));
    } finally {
      setLoadingHint(false);
    }
  }

  const sameDifficultyAssignments = useMemo(() => {
    if (!assignment) return [];
    return allAssignments
      .filter((item) => item.difficulty === assignment.difficulty)
      .sort((a, b) => a.id - b.id);
  }, [allAssignments, assignment]);

  const currentIndex = useMemo(() => {
    if (!assignment) return -1;
    return sameDifficultyAssignments.findIndex((item) => item.id === assignment.id);
  }, [sameDifficultyAssignments, assignment]);

  const previousAssignment =
    currentIndex > 0 ? sameDifficultyAssignments[currentIndex - 1] : null;
  const nextAssignment =
    currentIndex >= 0 && currentIndex < sameDifficultyAssignments.length - 1
      ? sameDifficultyAssignments[currentIndex + 1]
      : null;

  return (
    <PageShell title={assignment?.title || 'Assignment'} subtitle="Write SQL and validate your understanding.">
      <Link to="/" className="link-back">
        Back to assignments
      </Link>

      {loading ? <p className="status">Loading assignment...</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}

      {!loading && assignment ? (
        <section className="attempt-layout">
          <article className="panel">
            <h2 className="panel__title">Question</h2>
            <div className="question-nav">
              <div className="question-nav__meta">
                <span className={`difficulty difficulty--${assignment.difficulty.toLowerCase()}`}>
                  {assignment.difficulty}
                </span>
                <span>
                  Question {currentIndex + 1} of {sameDifficultyAssignments.length}
                </span>
              </div>
              <div className="question-nav__actions">
                {previousAssignment ? (
                  <Link className="btn btn--ghost" to={`/assignments/${previousAssignment.id}`}>
                    Previous
                  </Link>
                ) : null}
                {nextAssignment ? (
                  <Link className="btn btn--primary" to={`/assignments/${nextAssignment.id}`}>
                    Next Question
                  </Link>
                ) : null}
              </div>
              <div className="question-nav__chips">
                {sameDifficultyAssignments.map((item, index) => (
                  <Link
                    key={item.id}
                    to={`/assignments/${item.id}`}
                    className={`question-chip ${item.id === assignment.id ? 'question-chip--active' : ''}`}
                  >
                    Q{index + 1}
                  </Link>
                ))}
              </div>
            </div>
            <p>{assignment.question}</p>
          </article>

          <article className="panel">
            <h2 className="panel__title">Sample Data</h2>
            <SampleDataViewer sampleData={assignment.sampleData} />
          </article>

          <article className="panel">
            <h2 className="panel__title">SQL Editor</h2>
            <SqlEditorPanel
              value={sql}
              onChange={setSql}
              onExecute={handleExecute}
              onHint={handleHint}
              loadingQuery={loadingQuery}
              loadingHint={loadingHint}
            />
          </article>

          <article className="panel">
            <h2 className="panel__title">Results</h2>
            <ResultTable columns={result.columns} rows={result.rows} rowCount={result.rowCount} />
          </article>

          <article className="panel">
            <h2 className="panel__title">Hint</h2>
            {hint ? <p className="hint-text">{hint}</p> : <p className="panel__empty">Click "Get Hint" for guidance.</p>}
          </article>

          <article className="panel">
            <h2 className="panel__title">Your Attempts</h2>
            {currentUser ? (
              <AttemptHistory attempts={attempts} />
            ) : (
              <p className="panel__empty">Login to save and view attempt history.</p>
            )}
          </article>
        </section>
      ) : null}
    </PageShell>
  );
}
