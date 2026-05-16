import React from 'react';

interface WordData {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: WordData[];
}

export function WordCloud({ words }: WordCloudProps) {
  if (!words || words.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-slate-400 font-medium">Not enough data for word cloud</p>
      </div>
    );
  }

  // Get max value to scale font sizes
  const maxVal = Math.max(...words.map(w => w.value));
  
  const colors = ['text-indigo-500', 'text-emerald-500', 'text-blue-500', 'text-amber-500', 'text-red-500', 'text-purple-500'];

  return (
    <div className="h-80 w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap items-center justify-center gap-4 overflow-hidden">
      {words.map((word, idx) => {
        // Calculate font size between 0.875rem (14px) and 3.5rem (56px)
        const size = Math.max(0.875, (word.value / maxVal) * 3.5);
        const color = colors[idx % colors.length];
        
        return (
          <span 
            key={idx} 
            className={`${color} font-bold transition-transform hover:scale-110 cursor-default`}
            style={{ fontSize: `${size}rem` }}
            title={`Count: ${word.value}`}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
}
