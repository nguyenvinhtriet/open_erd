'use client';

import { useEffect, useState, useRef } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import Editor from '@monaco-editor/react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, Panel as FlowPanel, Node, Edge, Connection, ConnectionMode, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../lib/store';
import { getLayoutedElements, LayoutAlgorithm } from '../lib/layout';
import { EntityNode } from './EntityNode';
import { RelationEdge } from './RelationEdge';
import { ContextMenu } from './ContextMenu';
import { Download, Share2, Moon, Sun, LayoutTemplate, AlignLeft, Network, Grid3X3, Wand2 } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { formatDSL } from '../lib/formatter';

const nodeTypes = {
  entity: EntityNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

function LayoutUpdater({ layoutAlgorithm, ast }: { layoutAlgorithm: LayoutAlgorithm, ast: any }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 800, padding: 0.2 });
    }, 100);
    return () => clearTimeout(timer);
  }, [layoutAlgorithm, ast, fitView]);
  return null;
}

export default function App() {
  const { dsl, ast, errors, setDsl, loadFromHash, saveToHash } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [exportBackground, setExportBackground] = useState(true);
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<LayoutAlgorithm>('left-right');
  const flowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFromHash();
  }, [loadFromHash]);

  useEffect(() => {
    if (ast) {
      getLayoutedElements(ast, layoutAlgorithm).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      });
    }
  }, [ast, layoutAlgorithm, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToHash();
        alert('Saved to URL Hash and LocalStorage!');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (ast) {
          getLayoutedElements(ast, layoutAlgorithm).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ast, layoutAlgorithm, saveToHash, setNodes, setEdges]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setDsl(value);
    }
  };

  const handleFormat = () => {
    if (ast) {
      const formatted = formatDSL(ast);
      setDsl(formatted);
    }
  };

  const handleShare = () => {
    saveToHash();
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  const handleExportPng = () => {
    if (flowRef.current) {
      toPng(flowRef.current, { 
        backgroundColor: exportBackground ? (theme === 'dark' ? '#18181b' : '#ffffff') : 'transparent',
        pixelRatio: 2
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = 'erd.png';
          link.href = dataUrl;
          link.click();
        });
    }
  };

  const handleExportSvg = () => {
    if (flowRef.current) {
      toSvg(flowRef.current, { 
        backgroundColor: exportBackground ? (theme === 'dark' ? '#18181b' : '#ffffff') : 'transparent'
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = 'erd.svg';
          link.href = dataUrl;
          link.click();
        });
    }
  };

  const onSelectionChange = ({ nodes: selectedNodes }: { nodes: Node[] }) => {
    const selectedNodeId = selectedNodes.length > 0 ? selectedNodes[0].id : null;

    setNodes((nds) => {
      let changed = false;
      const newNds = nds.map((n) => {
        const isSelected = selectedNodeId === n.id;
        const isConnected = selectedNodeId ? edges.some(e => (e.source === selectedNodeId && e.target === n.id) || (e.target === selectedNodeId && e.source === n.id)) : false;
        const targetOpacity = !selectedNodeId || isSelected || isConnected ? 1 : 0.25;

        if (n.style?.opacity !== targetOpacity) {
          changed = true;
          return { ...n, style: { ...n.style, opacity: targetOpacity, transition: 'opacity 0.2s' } };
        }
        return n;
      });
      return changed ? newNds : nds;
    });

    setEdges((eds) => {
      let changed = false;
      const newEds = eds.map((e) => {
        const isConnected = selectedNodeId ? e.source === selectedNodeId || e.target === selectedNodeId : true;
        const targetOpacity = isConnected ? 1 : 0.25;

        if (e.style?.opacity !== targetOpacity) {
          changed = true;
          return { ...e, style: { ...e.style, opacity: targetOpacity, transition: 'opacity 0.2s' } };
        }
        return e;
      });
      return changed ? newEds : eds;
    });
  };

  const onConnect = (params: Connection) => {
    const state = useAppStore.getState();
    if (!state.ast) return;
    const { source, sourceHandle, target, targetHandle } = params;
    if (!source || !target || !sourceHandle || !targetHandle) return;

    const sourceField = sourceHandle.split('-')[0];
    const targetField = targetHandle.split('-')[0];

    const currentDsl = state.dsl;
    const newRelation = `\nrelation ${source}.${sourceField} 1 -> * ${target}.${targetField}\n`;
    state.setDsl(currentDsl + newRelation);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="text-indigo-500" />
          <h1 className="font-bold text-lg tracking-tight">OpenERD</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={exportBackground} 
              onChange={(e) => setExportBackground(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-500 focus:ring-indigo-500"
            />
            Export BG
          </label>
          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors">
            <Share2 size={16} /> Share
          </button>
          <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
          <button onClick={handleExportPng} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Download size={16} /> PNG
          </button>
          <button onClick={handleExportSvg} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Download size={16} /> SVG
          </button>
          <button onClick={toggleTheme} className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ContextMenu />
        <Group orientation="horizontal">
          <Panel defaultSize={30} minSize={20} className="border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 bg-zinc-50 dark:bg-zinc-900/50">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Schema Editor</span>
              <button onClick={handleFormat} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
                <Wand2 size={14} /> Format
              </button>
            </div>
            <div className="flex-1 relative">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={dsl}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
            {errors.length > 0 && (
              <div className="h-32 border-t border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 overflow-auto">
                <h3 className="text-red-600 dark:text-red-400 font-semibold text-sm mb-2">Syntax Errors</h3>
                <ul className="text-sm text-red-500 dark:text-red-400 space-y-1">
                  {errors.map((err, i) => (
                    <li key={i}>
                      Line {err.token.startLine}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Separator className="w-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-indigo-400 dark:hover:bg-indigo-500 transition-colors cursor-col-resize" />

          <Panel defaultSize={70} minSize={30}>
            <div className="h-full w-full relative" ref={flowRef}>
              <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
                <defs>
                  {/* END MARKERS */}
                  <marker id="crow-many-mandatory-end" markerWidth="24" markerHeight="12" refX="24" refY="6" orient="auto">
                    <path d="M 0 6 L 24 6 M 12 0 L 24 6 M 12 12 L 24 6 M 6 0 L 6 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <marker id="crow-many-optional-end" markerWidth="24" markerHeight="12" refX="24" refY="6" orient="auto">
                    <circle cx="6" cy="6" r="3" fill="white" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M 0 6 L 3 6 M 9 6 L 24 6 M 12 0 L 24 6 M 12 12 L 24 6" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <marker id="crow-one-mandatory-end" markerWidth="24" markerHeight="12" refX="24" refY="6" orient="auto">
                    <path d="M 0 6 L 24 6 M 6 0 L 6 12 M 14 0 L 14 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <marker id="crow-one-optional-end" markerWidth="24" markerHeight="12" refX="24" refY="6" orient="auto">
                    <circle cx="6" cy="6" r="3" fill="white" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M 0 6 L 3 6 M 9 6 L 24 6 M 14 0 L 14 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>

                  {/* START MARKERS */}
                  <marker id="crow-many-mandatory-start" markerWidth="24" markerHeight="12" refX="0" refY="6" orient="auto">
                    <path d="M 0 6 L 24 6 M 12 0 L 0 6 M 12 12 L 0 6 M 18 0 L 18 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <marker id="crow-many-optional-start" markerWidth="24" markerHeight="12" refX="0" refY="6" orient="auto">
                    <circle cx="18" cy="6" r="3" fill="white" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M 0 6 L 15 6 M 21 6 L 24 6 M 12 0 L 0 6 M 12 12 L 0 6" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <marker id="crow-one-mandatory-start" markerWidth="24" markerHeight="12" refX="0" refY="6" orient="auto">
                    <path d="M 0 6 L 24 6 M 18 0 L 18 12 M 10 0 L 10 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <marker id="crow-one-optional-start" markerWidth="24" markerHeight="12" refX="0" refY="6" orient="auto">
                    <circle cx="18" cy="6" r="3" fill="white" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M 0 6 L 15 6 M 21 6 L 24 6 M 10 0 L 10 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                </defs>
              </svg>
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onSelectionChange={onSelectionChange}
                  onConnect={onConnect}
                  connectionMode={ConnectionMode.Loose}
                  onEdgeContextMenu={(e, edge) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const data = edge.data as any;
                    useAppStore.getState().setContextMenu({
                      isOpen: true,
                      x: e.clientX,
                      y: e.clientY,
                      type: 'edge',
                      edgeId: edge.id,
                      sourceEntity: edge.source,
                      sourceField: edge.sourceHandle?.split('-')[0],
                      targetEntity: edge.target,
                      targetField: edge.targetHandle?.split('-')[0],
                      cardinality: `${data.sourceCard} -> ${data.targetCard}`,
                    });
                  }}
                  onPaneContextMenu={(e) => {
                    e.preventDefault();
                    useAppStore.getState().setContextMenu({
                      isOpen: true,
                      x: e.clientX,
                      y: e.clientY,
                      type: 'pane',
                      entityName: '',
                      fieldName: undefined,
                    });
                  }}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  className="bg-zinc-50 dark:bg-zinc-950"
                  colorMode={theme}
                  nodesDraggable={true}
                  nodesConnectable={true}
                  elementsSelectable={true}
                >
                  <LayoutUpdater layoutAlgorithm={layoutAlgorithm} ast={ast} />
                  <FlowPanel position="top-left" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm p-1 flex gap-1">
                  <button 
                    onClick={() => setLayoutAlgorithm('left-right')}
                    className={`p-2 rounded-md transition-colors ${layoutAlgorithm === 'left-right' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    title="Left-right layout"
                  >
                    <AlignLeft size={18} />
                  </button>
                  <button 
                    onClick={() => setLayoutAlgorithm('snowflake')}
                    className={`p-2 rounded-md transition-colors ${layoutAlgorithm === 'snowflake' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    title="Snowflake layout"
                  >
                    <Network size={18} />
                  </button>
                  <button 
                    onClick={() => setLayoutAlgorithm('compact')}
                    className={`p-2 rounded-md transition-colors ${layoutAlgorithm === 'compact' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    title="Compact layout"
                  >
                    <Grid3X3 size={18} />
                  </button>
                </FlowPanel>
                <Background color={theme === 'dark' ? '#3f3f46' : '#d4d4d8'} gap={16} />
                <Controls className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 fill-zinc-600 dark:fill-zinc-400" />
                <MiniMap 
                  nodeColor={theme === 'dark' ? '#27272a' : '#f4f4f5'}
                  maskColor={theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'}
                  className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
