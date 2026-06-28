'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChevronRight, ChevronDown, User, Building2, Crown, Users, TrendingUp, Monitor, MoreHorizontal, UserCog, UserCircle, UserCheck, Loader2 } from 'lucide-react';

export default function AccordionTreeMobile() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load root node initially
  useEffect(() => {
    const init = async () => {
      try {
        const rootRes = await api.get('/hierarchy/lazy');
        if (rootRes?.data?.nodes) {
          setNodes(rootRes.data.nodes.map((n: any) => ({ ...n, isExpanded: false, children: [] })));
        }
      } catch (err) {
        console.error('Failed to init mobile tree', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleToggle = async (node: any, path: number[]) => {
    // If it's already expanded, collapse it (just hide children locally)
    if (node.isExpanded) {
      updateNodeState(path, { isExpanded: false });
      return;
    }

    // If it has children already loaded, just expand
    if (node.children && node.children.length > 0) {
      updateNodeState(path, { isExpanded: true });
      return;
    }

    // Otherwise, fetch children from API
    updateNodeState(path, { isLoading: true });

    try {
      const res = await api.get(`/hierarchy/lazy?parentId=${node.id}&type=${node.type}`);
      const childrenData = res?.data?.nodes || [];
      const newChildren = childrenData.map((child: any) => ({ ...child, isExpanded: false, children: [] }));
      
      updateNodeState(path, { isLoading: false, isExpanded: true, children: newChildren });
    } catch (error) {
      updateNodeState(path, { isLoading: false });
    }
  };

  const updateNodeState = (path: number[], updates: any) => {
    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      let current = newNodes;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]].children;
      }
      const targetIndex = path[path.length - 1];
      current[targetIndex] = { ...current[targetIndex], ...updates };
      return newNodes;
    });
  };

  const renderIcon = (type: string, label: string) => {
    if (type === 'ROOT') return <Building2 className="w-5 h-5 text-blue-800" />;
    if (type === 'ROOT_ADMIN') return <Crown className="w-5 h-5 text-purple-600" />;
    if (type === 'DEPARTMENT') {
      if (label.includes('Central')) return <Users className="w-5 h-5 text-blue-500" />;
      if (label.includes('Sales')) return <TrendingUp className="w-5 h-5 text-green-500" />;
      if (label.includes('Property')) return <Building2 className="w-5 h-5 text-orange-500" />;
      if (label.includes('IT')) return <Monitor className="w-5 h-5 text-purple-500" />;
      return <MoreHorizontal className="w-5 h-5 text-slate-500" />;
    }
    if (type === 'HOTEL') return <Building2 className="w-5 h-5 text-orange-500" />;
    if (type === 'MANAGER') return <UserCog className="w-5 h-5 text-yellow-600" />;
    if (type === 'SUPERVISOR') return <UserCheck className="w-5 h-5 text-teal-600" />;
    return <UserCircle className="w-5 h-5 text-slate-600" />;
  };

  const renderNode = (node: any, path: number[], level: number) => {
    const hasExpandButton = node.hasChildren;

    return (
      <div key={node.id} className="w-full">
        <div 
          className={`flex items-center gap-3 py-3 px-4 border-b border-slate-100 bg-white active:bg-slate-50 transition ${level > 0 ? 'ml-4 border-l-2 border-slate-200' : ''}`}
          onClick={() => hasExpandButton && handleToggle(node, path)}
        >
          {hasExpandButton && (
            <div className="shrink-0 text-slate-400">
              {node.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                (node.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
            </div>
          )}
          
          <div className="shrink-0 bg-slate-50 p-2 rounded-lg border border-slate-100">
            {renderIcon(node.type, node.name)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-slate-800 truncate uppercase">{node.name}</h4>
            <p className="text-xs text-slate-500 truncate">{node.designation || node.type}</p>
          </div>
        </div>

        {node.isExpanded && node.children && (
          <div className="w-full animate-in slide-in-from-top-2 duration-200">
            {node.children.map((child: any, idx: number) => renderNode(child, [...path, idx], level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-white rounded-xl">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500">Loading Mobile Directory...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f8fafc] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="bg-slate-900 text-white p-4">
        <h3 className="font-bold text-lg">Directory</h3>
        <p className="text-slate-400 text-xs mt-1">Tap any node to expand</p>
      </div>
      <div className="w-full pb-8">
        {nodes.map((node, idx) => renderNode(node, [idx], 0))}
      </div>
    </div>
  );
}
