import { Eye, FileText, MessageSquare, TrendingUp, Users, AlertCircle, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DashboardStats, Form, FormSubmission } from '../../types';
import DashboardService from '../../services/dashboard';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<FormSubmission[]>([]);
  const [activeForms, setActiveForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [statsData, submissionsData, formsData] = await Promise.all([
          DashboardService.getStats(),
          DashboardService.getRecentSubmissions(5),
          DashboardService.getActiveForms(10)
        ]);
        
        setStats(statsData);
        setRecentSubmissions(submissionsData);
        setActiveForms(formsData);
      } catch (error) {
        const errorMessage = DashboardService.handleApiError(error);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statsCards = stats ? [
    {
      name: 'Total Forms',
      value: stats.totalForms,
      icon: FileText,
      color: 'bg-blue-500',
      change: '+2',
      changeType: 'positive' as const
    },
    {
      name: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: MessageSquare,
      color: 'bg-green-500',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      name: 'Avg. Submissions',
      value: stats.averageSubmissions,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+5.4%',
      changeType: 'positive' as const
    },
    {
      name: 'Recent Submissions',
      value: stats.recentSubmissions,
      icon: Users,
      color: 'bg-orange-500',
      change: '-2',
      changeType: 'negative' as const
    },
  ] : [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your forms and submissions.</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader size={32} className="animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your forms and submissions.</p>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your forms and submissions.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">from last month</span>
                </div>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Submissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Submissions</h2>
            <p className="text-gray-600 text-sm mt-1">Latest form submissions from users</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{submission.formTitle}</p>
                      <p className="text-sm text-gray-600">{submission.submitterEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(submission.submittedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Forms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Active Forms</h2>
            <p className="text-gray-600 text-sm mt-1">Forms currently accepting submissions</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {activeForms.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{form.title}</p>
                      <p className="text-sm text-gray-600">{form.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Eye size={14} />
                      <span>{form.submission_count || 0}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {form.updated_at ? new Date(form.updated_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}