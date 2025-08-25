import React from 'react';

/**
 * Componente que renderiza los vértices seleccionados en el canvas
 * Muestra indicadores visuales de los puntos seleccionados y conexiones
 */
function SelectedVerticesOverlay({ 
  selectedVertices, 
  sublotPreview, 
  isActive, 
  canvasScale, 
  canvasOffset 
}) {
  if (!isActive || selectedVertices.length === 0) {
    return null;
  }

  // Convertir coordenadas de canvas a coordenadas de pantalla
  const toScreenCoords = (canvasX, canvasY) => {
    return {
      x: (canvasX * canvasScale) + canvasOffset.x,
      y: (canvasY * canvasScale) + canvasOffset.y
    };
  };

  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ zIndex: 500 }}
    >
      {/* Preview del polígono si hay suficientes vértices */}
      {sublotPreview && sublotPreview.vertices.length >= 3 && (
        <polygon
          points={sublotPreview.vertices.map(vertex => {
            const screen = toScreenCoords(vertex[0], vertex[1]);
            return `${screen.x},${screen.y}`;
          }).join(' ')}
          fill={sublotPreview.isValid ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)"}
          stroke={sublotPreview.isValid ? "#22c55e" : "#f59e0b"}
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      )}

      {/* Líneas de conexión entre vértices seleccionados */}
      {selectedVertices.length >= 2 && selectedVertices.map((vertex, index) => {
        if (index === selectedVertices.length - 1) return null;
        
        const current = toScreenCoords(vertex.coordinates[0], vertex.coordinates[1]);
        const next = toScreenCoords(
          selectedVertices[index + 1].coordinates[0], 
          selectedVertices[index + 1].coordinates[1]
        );

        return (
          <line
            key={`connection-${index}`}
            x1={current.x}
            y1={current.y}
            x2={next.x}
            y2={next.y}
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="3,3"
            opacity="0.7"
          />
        );
      })}

      {/* Línea de cierre si hay 3 o más vértices */}
      {selectedVertices.length >= 3 && (
        (() => {
          const first = toScreenCoords(
            selectedVertices[0].coordinates[0], 
            selectedVertices[0].coordinates[1]
          );
          const last = toScreenCoords(
            selectedVertices[selectedVertices.length - 1].coordinates[0], 
            selectedVertices[selectedVertices.length - 1].coordinates[1]
          );

          return (
            <line
              x1={last.x}
              y1={last.y}
              x2={first.x}
              y2={first.y}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="3,3"
              opacity="0.5"
            />
          );
        })()
      )}

      {/* Vértices seleccionados */}
      {selectedVertices.map((vertex, index) => {
        const screen = toScreenCoords(vertex.coordinates[0], vertex.coordinates[1]);
        
        return (
          <g key={`vertex-${index}`}>
            {/* Círculo exterior (indicador de selección) */}
            <circle
              cx={screen.x}
              cy={screen.y}
              r="12"
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            
            {/* Círculo interior */}
            <circle
              cx={screen.x}
              cy={screen.y}
              r="6"
              fill="#3b82f6"
            />
            
            {/* Número del vértice */}
            <text
              x={screen.x}
              y={screen.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="bold"
              fill="white"
            >
              {index + 1}
            </text>

            {/* Animación de selección */}
            <circle
              cx={screen.x}
              cy={screen.y}
              r="12"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1"
              opacity="0.6"
            >
              <animate
                attributeName="r"
                values="12;16;12"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0.2;0.6"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      })}

      {/* Indicador de área si hay preview */}
      {sublotPreview && sublotPreview.vertices.length >= 3 && (
        (() => {
          // Calcular centro del polígono para mostrar información
          const centerX = sublotPreview.vertices.reduce((sum, v) => sum + v[0], 0) / sublotPreview.vertices.length;
          const centerY = sublotPreview.vertices.reduce((sum, v) => sum + v[1], 0) / sublotPreview.vertices.length;
          const center = toScreenCoords(centerX, centerY);

          return (
            <g>
              {/* Fondo del texto */}
              <rect
                x={center.x - 40}
                y={center.y - 15}
                width="80"
                height="30"
                rx="5"
                fill="rgba(255, 255, 255, 0.9)"
                stroke={sublotPreview.isValid ? "#22c55e" : "#f59e0b"}
                strokeWidth="1"
              />
              
              {/* Texto del área */}
              <text
                x={center.x}
                y={center.y - 3}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="bold"
                fill={sublotPreview.isValid ? "#22c55e" : "#f59e0b"}
              >
                {sublotPreview.area.toFixed(0)} px²
              </text>
              
              {/* Estado */}
              <text
                x={center.x}
                y={center.y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fill={sublotPreview.isValid ? "#22c55e" : "#f59e0b"}
              >
                {sublotPreview.isValid ? "✓ Válido" : "⚠ Pequeño"}
              </text>
            </g>
          );
        })()
      )}
    </svg>
  );
}

export default SelectedVerticesOverlay;
