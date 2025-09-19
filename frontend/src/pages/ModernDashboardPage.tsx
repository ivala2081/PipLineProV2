import React from 'react';
import ModernDashboard from '../components/modern/ModernDashboard';
import { useAuth } from '../contexts/AuthContext';

const ModernDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return <ModernDashboard user={user || undefined} />;
};

export default ModernDashboardPage;
