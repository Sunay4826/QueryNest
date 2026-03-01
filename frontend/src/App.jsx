import { Navigate, Route, Routes } from 'react-router-dom';
import AssignmentListPage from './pages/AssignmentListPage';
import AssignmentAttemptPage from './pages/AssignmentAttemptPage';
import DifficultySectionPage from './pages/DifficultySectionPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AssignmentListPage />} />
      <Route path="/sections/:difficulty" element={<DifficultySectionPage />} />
      <Route path="/assignments/:assignmentId" element={<AssignmentAttemptPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
