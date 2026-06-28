import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Mail, Phone, Briefcase, MapPin, Calendar, 
  Activity, CheckCircle, FileText, ChevronRight 
} from 'lucide-react';

interface EmployeeDetailDrawerProps {
  employee: any;
  onClose: () => void;
}

export default function EmployeeDetailDrawer({ employee, onClose }: EmployeeDetailDrawerProps) {
  if (!employee) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-gold overflow-hidden">
                {employee.photoUrl ? (
                  <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-full h-full p-3 text-slate-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{employee.name}</h2>
                <p className="text-sm text-gold font-semibold">{employee.designation || 'Staff'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    employee.status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                    employee.status === 'OnLeave' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                    'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                  }`}>
                    {employee.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ID: {employee.employeeId || 'N/A'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Department</span>
                </div>
                <p className="text-xs text-slate-200 font-semibold">{employee.departmentName || 'N/A'}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Property</span>
                </div>
                <p className="text-xs text-slate-200 font-semibold">{employee.hotelName || employee.hotelCode || 'N/A'}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
                </div>
                <p className="text-xs text-slate-200 font-semibold truncate" title={employee.email}>{employee.email}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Phone</span>
                </div>
                <p className="text-xs text-slate-200 font-semibold">{employee.phone || 'N/A'}</p>
              </div>
            </div>

            {/* Management Links */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Management Actions</h3>
              
              {[
                { title: 'View Attendance', icon: Calendar, color: 'text-blue-400' },
                { title: 'Assign Tasks', icon: CheckCircle, color: 'text-green-400' },
                { title: 'Leave Requests', icon: FileText, color: 'text-amber-400' },
                { title: 'Performance & Reports', icon: Activity, color: 'text-purple-400' },
              ].map((action, idx) => (
                <button 
                  key={idx}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-900/30 hover:bg-slate-800/60 border border-slate-800/50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${action.color}`}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white">{action.title}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-gold transition-colors" />
                </button>
              ))}
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
