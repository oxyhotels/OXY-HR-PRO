'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Search, ZoomIn, ZoomOut, Maximize, Loader2, Download, Printer, User, Building2, Crown, Users, TrendingUp, Monitor, MoreHorizontal, UserCog, UserCircle, UserCheck, Share2 } from 'lucide-react';
import { api } from '@/lib/api';

// -----------------------------------------------------
// LAYOUT ENGINE (DAGRE)
// -----------------------------------------------------

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 150, ranksep: 200 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 300, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - 150,
        y: nodeWithPosition.y - 60,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// -----------------------------------------------------
// CUSTOM NODE COMPONENT (GLASSMORPHISM)
// -----------------------------------------------------

const CustomOrgNode = ({ data, id }: NodeProps) => {
  const { label, type, designation, isExpanded, hasChildren, onExpandClick, onNodeClick, isLoading } = data as any;
  
  let borderColor = '#94a3b8'; // default slate
  let icon = <User className="w-6 h-6 text-slate-500" />;
  
  if (type === 'ROOT') { borderColor = '#1e3a8a'; icon = <Building2 className="w-6 h-6 text-blue-800" />; }
  else if (type === 'ROOT_ADMIN') { borderColor = '#a855f7'; icon = <Crown className="w-6 h-6 text-purple-600" />; }
  else if (type === 'DEPARTMENT') { 
    if (label.includes('Central')) { borderColor = '#3b82f6'; icon = <Users className="w-6 h-6 text-blue-500" />; }
    else if (label.includes('Sales')) { borderColor = '#22c55e'; icon = <TrendingUp className="w-6 h-6 text-green-500" />; }
    else if (label.includes('Property')) { borderColor = '#f59e0b'; icon = <Building2 className="w-6 h-6 text-orange-500" />; }
    else if (label.includes('IT')) { borderColor = '#a855f7'; icon = <Monitor className="w-6 h-6 text-purple-500" />; }
    else { borderColor = '#64748b'; icon = <MoreHorizontal className="w-6 h-6 text-slate-500" />; }
  }
  else if (type === 'HOTEL') { borderColor = '#f59e0b'; icon = <Building2 className="w-6 h-6 text-orange-500" />; }
  else if (type === 'MANAGER') { borderColor = '#eab308'; icon = <UserCog className="w-6 h-6 text-yellow-600" />; }
  else if (type === 'SUPERVISOR') { borderColor = '#14b8a6'; icon = <UserCheck className="w-6 h-6 text-teal-600" />; }
  else if (type === 'EMPLOYEE') { borderColor = '#cbd5e1'; icon = <UserCircle className="w-6 h-6 text-slate-600" />; }

  return (
    <div 
      className="relative w-[300px] bg-white/80 backdrop-blur-xl border-2 rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
      style={{ borderColor }}
      onClick={() => onNodeClick(id)}
    >
      <Handle type="target" position={Position.Top} className="opacity-0 w-full h-full absolute inset-0 z-0" isConnectable={false} />
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 shrink-0 shadow-sm border border-slate-200">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">{label}</h3>
          <p className="text-xs text-slate-500 truncate font-medium">{designation || type}</p>
          
          {(type === 'MANAGER' || type === 'SUPERVISOR' || type === 'EMPLOYEE') && (
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md">Att: 98%</span>
              <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">Tasks: 12</span>
            </div>
          )}
        </div>
      </div>

      {hasChildren && (
        <button 
          onClick={(e) => { e.stopPropagation(); onExpandClick(id, type); }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 transition-colors z-20 text-slate-600"
          style={{ borderColor }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isExpanded ? '-' : '+')}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-full absolute inset-0 z-0" isConnectable={false} />
    </div>
  );
};

const nodeTypes = { custom: CustomOrgNode };

// -----------------------------------------------------
// MAIN COMPONENT (INNER)
// -----------------------------------------------------

const EnterpriseOrgTreeInner = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [stats, setStats] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  
  const { fitView } = useReactFlow();

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch Stats
        const statsRes = await api.get('/hierarchy/stats');
        if (statsRes?.data?.stats) setStats(statsRes.data.stats);

        // Fetch Root Node
        const rootRes = await api.get('/hierarchy/lazy');
        if (rootRes?.data?.nodes) {
          const rootNodes = rootRes.data.nodes.map((n: any) => ({
            id: n.id,
            type: 'custom',
            data: { 
              label: n.name, 
              type: n.type, 
              designation: n.designation,
              hasChildren: n.hasChildren,
              isExpanded: false,
              onExpandClick: handleExpand,
              onNodeClick: handleNodeClick
            },
            position: { x: 0, y: 0 }
          }));

          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rootNodes, []);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
        }
      } catch (err) {
        console.error('Failed to init tree', err);
      }
    };
    init();
  }, []);

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNodeData(node.data);
      setDrawerOpen(true);
    }
  };

  const handleExpand = async (parentId: string, type: string) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const isCurrentlyExpanded = parentNode.data.isExpanded;

    if (isCurrentlyExpanded) {
      // Collapse: Remove all descendant nodes and edges
      const descendants = getDescendants(parentId);
      setNodes(nds => nds.filter(n => !descendants.includes(n.id)).map(n => n.id === parentId ? { ...n, data: { ...n.data, isExpanded: false } } : n));
      setEdges(eds => eds.filter(e => !descendants.includes(e.target)));
      return;
    }

    // Set Loading State
    setNodes(nds => nds.map(n => n.id === parentId ? { ...n, data: { ...n.data, isLoading: true } } : n));

    try {
      // Fetch Children
      const res = await api.get(`/hierarchy/lazy?parentId=${parentId}&type=${type}`);
      const childrenData = res?.data?.nodes || [];

      const newNodes = childrenData.map((child: any) => ({
        id: child.id,
        type: 'custom',
        data: {
          label: child.name,
          type: child.type,
          designation: child.designation,
          hasChildren: child.hasChildren,
          isExpanded: false,
          onExpandClick: handleExpand,
          onNodeClick: handleNodeClick
        },
        position: { x: 0, y: 0 }
      }));

      const newEdges = childrenData.map((child: any) => ({
        id: `e-${parentId}-${child.id}`,
        source: parentId,
        target: child.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 }
      }));

      const allNodes = [...nodes, ...newNodes];
      const allEdges = [...edges, ...newEdges];

      // Update parent expanded state and stop loading
      const updatedNodes = allNodes.map(n => n.id === parentId ? { ...n, data: { ...n.data, isExpanded: true, isLoading: false } } : n);

      // Re-layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(updatedNodes, allEdges);
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);

    } catch (err) {
      console.error('Failed to fetch children', err);
      setNodes(nds => nds.map(n => n.id === parentId ? { ...n, data: { ...n.data, isLoading: false } } : n));
    }
  };

  const getDescendants = (parentId: string): string[] => {
    const childrenIds = edges.filter(e => e.source === parentId).map(e => e.target);
    let descendants = [...childrenIds];
    childrenIds.forEach(id => {
      descendants = [...descendants, ...getDescendants(id)];
    });
    return descendants;
  };

  return (
    <div className="w-full h-screen bg-[#f8fafc] flex flex-col font-sans">
      
      {/* Top Statistics Ribbon */}
      <div className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Hotels</span>
            <span className="text-xl font-black text-slate-800">{stats?.totalHotels || '-'}</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Departments</span>
            <span className="text-xl font-black text-slate-800">{stats?.totalDepartments || '-'}</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Staff</span>
            <span className="text-xl font-black text-slate-800">{stats?.totalEmployees || '-'}</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Online Staff</span>
            <span className="text-xl font-black text-green-700">{stats?.onlineStaff || '-'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Employee..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm font-medium w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-md hover:bg-blue-700 transition">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={24} size={2} />
          
          <MiniMap 
            nodeColor={(node: any) => {
              const type = node.data.type;
              if (type === 'ROOT') return '#1e3a8a';
              if (type === 'ROOT_ADMIN') return '#a855f7';
              if (type === 'DEPARTMENT') return '#3b82f6';
              if (type === 'HOTEL') return '#f59e0b';
              if (type === 'MANAGER') return '#eab308';
              return '#cbd5e1';
            }}
            maskColor="rgba(248, 250, 252, 0.7)"
            className="bg-white border-2 border-slate-200 rounded-xl shadow-lg"
          />

          <Panel position="bottom-left" className="m-6 bg-white p-2 rounded-xl shadow-lg border border-slate-200 flex gap-2">
            <button onClick={() => fitView({ duration: 800 })} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"><Maximize className="w-5 h-5" /></button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Side Drawer */}
      {drawerOpen && selectedNodeData && (
        <div className="absolute top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800">Profile Details</h2>
            <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">X</button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">{selectedNodeData.label}</h3>
              <p className="text-blue-600 font-bold uppercase tracking-wider text-sm mt-1">{selectedNodeData.designation || selectedNodeData.type}</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Performance Overview</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500">Attendance</p>
                    <p className="text-lg font-black text-green-600">98%</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500">Open Tasks</p>
                    <p className="text-lg font-black text-blue-600">12</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default function EnterpriseOrgTree() {
  return (
    <ReactFlowProvider>
      <EnterpriseOrgTreeInner />
    </ReactFlowProvider>
  );
}
