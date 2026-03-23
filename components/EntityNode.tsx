import { Handle, Position } from '@xyflow/react';
import { Key, Link, Hash, Table2, Edit2 } from 'lucide-react';
import { ASTEntity } from '../lib/parser';
import { useAppStore } from '../lib/store';

export function EntityNode({ data }: { data: Record<string, unknown> }) {
  const entity = data as unknown as ASTEntity;
  const setContextMenu = useAppStore((state) => state.setContextMenu);

  const handleContextMenu = (e: React.MouseEvent, fieldName?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'entity',
      entityName: entity.name,
      fieldName,
    });
  };

  const handleRenameTable = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'renameTable',
      entityName: entity.name,
    });
  };

  return (
    <div 
      className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-lg min-w-[240px] font-sans text-sm transition-shadow hover:shadow-xl"
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* Header - Draggable Area */}
      <div 
        className="bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3 border-b border-zinc-300 dark:border-zinc-700 flex items-center justify-between cursor-grab active:cursor-grabbing rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <Table2 size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{entity.name}</span>
        </div>
        <button 
          onClick={handleRenameTable}
          className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors nodrag"
        >
          <Edit2 size={14} />
        </button>
      </div>

      {/* Columns - Non-draggable Area */}
      <div className="flex flex-col nodrag cursor-default py-1">
        {entity.attributes.map((attr, index) => (
          <div
            key={attr.name}
            onContextMenu={(e) => handleContextMenu(e, attr.name)}
            className="flex items-center justify-between px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 relative group transition-colors last:rounded-b-xl"
          >
            {/* Invisible Target Handle covering the whole row for easy dropping */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${attr.name}-left-target`}
              className="!w-full !h-full !bg-transparent !border-none !rounded-none opacity-0 z-10 cursor-crosshair"
              style={{ left: 0, top: 0, position: 'absolute' }}
            />
            {/* Right Handle (Source) - Visible on hover */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${attr.name}-right-source`}
              className="!w-5 !h-5 !bg-white dark:!bg-zinc-900 !border-2 !border-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair hover:!bg-indigo-500 hover:!border-white flex items-center justify-center z-20"
              style={{ right: '-10px', top: '50%' }}
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:bg-white" />
            </Handle>

            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-4">
                {attr.isPk && <Key size={14} className="text-amber-500 drop-shadow-sm" />}
                {attr.isFk && <Link size={14} className="text-blue-500 drop-shadow-sm" />}
                {attr.isUk && <Hash size={14} className="text-emerald-500 drop-shadow-sm" />}
              </span>
              <span className={`font-medium ${attr.isPk ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {attr.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {attr.isNull === false && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded">
                  NN
                </span>
              )}
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono ml-2">
                {attr.type}
              </span>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
