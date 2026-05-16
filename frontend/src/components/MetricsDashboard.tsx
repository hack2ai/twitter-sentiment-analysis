import React from 'react';
import { Target, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  classes: string[];
}

interface MetricsDashboardProps {
  metrics: Metrics | null;
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  if (!metrics) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center animate-pulse">
        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4" />
        <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto mb-2" />
        <div className="h-3 bg-slate-50 rounded w-1/4 mx-auto" />
      </div>
    );
  }

  const formatPercent = (val: number) => (val * 100).toFixed(1) + '%';

  return (
    <div className="space-y-6">
      {/* Main Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Accuracy" value={formatPercent(metrics.accuracy)} icon={<Target className="text-indigo-500" />} color="indigo" />
        <MetricCard title="Precision" value={formatPercent(metrics.precision)} icon={<CheckCircle className="text-emerald-500" />} color="emerald" />
        <MetricCard title="Recall" value={formatPercent(metrics.recall)} icon={<Activity className="text-blue-500" />} color="blue" />
        <MetricCard title="F1 Score" value={formatPercent(metrics.f1_score)} icon={<AlertTriangle className="text-amber-500" />} color="amber" />
      </div>

      {/* Confusion Matrix */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h4 className="text-sm font-bold text-slate-700 mb-4">Confusion Matrix</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr>
                <th className="p-2 border-b border-slate-100 text-slate-500 font-medium">True \ Predicted</th>
                {metrics.classes.map((c) => (
                  <th key={c} className="p-2 border-b border-slate-100 font-bold capitalize text-slate-700">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.confusion_matrix.map((row, i) => (
                <tr key={i}>
                  <td className="p-3 border-b border-slate-50 font-bold capitalize text-slate-700 text-left">
                    {metrics.classes[i]}
                  </td>
                  {row.map((val, j) => {
                    const maxVal = Math.max(...metrics.confusion_matrix.flat());
                    const intensity = maxVal > 0 ? val / maxVal : 0;
                    return (
                      <td key={j} className="p-3 border-b border-slate-50">
                        <div 
                          className="px-3 py-2 rounded-lg font-mono font-medium mx-auto max-w-[80px]"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${intensity * 0.8 + 0.05})`,
                            color: intensity > 0.5 ? 'white' : '#334155'
                          }}
                        >
                          {val}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  const bgColors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100'
  };

  return (
    <div className={`p-5 rounded-2xl border ${bgColors[color]} flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]`}>
      <div className="mb-2 bg-white p-2 rounded-full shadow-sm">{icon}</div>
      <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
  );
}
