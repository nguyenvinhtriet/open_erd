import { create } from 'zustand';
import { parseDSL, ASTDiagram } from './parser';
import LZString from 'lz-string';

const DEFAULT_DSL = `table User {
  id int pk
  email varchar(255) uk not null
  name varchar(255) not null
  created_at datetime
}

table Post {
  id int pk
  author_id int fk -> User.id not null
  title varchar(255) not null
  body text
  created_at datetime
}

// One user has many posts
relation User.id 1 -> * Post.author_id : "writes"
`;

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'entity' | 'edge' | 'pane' | 'renameTable' | 'updateField' | 'createRel';
  entityName: string;
  fieldName?: string;
  edgeId?: string;
  sourceEntity?: string;
  sourceField?: string;
  targetEntity?: string;
  targetField?: string;
  cardinality?: string;
}

interface AppState {
  dsl: string;
  ast: ASTDiagram | null;
  errors: any[];
  contextMenu: ContextMenuState;
  setDsl: (dsl: string) => void;
  setContextMenu: (menu: Partial<ContextMenuState>) => void;
  closeContextMenu: () => void;
  loadFromHash: () => void;
  saveToHash: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  dsl: DEFAULT_DSL,
  ast: parseDSL(DEFAULT_DSL).ast,
  errors: parseDSL(DEFAULT_DSL).errors,
  contextMenu: { isOpen: false, x: 0, y: 0, type: 'pane', entityName: '' },
  setDsl: (dsl) => {
    const { ast, errors } = parseDSL(dsl);
    set({ dsl, ast: ast || get().ast, errors });
    localStorage.setItem('openerd-dsl', dsl);
  },
  setContextMenu: (menu) => set((state) => ({ contextMenu: { ...state.contextMenu, ...menu } })),
  closeContextMenu: () => set((state) => ({ contextMenu: { ...state.contextMenu, isOpen: false } })),
  loadFromHash: () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const compressed = params.get('g');
      if (compressed) {
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          get().setDsl(decompressed);
          return;
        }
      }
    }
    const saved = localStorage.getItem('openerd-dsl');
    if (saved) {
      get().setDsl(saved);
    }
  },
  saveToHash: () => {
    const compressed = LZString.compressToEncodedURIComponent(get().dsl);
    window.location.hash = `g=${compressed}`;
  },
}));
