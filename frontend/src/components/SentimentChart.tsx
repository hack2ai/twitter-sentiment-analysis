"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface SentimentChartProps {
  summary: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
}

const COLORS = {
  positive: '#10b981', // emerald-500
  negative: '#ef4444', // red-500
  neutral: '#6b7280',  // gray-500
};

export function SentimentPieChart({ summary }: SentimentChartProps) {
  const data = [
    { name: 'Positive', value: summary.positive, color: COLORS.positive },
    { name: 'Negative', value: summary.negative, color: COLORS.negative },
    { name: 'Neutral', value: summary.neutral, color: COLORS.neutral },
  ].filter(item => item.value > 0);

  if (data.length === 0) {
      return (
          <div className="flex items-center justify-center h-64 text-gray-400">
              No data to display
          </div>
      )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ConfidenceChartProps {
    results: any[];
}

export function ConfidenceChart({ results }: ConfidenceChartProps) {
    if (!results || results.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                No data to display
            </div>
        )
    }

    // Group confidences into buckets
    const buckets = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const data = [
        { name: '0.0-0.2', count: 0 },
        { name: '0.2-0.4', count: 0 },
        { name: '0.4-0.6', count: 0 },
        { name: '0.6-0.8', count: 0 },
        { name: '0.8-1.0', count: 0 },
    ];

    results.forEach(res => {
        const conf = res.confidence;
        if (conf <= 0.2) data[0].count++;
        else if (conf <= 0.4) data[1].count++;
        else if (conf <= 0.6) data[2].count++;
        else if (conf <= 0.8) data[3].count++;
        else data[4].count++;
    });

    return (
      <div className="h-64 w-full text-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
            <Tooltip 
                cursor={{fill: '#f3f4f6'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
}
