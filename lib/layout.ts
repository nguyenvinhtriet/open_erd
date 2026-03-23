import ELK from 'elkjs/lib/elk.bundled.js';
import { ASTDiagram } from './parser';
import { Node, Edge, MarkerType } from '@xyflow/react';

const elk = new ELK();

export type LayoutAlgorithm = 'left-right' | 'snowflake' | 'compact';

export async function getLayoutedElements(
  ast: ASTDiagram,
  algorithm: LayoutAlgorithm = 'left-right'
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  let direction = 'RIGHT';
  let layoutOptions: any = {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.spacing.nodeNode': '120',
    'elk.layered.spacing.nodeNodeBetweenLayers': '250',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  };

  if (algorithm === 'snowflake') {
    layoutOptions = {
      'elk.algorithm': 'force',
      'elk.spacing.nodeNode': '200',
    };
    direction = 'ANY';
  } else if (algorithm === 'compact') {
    layoutOptions = {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    };
    direction = 'DOWN';
  }

  const isHorizontal = direction === 'RIGHT' || direction === 'ANY';

  const nodes: Node[] = ast.entities.map((entity) => ({
    id: entity.name,
    type: 'entity',
    data: entity as unknown as Record<string, unknown>,
    position: { x: 0, y: 0 },
    // Approximate width and height based on content
    width: 250,
    height: 40 + entity.attributes.length * 32,
  }));

  const edges: Edge[] = ast.relations.map((rel, i) => {
    const isSourceMany = rel.sourceCard === '*' || rel.sourceCard.toLowerCase() === 'n';
    const isTargetMany = rel.targetCard === '*' || rel.targetCard.toLowerCase() === 'n';

    const sourceEntity = ast.entities.find(e => e.name === rel.source.entity);
    const sourceAttr = sourceEntity?.attributes.find(a => a.name === rel.source.field);
    const isSourceOptional = sourceAttr?.isNull !== false; // Default to optional if not explicitly not null

    const targetEntity = ast.entities.find(e => e.name === rel.target.entity);
    const targetAttr = targetEntity?.attributes.find(a => a.name === rel.target.field);
    const isTargetOptional = targetAttr?.isNull !== false;

    const sourceMarker = `url(#crow-${isSourceMany ? 'many' : 'one'}-${isSourceOptional ? 'optional' : 'mandatory'}-start)`;
    const targetMarker = `url(#crow-${isTargetMany ? 'many' : 'one'}-${isTargetOptional ? 'optional' : 'mandatory'}-end)`;

    return {
      id: `e${i}-${rel.source.entity}-${rel.target.entity}`,
      source: rel.source.entity,
      target: rel.target.entity,
      sourceHandle: `${rel.source.field}-right-source`,
      targetHandle: `${rel.target.field}-left-target`,
      type: 'relation',
      data: {
        sourceCard: rel.sourceCard,
        targetCard: rel.targetCard,
        label: rel.label,
      },
      markerEnd: targetMarker,
      markerStart: sourceMarker,
      animated: false,
      style: { stroke: '#64748b', strokeWidth: 2 },
    };
  });

  const graph = {
    id: 'root',
    layoutOptions,
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width,
      height: n.height,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layoutedGraph = await elk.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: layoutedNode?.x || 0,
        y: layoutedNode?.y || 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
