import React from 'react';
import { 
  ClipboardCheck, 
  AlertCircle, 
  Users, 
  TrendingUp,
  MoreVertical,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useDashboard } from '../hooks/useDashboard';
import SkeletonCard, { SkeletonRow } from '../components/ui/SkeletonLoader';

const StatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  change: string; 
  icon: React.ElementType; 
  trend: 'up' | 'down';
  iconColor: string;
}> = ({ label, value, change, icon: Icon, trend, iconColor }) => (
  <div className="bg-white p-6 rounded-3xl border border-divider shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", iconColor)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <button className="text-muted-foreground hover:bg-surface p-1 rounded-lg">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          trend === 'up' || change.startsWith('+') ? "bg-success-green/10 text-success-green" : "bg-danger-red/10 text-danger-red"
        )}>
          {change}
        </span>
      </div>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const { inspections, stats, isLoading, error, refresh } = useDashboard();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Good morning! Here's what's happening with your audits today.</p>
        </div>
        <button 
          onClick={() => refresh()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-divider rounded-xl text-sm font-semibold text-foreground hover:bg-surface transition-all disabled:opacity-50"
        >
          <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger-red/10 border border-danger-red/20 text-danger-red rounded-2xl flex justify-between items-center">
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => refresh()} className="text-sm font-bold underline underline-offset-4">Try again</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading && !stats ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          stats && (
            <>
              <StatCard 
                label="Total Inspections" 
                value={stats.totalInspections} 
                change={stats.totalInspectionsChange} 
                trend="up" 
                icon={ClipboardCheck} 
                iconColor="bg-primary-blue"
              />
              <StatCard 
                label="Active Issues" 
                value={stats.activeIssues} 
                change={stats.activeIssuesChange} 
                trend="down" 
                icon={AlertCircle} 
                iconColor="bg-warning-amber"
              />
              <StatCard 
                label="Auditors Online" 
                value={stats.auditorsOnline} 
                change={stats.auditorsOnlineChange} 
                trend="up" 
                icon={Users} 
                iconColor="bg-success-green"
              />
              <StatCard 
                label="Avg. Compliance" 
                value={stats.avgCompliance} 
                change={stats.avgComplianceChange} 
                trend="up" 
                icon={TrendingUp} 
                iconColor="bg-primary-blue-dark"
              />
            </>
          )
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-divider flex justify-between items-center">
          <h2 className="text-lg font-bold text-foreground">Recent Inspections</h2>
          <button className="text-sm font-semibold text-primary-blue hover:text-primary-blue-dark">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Inspection</th>
                <th className="px-6 py-4">Auditor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading && inspections.length === 0 ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                inspections.map((item) => (
                  <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{item.assignee}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        item.status === 'Complete' && "bg-success-green/10 text-success-green",
                        item.status === 'In Progress' && "bg-primary-blue/10 text-primary-blue",
                        item.status === 'Overdue' && "bg-danger-red/10 text-danger-red"
                      )}>
                        {item.status === 'Complete' && <CheckCircle2 className="w-3 h-3" />}
                        {item.status === 'In Progress' && <Clock className="w-3 h-3" />}
                        {item.status === 'Overdue' && <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground truncate max-w-[150px]">{item.site}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "font-bold",
                        !item.score ? "text-muted-foreground" : 
                        parseInt(item.score) >= 90 ? "text-success-green" : "text-foreground"
                      )}>
                        {item.score || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
