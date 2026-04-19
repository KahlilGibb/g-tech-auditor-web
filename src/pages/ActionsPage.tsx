import React from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { useActions } from '../hooks/useActions';
import { cn } from '../utils/cn';
import { SkeletonRow } from '../components/ui/SkeletonLoader';

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const colors = {
    High: "bg-danger-red/10 text-danger-red border-danger-red/20",
    Medium: "bg-warning-amber/10 text-warning-amber border-warning-amber/20",
    Low: "bg-success-green/10 text-success-green border-success-green/20",
  };
  
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-xs font-bold border",
      colors[priority as keyof typeof colors] || "bg-secondary text-muted-foreground"
    )}>
      {priority}
    </span>
  );
};

const StatusBadge: React.FC<{ statusId: string; label: string }> = ({ statusId, label }) => {
  const icons = {
    todo: AlertCircle,
    in_progress: Clock,
    completed: CheckCircle2,
    cancelled: XCircle,
  };
  const Icon = icons[statusId as keyof typeof icons] || AlertCircle;
  
  const colors = {
    todo: "bg-secondary text-muted-foreground",
    in_progress: "bg-primary-blue/10 text-primary-blue",
    completed: "bg-success-green/10 text-success-green",
    cancelled: "bg-danger-red/10 text-danger-red",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
      colors[statusId as keyof typeof colors]
    )}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
};

const ActionsPage: React.FC = () => {
  const { actions, workflowStatuses, isLoading, error } = useActions();

  const getStatusLabel = (id: string) => {
    return workflowStatuses.find(s => s.id === id)?.label || id;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Actions</h1>
          <p className="text-muted-foreground mt-1">Manage and track all corrective actions.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-blue text-white rounded-xl font-bold hover:bg-primary-blue-dark transition-all shadow-md shadow-primary-blue/20">
          <Plus className="w-5 h-5" />
          Create Action
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search actions by title, code, or assignee..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-divider rounded-xl text-sm font-semibold text-foreground hover:bg-surface transition-all">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger-red/10 border border-danger-red/20 text-danger-red rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-divider">
              <tr>
                <th className="px-6 py-4">Action Details</th>
                <th className="px-6 py-4">Source & Site</th>
                <th className="px-6 py-4">Assignee</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading && actions.length === 0 ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                actions.map((action) => (
                  <tr key={action.id} className="hover:bg-surface/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-secondary rounded-lg">
                          <CheckSquare className="w-5 h-5 text-primary-blue" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm leading-tight">{action.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">#{action.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-foreground flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          {action.source}
                        </p>
                        {action.site && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 ml-0.5">
                            <MapPin className="w-3 h-3" />
                            {action.site}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary-blue border border-divider">
                          {action.assignee.charAt(0)}
                        </div>
                        <span className="text-sm text-foreground">{action.assignee}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge 
                        statusId={action.workflowStatusId} 
                        label={getStatusLabel(action.workflowStatusId)} 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={action.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                        <Calendar className="w-4 h-4" />
                        {new Date(action.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 hover:bg-surface rounded-lg text-muted-foreground transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && actions.length === 0 && (
          <div className="py-20 text-center">
            <CheckSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">No actions found</h3>
            <p className="text-muted-foreground">Adjust your filters or create a new action.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionsPage;
