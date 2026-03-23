import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sourceCard = data?.sourceCard as string;
  const targetCard = data?.targetCard as string;
  const label = data?.label as string;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} id={id} />
      <EdgeLabelRenderer>
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#f3f4f6',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 500,
              color: '#6b7280',
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        )}
        {sourceCard && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX + (targetX > sourceX ? 25 : -25)}px,${sourceY}px)`,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              background: 'rgba(255,255,255,0.8)',
              padding: '2px 4px',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          >
            {sourceCard}
          </div>
        )}
        {targetCard && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX + (sourceX > targetX ? 25 : -25)}px,${targetY}px)`,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              background: 'rgba(255,255,255,0.8)',
              padding: '2px 4px',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          >
            {targetCard}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
