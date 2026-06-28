'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { 
  ZoomIn, ZoomOut, Maximize, Search, Minus, Plus, Users, 
  MapPin, Briefcase, Mail, Phone, Calendar, ChevronDown, ChevronUp, User,
  RefreshCcw, AlertTriangle, Building2, Crown, LayoutGrid
} from 'lucide-react';
import EmployeeDetailDrawer from './EmployeeDetailDrawer';

export default function EnterpriseHierarchyView() {
  const [rawApiTree, setRawApiTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Viewport states
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Search and expand states
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Detail Drawer state
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hierarchy/tree-v2');
      if (res?.data?.tree) {
        setRawApiTree(res.data.tree);
        
        const initialExpanded = new Set<string>();
        initialExpanded.add('root-staff');
        setExpandedNodes(initialExpanded);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load hierarchy tree');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // TREE TRANSFORMATION LOGIC
  // -------------------------
  
  const getSubtreeStats = (children: any[]) => {
    let managers = 0;
    let employees = 0;

    const traverse = (node: any) => {
      // Very basic heuristic for manager vs employee if role isn't explicitly MANAGER
      const isManager = (node.role && node.role.includes('MANAGER')) || (node.children && node.children.length > 0);
      if (isManager) managers++;
      else employees++;
      
      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    children.forEach(traverse);
    return { managers, employees, total: managers + employees };
  };

  const treeData = useMemo(() => {
    const buckets: any[] = [];
    
    // Default permanent departments map
    const defaultDepts = ['Central Team', 'Sales Office Team', 'Property Team', 'IT Team', 'Other'];
    const deptMap = new Map<string, any>();

    // Initialize all default departments so they always show up
    defaultDepts.forEach(name => {
      const b = { id: `dept-${name.toLowerCase().replace(/\s+/g, '-')}`, name, isBucket: true, children: [] as any[], stats: { managers: 0, employees: 0, total: 0 } };
      deptMap.set(name, b);
      buckets.push(b);
    });

    if (rawApiTree && rawApiTree.length > 0) {
      rawApiTree.forEach((root: any) => {
        const deptName = root.departmentName || 'Other';
        let targetBucket = deptMap.get(deptName);
        
        // If department doesn't exactly match the 4 specific ones, throw them in 'Other'
        if (!targetBucket) {
          targetBucket = deptMap.get('Other');
        }
        
        if (targetBucket) {
          targetBucket.children.push(root);
        }
      });
    }

    // Calculate dynamic live counts for each bucket
    buckets.forEach(b => {
      b.stats = getSubtreeStats(b.children);
    });

    const rootNode = {
      id: 'root-staff',
      name: 'OXY HOTELS STAFF',
      isRoot: true,
      children: buckets
    };

    return [rootNode];
  }, [rawApiTree]);

  // -------------------------
  // SEARCH & AUTO-EXPAND LOGIC
  // -------------------------
  
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const query = searchQuery.toLowerCase();
      const newExpanded = new Set<string>(expandedNodes);
      
      const searchTraverse = (node: any): boolean => {
        let isMatch = false;
        
        if (!node.isBucket && !node.isRoot) {
          isMatch = (
            (node.name && node.name.toLowerCase().includes(query)) ||
            (node.employeeId && node.employeeId.toLowerCase().includes(query)) ||
            (node.departmentName && node.departmentName.toLowerCase().includes(query)) ||
            (node.phone && node.phone.toLowerCase().includes(query))
          );
        }

        let childMatched = false;
        if (node.children) {
          node.children.forEach((child: any) => {
            if (searchTraverse(child)) {
              childMatched = true;
            }
          });
        }

        if (childMatched || isMatch) {
          newExpanded.add(node.id);
          return true;
        }
        return false;
      };

      treeData.forEach(root => searchTraverse(root));
      setExpandedNodes(newExpanded);
    }
  }, [searchQuery, treeData]);

  // -------------------------
  // VIEWPORT HANDLERS
  // -------------------------

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * zoomFactor, 0.2), 3));
    } else {
      setPosition(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || (e.target as Element).closest('button') || (e.target as Element).closest('.no-drag')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const traverse = (node: any) => {
      allIds.add(node.id);
      if (node.children) node.children.forEach(traverse);
    };
    treeData.forEach(traverse);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root-staff']));
  };

  // -------------------------
  // RENDERERS
  // -------------------------

  const renderNode = (node: any, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    // Check search match
    let isMatched = false;
    if (searchQuery && !node.isRoot && !node.isBucket) {
      const q = searchQuery.toLowerCase();
      isMatched = (
        (node.name && node.name.toLowerCase().includes(q)) || 
        (node.employeeId && node.employeeId.toLowerCase().includes(q)) ||
        (node.phone && node.phone.toLowerCase().includes(q))
      );
    }

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node UI based on type */}
        <div className="relative group no-drag">
          {node.isRoot ? (
            // OXY HOTELS STAFF - Master Root Node
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-72 rounded-2xl border-2 border-gold/30 bg-gradient-to-b from-slate-900 to-slate-950 backdrop-blur-xl shadow-2xl shadow-gold/10 p-5 flex flex-col items-center cursor-pointer transition-all hover:border-gold hover:shadow-gold/20"
              onClick={(e) => toggleExpand(node.id, e)}
            >
              <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mb-3 border border-gold/20">
                <Crown className="w-8 h-8 text-gold" />
              </div>
              <h2 className="text-lg font-black text-white tracking-widest text-center">{node.name}</h2>
              <div className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Master Directory</div>
            </motion.div>
          ) : node.isBucket ? (
            // 5 Default Department Buckets
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-64 rounded-xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-md shadow-xl cursor-pointer hover:bg-slate-700/80 transition-all group overflow-hidden"
              onClick={(e) => toggleExpand(node.id, e)}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-900/50 flex items-center justify-center mb-3 border border-slate-700">
                  <LayoutGrid className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-bold text-base text-white mb-4">{node.name}</h3>
                
                <div className="w-full grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-900/60 rounded-lg p-2 flex flex-col">
                    <span className="text-slate-400 mb-0.5">Managers</span>
                    <span className="font-semibold text-white text-sm">{node.stats.managers}</span>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2 flex flex-col">
                    <span className="text-slate-400 mb-0.5">Employees</span>
                    <span className="font-semibold text-white text-sm">{node.stats.employees}</span>
                  </div>
                </div>
                <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-lg py-2 flex items-center justify-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-blue-400">{node.stats.total} Members</span>
                </div>
              </div>
            </motion.div>
          ) : (
            // Standard User Node
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative w-[280px] rounded-xl border backdrop-blur-xl shadow-xl transition-all cursor-pointer ${
                isMatched ? 'border-gold bg-gold/10 shadow-gold/20 scale-105 z-10' : 'border-slate-700/50 bg-slate-900/80 hover:border-blue-500/50 hover:bg-slate-800/90'
              }`}
              onClick={() => setSelectedEmployee(node)}
            >
              {/* Status Indicator */}
              <div className="absolute -top-1.5 -right-1.5 flex items-center bg-slate-900 border border-slate-700 rounded-full pr-2 pl-1 py-1 z-10 shadow-md">
                <div className={`w-2.5 h-2.5 rounded-full mr-1.5 ${
                  node.status === 'Active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                  node.status === 'OnLeave' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 
                  node.status === 'Working' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                  'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                }`} />
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">{node.status || 'Offline'}</span>
              </div>

              <div className="p-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-[3px] border-slate-700 overflow-hidden mb-3 relative">
                  {node.photoUrl ? (
                    <img src={node.photoUrl} alt={node.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-3 text-slate-400" />
                  )}
                </div>
                
                <h3 className="text-base font-bold text-white mb-0.5 truncate w-full">{node.name}</h3>
                <p className="text-xs text-gold font-semibold mb-3 truncate w-full">{node.designation || 'Staff'}</p>
                
                <div className="w-full space-y-2 mt-1 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <div className="flex items-center text-slate-400">
                      <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                      <span>Dept:</span>
                    </div>
                    <span className="font-medium truncate max-w-[120px]">{node.departmentName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <div className="flex items-center text-slate-400">
                      <Building2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Property:</span>
                    </div>
                    <span className="font-medium truncate max-w-[120px]">{node.hotelName || node.hotelCode || 'Central'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <div className="flex items-center text-slate-400">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      <span>Emp ID:</span>
                    </div>
                    <span className="font-mono font-medium">{node.employeeId || '---'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {hasChildren && (
            <button 
              onClick={(e) => toggleExpand(node.id, e)}
              className={`absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full p-1.5 transition-colors z-20 shadow-xl ${
                isExpanded 
                  ? 'bg-slate-700 border-2 border-slate-600 text-white hover:bg-slate-600' 
                  : 'bg-blue-600 border-2 border-blue-500 text-white hover:bg-blue-500 shadow-blue-500/30'
              }`}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Children Tree rendering */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col items-center pt-8 relative w-full"
            >
              {/* Vertical line from parent */}
              <div className="absolute top-0 w-[2px] h-8 bg-slate-600/60" />
              
              <div className="flex gap-10 relative px-4">
                {/* Horizontal connector line for multiple children */}
                {node.children.length > 1 && (
                  <div className="absolute top-0 left-0 w-full h-[2px]">
                    <div className="absolute left-[calc(5%)] right-[calc(5%)] top-0 h-[2px] bg-slate-600/60" />
                  </div>
                )}
                
                {node.children.map((child: any, idx: number) => (
                  <div key={child.id} className="relative pt-8">
                    {/* Vertical line descending to child */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-8 bg-slate-600/60" />
                    {renderNode(child, depth + 1)}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-5 bg-slate-900/50 p-8 rounded-2xl backdrop-blur-md border border-slate-800">
          <div className="w-14 h-14 rounded-full border-4 border-slate-700 border-t-gold animate-spin shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
          <p className="text-slate-300 font-medium tracking-wide">Constructing Enterprise Hierarchy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="bg-rose-500/10 text-rose-400 p-8 rounded-2xl flex flex-col items-center max-w-md text-center shadow-lg border border-rose-500/20 backdrop-blur-md">
          <AlertTriangle className="w-14 h-14 mb-4 text-rose-500" />
          <h3 className="text-xl font-bold mb-3 text-white">Hierarchy Fetch Failed</h3>
          <p className="text-sm opacity-90 mb-6 leading-relaxed">{error}</p>
          <button onClick={fetchTree} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-500 transition-colors shadow-lg shadow-rose-500/20 flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!treeData || treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-10 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-700">
          <Users className="w-12 h-12 text-slate-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">No Teams Found</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed text-sm">
          Your organization tree is currently empty or you do not have visibility permissions for any staff.
        </p>
        <button onClick={fetchTree} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" />
          Refresh Structure
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[80vh] bg-[#0a0f1c] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col shadow-2xl">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Toolbar Layer */}
      <div className="absolute top-5 left-5 right-5 z-20 flex justify-between items-center pointer-events-none">
        
        {/* Left Toolbar: Search & Expand */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-xl p-2 flex items-center shadow-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search name, code, dept, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950/50 text-white text-sm rounded-lg pl-9 pr-4 py-2 border border-slate-700/50 outline-none focus:border-gold w-64 placeholder-slate-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-xl p-2 flex items-center gap-1 shadow-xl">
            <button onClick={expandAll} className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              Expand All
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button onClick={collapseAll} className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              Collapse All
            </button>
          </div>
        </div>

        {/* Right Toolbar: Zoom Controls */}
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-xl p-1.5 flex items-center gap-1 shadow-xl">
          <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button onClick={resetView} className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Infinite Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden touch-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div 
          className="w-full h-full flex items-start justify-center pt-28 pb-40 px-20"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center top',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
          }}
        >
          {treeData.map(rootNode => renderNode(rootNode))}
        </div>
      </div>

      {/* Detail Drawer Sidebar */}
      <EmployeeDetailDrawer 
        employee={selectedEmployee} 
        onClose={() => setSelectedEmployee(null)} 
      />
    </div>
  );
}
