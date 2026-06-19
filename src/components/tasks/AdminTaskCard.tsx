'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

interface AdminTaskCardProps {
  initialTask: any;
}

export default function AdminTaskCard({ initialTask }: AdminTaskCardProps) {
  const [task, setTask] = useState<any>(initialTask);

  useEffect(() => {
    // Basic Socket connection for the card component
    const socket = io({ path: '/api/socket' }); 
    
    socket.emit('join_room', { role: 'ROOT_ADMIN' });

    socket.on('task_status_updated', (data) => {
      if (data.taskId === task._id) {
        setTask(data.task);
      }
    });

    return () => { socket.disconnect(); };
  }, [task._id]);

  const statusStyles: any = {
    Pending: 'bg-slate-100 text-slate-600',
    To_Do: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    In_Progress: 'bg-blue-50 text-blue-700 border-blue-200',
    On_Hold: 'bg-orange-50 text-orange-700 border-orange-200',
    Completed: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 flex flex-col lg:flex-row gap-8">
      
      {/* Left Column: Details */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{task.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{task.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[task.status] || statusStyles.Pending}`}>
            ● {task.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
          <div><span className="text-slate-400">Priority:</span> <span className="font-bold">{task.priority}</span></div>
          <div><span className="text-slate-400">Health Score:</span> <span className="font-bold">{task.healthScore || 100}%</span></div>
          
          {task.latestRemark && (
            <div className="col-span-2 mt-2">
              <span className="text-xs text-slate-400">Latest Update:</span> <br/>
              <span className="italic text-slate-700 dark:text-slate-300">"{task.latestRemark}"</span>
            </div>
          )}
          {task.holdReason && task.status === 'On_Hold' && (
            <div className="col-span-2 bg-orange-50 p-2 rounded text-orange-800 border border-orange-100">
              <span className="font-bold text-xs">Hold Reason:</span> {task.holdReason}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Timeline */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-6 lg:pt-0 lg:pl-6">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">Activity Timeline</h3>
        
        <div className="space-y-4">
          {task.taskHistory?.length > 0 ? task.taskHistory.map((history: any, idx: number) => (
            <div key={idx} className="relative flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 z-10"></div>
                {idx !== task.taskHistory.length - 1 && <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 my-1"></div>}
              </div>
              <div className="pb-3 w-full">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-800 dark:text-white">{history.action}</span>
                  <span className="text-[10px] text-slate-400">{new Date(history.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                {history.remark && <p className="text-xs text-slate-500 italic mt-0.5">"{history.remark}"</p>}
                <p className="text-[10px] text-slate-400 mt-1">by {history.userName}</p>
              </div>
            </div>
          )) : (
            <p className="text-xs text-slate-500">No timeline data available yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}