import { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';

export function ContextMenu() {
  const { contextMenu, closeContextMenu, dsl, setDsl } = useAppStore();
  const { isOpen, x, y, entityName, fieldName } = contextMenu;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRelDialog, setShowRelDialog] = useState(false);
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  
  const [newTableName, setNewTableName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('varchar(255)');
  const [isPk, setIsPk] = useState(false);
  const [isUk, setIsUk] = useState(false);
  const [isNull, setIsNull] = useState(true);
  
  const [relTargetTable, setRelTargetTable] = useState('');
  const [relTargetField, setRelTargetField] = useState('');
  const [relCardinality, setRelCardinality] = useState('1 -> *');

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (isOpen) {
      window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [isOpen, closeContextMenu]);

  if (!isOpen && !showAddDialog && !showRelDialog && !showAddTableDialog) return null;

  const handleAddTable = () => {
    setShowAddTableDialog(true);
    closeContextMenu();
  };

  const submitAddTable = () => {
    if (!newTableName.trim()) return;
    
    const newTable = `\n\ntable ${newTableName} {\n  id int pk\n}\n`;
    setDsl(dsl + newTable);
    
    setShowAddTableDialog(false);
    setNewTableName('');
  };

  const handleAddField = () => {
    setShowAddDialog(true);
    closeContextMenu();
  };

  const handleCreateRel = () => {
    setShowRelDialog(true);
    closeContextMenu();
  };

  const submitCreateRel = () => {
    if (!relTargetTable || !relTargetField) return;
    
    const [sourceCard, targetCard] = relCardinality.split(' -> ');
    const newRelation = `\nrelation ${entityName}.${fieldName} ${sourceCard} -> ${targetCard} ${relTargetTable}.${relTargetField}\n`;
    
    setDsl(dsl + newRelation);
    
    setShowRelDialog(false);
    setRelTargetTable('');
    setRelTargetField('');
  };

  const submitAddField = () => {
    if (!newFieldName.trim()) return;
    
    const lines = dsl.split('\n');
    let inTargetTable = false;
    let insertIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(new RegExp(`^(table|entity)\\s+${entityName}\\s*\\{`, 'i'))) {
        inTargetTable = true;
      } else if (inTargetTable && line.includes('}')) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex !== -1) {
      let fieldDef = `  ${newFieldName} ${newFieldType}`;
      if (isPk) fieldDef += ' pk';
      if (isUk) fieldDef += ' uk';
      if (!isNull) fieldDef += ' not null';
      
      lines.splice(insertIndex, 0, fieldDef);
      setDsl(lines.join('\n'));
    }

    setShowAddDialog(false);
    setNewFieldName('');
    setIsPk(false);
    setIsUk(false);
    setIsNull(true);
  };

  const handleDeleteField = () => {
    if (!fieldName) return;
    
    const lines = dsl.split('\n');
    let inTargetTable = false;
    let deleteIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(new RegExp(`^(table|entity)\\s+${entityName}\\s*\\{`, 'i'))) {
        inTargetTable = true;
      } else if (inTargetTable && line.includes('}')) {
        break;
      } else if (inTargetTable && line.trim().startsWith(fieldName)) {
        deleteIndex = i;
        break;
      }
    }

    if (deleteIndex !== -1) {
      lines.splice(deleteIndex, 1);
      setDsl(lines.join('\n'));
    }
    closeContextMenu();
  };

  const handleDeleteTable = () => {
    const lines = dsl.split('\n');
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(new RegExp(`^(table|entity)\\s+${entityName}\\s*\\{`, 'i'))) {
        startIndex = i;
      } else if (startIndex !== -1 && line.includes('}')) {
        endIndex = i;
        break;
      }
    }

    if (startIndex !== -1 && endIndex !== -1) {
      lines.splice(startIndex, endIndex - startIndex + 1);
      setDsl(lines.join('\n'));
    }

    closeContextMenu();
  };

  if (showAddDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddDialog(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-96 border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Add Field to {entityName}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Field Name</label>
              <input 
                type="text" 
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., status"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
              <input 
                type="text" 
                value={newFieldType}
                onChange={e => setNewFieldType(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., varchar(255)"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPk}
                  onChange={e => setIsPk(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                Primary Key (PK)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isUk}
                  onChange={e => setIsUk(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                Unique (UK)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!isNull}
                  onChange={e => setIsNull(!e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                Not Null
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowAddDialog(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitAddField}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
            >
              Add Field
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showRelDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRelDialog(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-96 border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Create Relationship</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            From: <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">{entityName}.{fieldName}</span>
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target Table</label>
              <input 
                type="text" 
                value={relTargetTable}
                onChange={e => setRelTargetTable(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., User"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target Field</label>
              <input 
                type="text" 
                value={relTargetField}
                onChange={e => setRelTargetField(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., id"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cardinality</label>
              <select 
                value={relCardinality}
                onChange={e => setRelCardinality(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1 -> *">One to Many (1 -&gt; *)</option>
                <option value="* -> 1">Many to One (* -&gt; 1)</option>
                <option value="1 -> 1">One to One (1 -&gt; 1)</option>
                <option value="* -> *">Many to Many (* -&gt; *)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowRelDialog(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitCreateRel}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAddTableDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddTableDialog(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-96 border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Add New Table</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Table Name</label>
              <input 
                type="text" 
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Product"
                autoFocus
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowAddTableDialog(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitAddTable}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
            >
              Add Table
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {!entityName ? (
        <button 
          onClick={handleAddTable}
          className="w-full text-left px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
        >
          <Plus size={14} /> Add Table
        </button>
      ) : (
        <>
          <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 mb-1">
            {entityName}{fieldName ? `.${fieldName}` : ''}
          </div>
          <button 
            onClick={handleAddField}
            className="w-full text-left px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
          >
            <Plus size={14} /> Add Field
          </button>
          {!fieldName && (
            <>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
              <button 
                onClick={handleDeleteTable}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} /> Delete Table
              </button>
            </>
          )}
          {fieldName && (
            <>
              <button 
                onClick={handleCreateRel}
                className="w-full text-left px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
              >
                <LinkIcon size={14} /> Create Relationship
              </button>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
              <button 
                onClick={handleDeleteField}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} /> Delete Field
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
