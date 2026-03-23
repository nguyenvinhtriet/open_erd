import { ASTDiagram } from './parser';

export function formatDSL(ast: ASTDiagram): string {
  let result = '';

  for (const entity of ast.entities) {
    result += `table ${entity.name} {\n`;
    for (const attr of entity.attributes) {
      result += `  ${attr.name} ${attr.type}`;
      if (attr.isPk) result += ' pk';
      if (attr.isUk) result += ' uk';
      if (attr.isFk) {
        result += ' fk';
        if (attr.fkTarget) {
          result += ` -> ${attr.fkTarget.entity}.${attr.fkTarget.field}`;
        }
      }
      result += '\n';
    }
    result += '}\n\n';
  }

  for (const rel of ast.relations) {
    result += `relation ${rel.source.entity}.${rel.source.field} ${rel.sourceCard} -> ${rel.targetCard} ${rel.target.entity}.${rel.target.field}`;
    if (rel.label) {
      result += ` : "${rel.label}"`;
    }
    result += '\n';
  }

  return result.trim() + '\n';
}
