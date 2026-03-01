import { Link } from 'react-router-dom';

export default function AssignmentCard({ assignment }) {
  return (
    <article className="assignment-card">
      <div className="assignment-card__head">
        <span className={`difficulty difficulty--${(assignment.difficulty || "Medium").toLowerCase()}`}>
          {assignment.difficulty}
        </span>
      </div>
      <h2 className="assignment-card__title">{assignment.title}</h2>
      <p className="assignment-card__description">{assignment.description}</p>
      <Link to={`/assignments/${assignment.id}`} className="btn btn--primary assignment-card__cta">
        Attempt Assignment
      </Link>
    </article>
  );
}
