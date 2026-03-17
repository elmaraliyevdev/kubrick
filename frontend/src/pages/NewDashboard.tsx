import { useDashboardAnalytics, useQuickStats, useRecentCandidates } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: quickStats, isLoading: statsLoading } = useQuickStats();
  const { data: recentCandidates, isLoading: candidatesLoading } = useRecentCandidates(5);

  if (analyticsLoading || statsLoading) {
    return (
      <div className="p-6 space-y-8">
        <div className="h-6 w-48 bg-gray-100 rounded" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 border border-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = analytics?.metrics;
  const stats = quickStats;

  const statItems = [
    {
      label: 'Total Candidates',
      value: stats?.total_candidates?.toString() || '0',
    },
    {
      label: 'Active Jobs',
      value: metrics?.job_metrics.active_jobs?.toString() || '0',
    },
    {
      label: 'Match Rate',
      value: `${stats?.match_success_rate?.toFixed(1) || 0}%`,
    },
    {
      label: 'Pending Reviews',
      value: stats?.pending_applications?.toString() || '0',
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Welcome */}
      <div className="mb-8">
        <p className="text-lg font-medium text-gray-900">
          Welcome back, {user?.first_name || 'User'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Here's an overview of your hiring pipeline.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <p className="text-sm text-gray-500 mb-1">{item.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Candidates */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-4">Recent candidates</p>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {candidatesLoading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : recentCandidates && recentCandidates.length > 0 ? (
            <div>
              {recentCandidates.map((candidate, idx) => (
                <div
                  key={candidate.id}
                  className={`flex items-center justify-between py-3 ${
                    idx < recentCandidates.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-900">
                      {candidate.first_name} {candidate.last_name}
                    </span>
                    <span className="text-sm text-gray-500">{candidate.email}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(candidate.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No recent candidates</p>
          )}
        </div>
      </div>
    </div>
  );
}
