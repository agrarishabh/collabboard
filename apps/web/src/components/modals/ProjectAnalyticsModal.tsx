"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { X } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface AnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  };
  tasksByMember: { name: string; count: number }[];
  tasksByColumn: { name: string; count: number }[];
}

export default function ProjectAnalyticsModal({ 
  projectId, 
  projectName, 
  onClose 
}: { 
  projectId: string; 
  projectName: string; 
  onClose: () => void 
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/analytics`, {
          credentials: "include"
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch analytics", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm  animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative bg-bg-primary rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-border-subtle">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle shrink-0">
          <h2 className="text-xl font-bold text-text-primary">
            Analytics: <span className="text-accent">{projectName}</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-bg-surface/50">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-text-secondary p-8 text-center bg-bg-surface rounded-xl border border-border-subtle shadow-sm">
              Failed to load analytics
            </div>
          ) : (
            <div className="space-y-6">
              {/* 3 Number Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-bg-surface p-6 rounded-2xl border border-border-subtle shadow-soft transition-transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total Tasks</h3>
                  <p className="text-4xl font-extrabold text-text-primary mt-2">{data.overview.totalTasks}</p>
                </div>
                <div className="bg-bg-surface p-6 rounded-2xl border border-border-subtle shadow-soft transition-transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Completed</h3>
                  <p className="text-4xl font-extrabold text-green-500 mt-2">{data.overview.completedTasks}</p>
                </div>
                <div className="bg-bg-surface p-6 rounded-2xl border border-border-subtle shadow-soft transition-transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Pending</h3>
                  <p className="text-4xl font-extrabold text-amber-500 mt-2">{data.overview.pendingTasks}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="bg-bg-surface p-6 rounded-2xl border border-border-subtle shadow-soft">
                  <h3 className="text-lg font-bold text-text-primary mb-6">Tasks by Member</h3>
                  <div className="h-75 w-full">
                    {data.tasksByMember.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.tasksByMember}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#353840" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ backgroundColor: '#101114', borderColor: '#34373f', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-text-secondary">No task data available</div>
                    )}
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-bg-surface p-6 rounded-2xl border border-border-subtle shadow-soft">
                  <h3 className="text-lg font-bold text-text-primary mb-6">Tasks by Status</h3>
                  <div className="h-75 w-full">
                    {data.tasksByColumn.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.tasksByColumn}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="count"
                            stroke="none"
                          >
                            {data.tasksByColumn.map((entry, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#101114', borderColor: '#34373f', borderRadius: '8px' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-text-secondary">No status data available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
