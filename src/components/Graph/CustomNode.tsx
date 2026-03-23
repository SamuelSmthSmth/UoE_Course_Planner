import { Handle, Position } from 'reactflow';

export const CustomNode = ({ data }: any) => {
  const { code, title, credits, status, isDarkMode } = data;

  // 1. Determine the dynamic Tailwind classes based on Status AND Dark Mode
  let bgClass = '';
  let borderClass = '';
  let textCodeClass = '';
  let textTitleClass = '';

  if (status === 'selected') {
    // The "Green/Teal" selected state
    bgClass = isDarkMode ? 'bg-teal-900/30' : 'bg-teal-50';
    borderClass = isDarkMode ? 'border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.15)]' : 'border-[#003c3c] shadow-md';
    textCodeClass = isDarkMode ? 'text-teal-300' : 'text-[#003c3c]';
    textTitleClass = isDarkMode ? 'text-teal-100' : 'text-teal-900';
    
  } else if (status === 'locked') {
    // The "Greyed out" missing prereqs state
    bgClass = isDarkMode ? 'bg-gray-800/40' : 'bg-gray-50/80';
    borderClass = isDarkMode ? 'border-gray-700 border-dashed' : 'border-gray-200 border-dashed';
    textCodeClass = isDarkMode ? 'text-gray-500' : 'text-gray-400';
    textTitleClass = isDarkMode ? 'text-gray-500' : 'text-gray-400';
    
  } else {
    // The "Available to click" default state
    bgClass = isDarkMode ? 'bg-gray-800' : 'bg-white';
    borderClass = isDarkMode ? 'border-gray-600 hover:border-teal-400 hover:shadow-lg' : 'border-gray-300 hover:border-[#003c3c] hover:shadow-md';
    textCodeClass = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    textTitleClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  }

  return (
    <div className={`w-[220px] rounded-md border-2 p-3 transition-all duration-300 ${bgClass} ${borderClass}`}>
      
      {/* Top Connection Dot */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className={`w-2 h-2 border-none transition-colors ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'}`} 
      />
      
      <div className="flex justify-between items-start mb-1">
        <div className={`font-mono font-bold text-sm ${textCodeClass}`}>
          {code}
        </div>
        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
          {credits} cr
        </div>
      </div>
      
      <div className={`text-xs font-medium leading-tight ${textTitleClass} line-clamp-3`}>
        {title}
      </div>

      {/* The Red Padlock Warning */}
      {status === 'locked' && (
        <div className={`mt-2 text-[10px] font-bold flex items-center gap-1 ${isDarkMode ? 'text-red-400/80' : 'text-red-400'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          Prereqs missing
        </div>
      )}

      {/* Bottom Connection Dot */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={`w-2 h-2 border-none transition-colors ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'}`} 
      />
    </div>
  );
};