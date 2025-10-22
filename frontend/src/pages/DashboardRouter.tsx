import React from 'react';
import DashboardBuyer from './DashboardBuyer';
import DashboardSeller from './DashboardSeller';
import DashboardLogistics from './DashboardLogistics';
import DashboardColdStorage from './DashboardColdStorage';
import DashboardInsurance from './DashboardInsurance';
import DashboardAdmin from './DashboardAdmin';
import DashboardDriver from './DashboardDriver';

// Define error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, fallback: React.ReactNode },
  { hasError: boolean, error: Error | null }
> {
  constructor(props: { children: React.ReactNode, fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by dashboard boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// role: 'buyer' | 'seller' | 'logistics' | 'coldstorage' | 'insurance' | 'admin' | 'driver'
const DashboardRouter: React.FC<{ role: string; onLogout?: () => void }> = ({ role, onLogout }) => {
  const renderDashboard = () => {
    if (role === 'admin') return <DashboardAdmin onLogout={onLogout!} />;
    if (role === 'buyer') return <DashboardBuyer onLogout={onLogout!} />;
    if (role === 'seller') return <DashboardSeller onLogout={onLogout!} />;
    if (role === 'logistics') return <DashboardLogistics onLogout={onLogout!} />;
    if (role === 'coldstorage') return <DashboardColdStorage onLogout={onLogout!} />;
    if (role === 'insurance') return <DashboardInsurance onLogout={onLogout!} />;
    if (role === 'driver') return <DashboardDriver onLogout={onLogout!} />;
    return <div style={{ padding: '20px' }}>Unknown role: {role}</div>;
  };

  const errorFallback = (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Dashboard Error</h2>
      <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
        <h3>Error Loading Dashboard</h3>
        <p>There was a problem loading the dashboard. Please try refreshing the page or contact support.</p>
      </div>
      {onLogout && (
        <button 
          onClick={onLogout}
          style={{
            padding: '10px 15px', 
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      )}
    </div>
  );

  return (
    <ErrorBoundary fallback={errorFallback}>
      {renderDashboard()}
    </ErrorBoundary>
  );
};

export default DashboardRouter;
