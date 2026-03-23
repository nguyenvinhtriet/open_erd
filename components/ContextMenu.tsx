import { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { Plus, Trash2, Link as LinkIcon, Edit2 } from 'lucide-react';

export function ContextMenu() {
  const { contextMenu, setContextMenu, closeContextMenu, dsl, setDsl, ast } = useAppStore();
  const { isOpen, x, y, entityName, fieldName } = contextMenu;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRelDialog, setShowRelDialog] = useState(false);
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [showUpdateRelDialog, setShowUpdateRelDialog] = useState(false);
  const [showRenameTableDialog, setShowRenameTableDialog] = useState(false);
  const [showUpdateFieldDialog, setShowUpdateFieldDialog] = useState(false);
  
  const [newTableName, setNewTableName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('varchar(255)');
  const [isPk, setIsPk] = useState(false);
  const [isUk, setIsUk] = useState(false);
  const [isNull, setIsNull] = useState(true);
  
  const [relTargetTable, setRelTargetTable] = useState('');
  const [relTargetField, setRelTargetField] = useState('');
  const [relCardinality, setRelCardinality] = useState('1 -> *');

  const availableTables = ast?.entities.map(e => e.name) || [];
  const selectedTableObj = ast?.entities.find(e => e.name === relTargetTable);
  const availableFields = selectedTableObj?.attributes.map(a => a.name) || [];

  useEffect(() => {
    if (isOpen && contextMenu.type === 'renameTable') {
      setNewTableName(entityName);
      setShowRenameTableDialog(true);
      closeContextMenu();
    } else if (isOpen && contextMenu.type === 'updateField') {
      const entity = ast?.entities.find(e => e.name === entityName);
      const field = entity?.attributes.find(a => a.name === fieldName);
      if (field) {
        setNewFieldName(field.name);
        setNewFieldType(field.type);
        setIsPk(field.isPk || false);
        setIsUk(field.isUk || false);
        setIsNull(field.isNull !== false);
        setShowUpdateFieldDialog(true);
      }
      closeContextMenu();
    }
  }, [isOpen, contextMenu.type, entityName, fieldName, ast, closeContextMenu]);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (isOpen && contextMenu.type !== 'renameTable' && contextMenu.type !== 'updateField') {
      window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [isOpen, contextMenu.type, closeContextMenu]);

  // Handle cascading dropdown updates
  const handleTargetTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTable = e.target.value;
    setRelTargetTable(newTable);
    const newTableObj = ast?.entities.find(ent => ent.name === newTable);
    const newFields = newTableObj?.attributes.map(a => a.name) || [];
    if (newFields.length > 0) {
      setRelTargetField(newFields[0]);
    } else {
      setRelTargetField('');
    }
  };

  if (!isOpen && !showAddDialog && !showRelDialog && !showAddTableDialog && !showUpdateRelDialog && !showRenameTableDialog && !showUpdateFieldDialog) return null;

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
    if (availableTables.length > 0) {
      const initialTable = availableTables[0];
      setRelTargetTable(initialTable);
      const initialTableObj = ast?.entities.find(ent => ent.name === initialTable);
      const initialFields = initialTableObj?.attributes.map(a => a.name) || [];
      if (initialFields.length > 0) {
        setRelTargetField(initialFields[0]);
      }
    }
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

  const handleDeleteEdge = () => {
    const lines = dsl.split('\n');
    const { sourceEntity, sourceField, targetEntity, targetField } = contextMenu;
    
    // Find the relation line
    const deleteIndex = lines.findIndex(line => {
      if (!line.trim().startsWith('relation')) return false;
      return line.includes(`${sourceEntity}.${sourceField}`) && line.includes(`${targetEntity}.${targetField}`);
    });

    if (deleteIndex !== -1) {
      lines.splice(deleteIndex, 1);
      setDsl(lines.join('\n'));
    }
    closeContextMenu();
  };

  const handleUpdateEdge = () => {
    setRelCardinality(contextMenu.cardinality || '1 -> *');
    setShowUpdateRelDialog(true);
    closeContextMenu();
  };

  const submitUpdateEdge = () => {
    const lines = dsl.split('\n');
    const { sourceEntity, sourceField, targetEntity, targetField } = contextMenu;
    
    const updateIndex = lines.findIndex(line => {
      if (!line.trim().startsWith('relation')) return false;
      return line.includes(`${sourceEntity}.${sourceField}`) && line.includes(`${targetEntity}.${targetField}`);
    });

    if (updateIndex !== -1) {
      const [sourceCard, targetCard] = relCardinality.split(' -> ');
      // Preserve label if exists
      const oldLine = lines[updateIndex];
      const labelMatch = oldLine.match(/:\s*"(.*?)"/);
      const labelPart = labelMatch ? ` : "${labelMatch[1]}"` : '';
      
      lines[updateIndex] = `relation ${sourceEntity}.${sourceField} ${sourceCard} -> ${targetCard} ${targetEntity}.${targetField}${labelPart}`;
      setDsl(lines.join('\n'));
    }
    
    setShowUpdateRelDialog(false);
  };

  const submitRenameTable = () => {
    if (!newTableName.trim() || newTableName === entityName) {
      setShowRenameTableDialog(false);
      return;
    }
    
    const lines = dsl.split('\n');
    let inTargetTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(new RegExp(`^(table|entity)\\s+${entityName}\\s*\\{`, 'i'))) {
        lines[i] = line.replace(entityName, newTableName);
        inTargetTable = true;
      } else if (inTargetTable && line.includes('}')) {
        inTargetTable = false;
      } else if (line.trim().startsWith('relation')) {
        // Update relations involving this table
        lines[i] = line.replace(new RegExp(`\\b${entityName}\\.`, 'g'), `${newTableName}.`);
      }
    }

    setDsl(lines.join('\n'));
    setShowRenameTableDialog(false);
  };

  const submitUpdateField = () => {
    if (!newFieldName.trim() || !fieldName) {
      setShowUpdateFieldDialog(false);
      return;
    }
    
    const lines = dsl.split('\n');
    let inTargetTable = false;
    let updateIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(new RegExp(`^(table|entity)\\s+${entityName}\\s*\\{`, 'i'))) {
        inTargetTable = true;
      } else if (inTargetTable && line.includes('}')) {
        break;
      } else if (inTargetTable && line.trim().startsWith(fieldName)) {
        updateIndex = i;
        break;
      }
    }

    if (updateIndex !== -1) {
      let fieldDef = `  ${newFieldName} ${newFieldType}`;
      if (isPk) fieldDef += ' pk';
      if (isUk) fieldDef += ' uk';
      if (!isNull) fieldDef += ' not null';
      
      lines[updateIndex] = fieldDef;
      
      // Update relations if field name changed
      if (newFieldName !== fieldName) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('relation')) {
            lines[i] = lines[i].replace(new RegExp(`\\b${entityName}\\.${fieldName}\\b`, 'g'), `${entityName}.${newFieldName}`);
          }
        }
      }
      
      setDsl(lines.join('\n'));
    }
    
    setShowUpdateFieldDialog(false);
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
              <select 
                value={relTargetTable}
                onChange={e => setRelTargetTable(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              >
                {availableTables.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target Field</label>
              <select 
                value={relTargetField}
                onChange={e => setRelTargetField(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableFields.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
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

  if (showUpdateRelDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUpdateRelDialog(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-96 border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Update Relationship</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cardinality</label>
              <select 
                value={relCardinality}
                onChange={e => setRelCardinality(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1 -> 1">One to One (1 -&gt; 1)</option>
                <option value="1 -> *">One to Many (1 -&gt; *)</option>
                <option value="* -> 1">Many to One (* -&gt; 1)</option>
                <option value="* -> *">Many to Many (* -&gt; *)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowUpdateRelDialog(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitUpdateEdge}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showRenameTableDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRenameTableDialog(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-96 border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Rename Table</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Table Name</label>
              <input 
                type="text" 
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && submitRenameTable()}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowRenameTableDialog(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitRenameTable}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
            >
              Rename
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showUpdateFieldDialog) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUpdateFieldDialog(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-96 border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Update Field</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Field Name</label>
              <input 
                type="text" 
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                placeholder="e.g. varchar(255), int, boolean"
              />
            </div>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={isPk} onChange={e => setIsPk(e.target.checked)} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                Primary Key
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={isUk} onChange={e => setIsUk(e.target.checked)} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                Unique
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={isNull} onChange={e => setIsNull(e.target.checked)} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                Nullable
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setShowUpdateFieldDialog(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitUpdateField}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen || contextMenu.type === 'renameTable' || contextMenu.type === 'updateField') return null;

  return (
    <div 
      className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
    >
      {contextMenu.type === 'pane' && (
        <button 
          onClick={handleAddTable}
          className="w-full text-left px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
        >
          <Plus size={14} /> Add Table
        </button>
      )}
      
      {contextMenu.type === 'edge' && (
        <>
          <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 mb-1">
            Relationship
          </div>
          <button 
            onClick={handleUpdateEdge}
            className="w-full text-left px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
          >
            <Edit2 size={14} /> Update Type
          </button>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
          <button 
            onClick={handleDeleteEdge}
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} /> Delete Relationship
          </button>
        </>
      )}

      {contextMenu.type === 'entity' && (
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
              <button 
                onClick={() => {
                  setContextMenu({ ...contextMenu, type: 'updateField' });
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
              >
                <Edit2 size={14} /> Update Field
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
