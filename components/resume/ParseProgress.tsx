import React from 'react';
import { Loader2, FileUp, Cpu, CheckCircle2 } from 'lucide-react';

export type ParseStage = 'uploading' | 'parsing' | 'mapping' | 'complete' | 'error';

interface ParseProgressProps {
  stage: ParseStage;
  error?: string;
}

const ParseProgress: React.FC<ParseProgressProps> = ({ stage, error }) => {
  const stages = [
    { id: 'uploading', label: 'Uploading Resume', icon: <FileUp size={20} /> },
    { id: 'parsing', label: 'Extracting Information', icon: <Cpu size={20} /> },
    { id: 'mapping', label: 'Mapping to Profile', icon: <Loader2 size={20} /> },
  ];

  const getStageStatus = (stageId: string) => {
    const currentIndex = stages.findIndex(s => s.id === stage);
    const stageIndex = stages.findIndex(s => s.id === stageId);

    if (stage === 'error' && stageId === 'parsing') return 'error';
    if (stage === 'complete' || stageIndex < currentIndex) return 'completed';
    if (stage === stageId) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full max-w-lg mx-auto py-12 px-6 bg-white rounded-2xl shadow-xl border border-blue-50">
      <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center italic">
        Processing your Resume...
      </h2>

      <div className="space-y-6">
        {stages.map((s) => {
          const status = getStageStatus(s.id);
          return (
            <div key={s.id} className="flex items-center gap-4 group">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500
                ${status === 'completed' ? 'bg-green-100 text-green-600 scale-110' : ''}
                ${status === 'active' ? 'bg-blue-600 text-white shadow-lg animate-pulse' : ''}
                ${status === 'pending' ? 'bg-gray-100 text-gray-400' : ''}
                ${status === 'error' ? 'bg-red-100 text-red-600' : ''}
              `}>
                {status === 'completed' ? <CheckCircle2 size={20} /> : (
                  status === 'active' && s.id === 'mapping' ? <Loader2 size={20} className="animate-spin" /> : s.icon
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-semibold ${status === 'active' ? 'text-blue-600' : 'text-gray-600'}`}>
                    {s.label}
                  </span>
                  {status === 'active' && (
                    <span className="text-xs font-mono text-blue-500 animate-pulse">Processing...</span>
                  )}
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`
                    h-full transition-all duration-1000 ease-out
                    ${status === 'completed' ? 'w-full bg-green-500' : ''}
                    ${status === 'active' ? 'w-1/2 bg-blue-500' : 'w-0'}
                    ${status === 'error' ? 'w-full bg-red-500' : ''}
                  `} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stage === 'error' && (
        <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-center">
          <p className="font-semibold">{error || 'Something went wrong during parsing.'}</p>
          <button 
             onClick={() => window.location.reload()} 
             className="mt-2 text-sm underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      <p className="mt-8 text-sm text-gray-400 text-center">
        This usually takes less than 10 seconds.
      </p>
    </div>
  );
};

export default ParseProgress;
