import { Navigate, Outlet } from 'react-router';
import { useAuth, UserRole } from '../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If the user has no profile record, they cannot use the application properly.
  // We've already passed `if (loading)`, so the profile fetch has failed or returned nothing.
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-50 text-red-500 mb-2">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>Profile Not Found</h2>
          <p className="text-sm text-gray-500 mb-2" style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
            We couldn't load your user profile. This might indicate an incomplete registration or a temporary database issue.
          </p>
          <button 
            onClick={signOut}
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Role check: redirect unauthorized users to the purchases page (accessible to all roles)
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/purchases/new" replace />;
  }

  return <Outlet />;
}
