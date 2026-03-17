import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { logout } from '@/store/authSlice';

export function SimpleLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'candidates', label: 'Candidates', path: '/candidates' },
    { id: 'jobs', label: 'Jobs', path: '/jobs' },
    { id: 'analytics', label: 'Analytics', path: '/analytics' },
    { id: 'settings', label: 'Settings', path: '/settings/profile' },
  ];

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email?.split('@')[0] || 'User';

  const displayEmail = user?.email || '';

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <span className="text-gray-900 font-semibold text-base">Kubrick</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          {navigation.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`block px-6 py-2 text-sm transition-colors ${
                  active
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-6 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-900">{displayName}</div>
          <div className="text-xs text-gray-500 mt-0.5">{displayEmail}</div>
          <button
            onClick={handleLogout}
            className="mt-3 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-10">
        <Outlet />
      </main>
    </div>
  );
}
