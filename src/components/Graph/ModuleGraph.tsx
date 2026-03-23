import { useCallback, useMemo, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, Node, Edge, Panel } from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';
import { Module, UserBasket } from '../../utils/types';

interface GraphProps {
  onModuleClick: (code: string) => void;
  onModuleAdd: (code: string, stage: string) => void;
  basket: UserBasket;
  modulesDb: Record<string, Module>;
  isDarkMode: boolean;
}

type ModuleStatus = 'selected' | 'available' | 'locked';

interface ModuleNodeData {
  code: string;
  title: string;
  credits: number;
  stage: string;
  status: ModuleStatus;
  isDarkMode: boolean; 
}

const nodeTypes = { exeterModule: CustomNode };

export const ModuleGraph = ({ onModuleClick, onModuleAdd, basket, modulesDb, isDarkMode }: GraphProps) => {
  const [layoutMode, setLayoutMode] = useState<'waterfall' | 'centered'>('waterfall');

  const { generatedNodes, generatedEdges } = useMemo(() => {
    const newNodes: Node<ModuleNodeData>[] = [];
    const newEdges: Edge[] = [];

    const stageCounts: Record<string, number> = { "Stage 1": 0, "Stage 2": 0, "Stage 3": 0, "Stage 4": 0 };
    Object.values(modulesDb).forEach(mod => {
      const stageName = typeof mod.stage === 'number' ? `Stage ${mod.stage}` : mod.stage;
      stageCounts[stageName] = (stageCounts[stageName] || 0) + 1;
    });

    const maxNodesInAColumn = Math.max(...Object.values(stageCounts));
    const maxColumnHeight = maxNodesInAColumn * 220; 
    const columnCurrentIndexes: Record<string, number> = { "Stage 1": 0, "Stage 2": 0, "Stage 3": 0, "Stage 4": 0 };

    Object.values(modulesDb).forEach((mod) => {
      const stageName = typeof mod.stage === 'number' ? `Stage ${mod.stage}` : mod.stage;
      const stageNum = parseInt(stageName.replace("Stage ", "")) || 1;
      const xPos = (stageNum - 1) * 350 + 50; 

      const currentIndex = columnCurrentIndexes[stageName] || 0;
      columnCurrentIndexes[stageName] = currentIndex + 1;
      let yPos = currentIndex * 220 + 50;

      if (layoutMode === 'centered') {
        const nodesInThisColumn = stageCounts[stageName] || 1;
        const thisColumnHeight = nodesInThisColumn * 220;
        const verticalOffset = (maxColumnHeight - thisColumnHeight) / 2;
        yPos = verticalOffset + (currentIndex * 220) + 50;
      }

      const isSelected = basket[stageName]?.includes(mod.code);
      const allSelectedModules = Object.values(basket).flat();
      
      const prereqsMet = mod.requirements.prerequisites.every(req => {
        if (req.type === "AND") return req.modules.every(code => allSelectedModules.includes(code));
        if (req.type === "OR") return req.modules.some(code => allSelectedModules.includes(code));
        return true;
      });

      let status: ModuleStatus = 'available';
      if (isSelected) status = 'selected';
      else if (!prereqsMet) status = 'locked';

      newNodes.push({ 
        id: mod.code, 
        type: 'exeterModule',
        position: { x: xPos, y: yPos }, 
        data: { code: mod.code, title: mod.title, credits: mod.credits, stage: stageName, status, isDarkMode },
      });

      mod.requirements.prerequisites.forEach(req => {
        req.modules.forEach(prereqCode => {
          if (modulesDb[prereqCode]) {
            
            // Fixed Edge Color Logic (Immune to copy-paste errors)
            let edgeColor = '#cbd5e1'; 
            if (isSelected) {
              edgeColor = isDarkMode ? '#2dd4bf' : '#003c3c';
            } else {
              edgeColor = isDarkMode ? '#374151' : '#cbd5e1';
            }

            newEdges.push({ 
              id: `e-${prereqCode}-${mod.code}`, 
              source: prereqCode, 
              target: mod.code, 
              animated: isSelected, 
              style: { stroke: edgeColor, strokeWidth: isSelected ? 2 : 1.5 } 
            });
          }
        });
      });
    });

    return { generatedNodes: newNodes, generatedEdges: newEdges };
  }, [modulesDb, basket, layoutMode, isDarkMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState<ModuleNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [generatedNodes, generatedEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: MouseEvent, node: Node<ModuleNodeData>) => {
    onModuleClick(node.id);
    onModuleAdd(node.id, node.data.stage);
  }, [onModuleAdd, onModuleClick]);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: isDarkMode ? '#111827' : 'transparent' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        defaultViewport={{ x: 50, y: 50, zoom: 0.85 }} 
        minZoom={0.1} 
      >
        <Background color={isDarkMode ? "#374151" : "#e5e7eb"} gap={20} size={1} />
        <Controls className={isDarkMode ? 'fill-gray-300' : ''} style={isDarkMode ? { backgroundColor: '#1f2937', borderColor: '#374151' } : {}}/>
        
        <Panel position="top-right" className={`p-2 rounded-lg shadow-md border m-4 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
           <div className="flex items-center gap-3">
             <span className={`text-sm font-bold ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Alignment:</span>
             <div className={`flex rounded-md p-1 border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
               <button
                 onClick={() => setLayoutMode('waterfall')}
                 className={`px-3 py-1.5 text-xs font-bold rounded transition-all duration-200 ${layoutMode === 'waterfall' ? (isDarkMode ? 'bg-gray-700 text-teal-400 shadow-sm' : 'bg-white text-[#003c3c] shadow-sm ring-1 ring-gray-200') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
               >
                 Waterfall
               </button>
               <button
                 onClick={() => setLayoutMode('centered')}
                 className={`px-3 py-1.5 text-xs font-bold rounded transition-all duration-200 ${layoutMode === 'centered' ? (isDarkMode ? 'bg-gray-700 text-teal-400 shadow-sm' : 'bg-white text-[#003c3c] shadow-sm ring-1 ring-gray-200') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
               >
                 Centered
               </button>
             </div>
           </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};