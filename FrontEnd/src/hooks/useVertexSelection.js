import { useState, useCallback, useRef } from 'react';

/**
 * Hook para selección precisa de vértices con radio configurable
 * Implementa retroalimentación visual y priorización por proximidad
 */
function useVertexSelection(editableVectors, transform) {
  const [selectedVertices, setSelectedVertices] = useState([]);
  const [hoveredVertex, setHoveredVertex] = useState(null);
  const [selectionRadiusPercent] = useState(0.005); // Radio como porcentaje de la diagonal de la imagen
  const selectionHistory = useRef([]);

  // Radio de detección relativo al tamaño de la imagen
  const getSelectionRadius = useCallback(() => {
    // Calcular la diagonal de la imagen
    const canvas = document.querySelector('canvas');
    if (!canvas) return 10;
    
    const imageDiagonal = Math.sqrt(
      Math.pow(canvas.width, 2) + 
      Math.pow(canvas.height, 2)
    );
    
    // Calcular el radio base como porcentaje de la diagonal
    const baseRadius = imageDiagonal * selectionRadiusPercent;
    
    // Ajustar por el zoom
    const scaleFactor = Math.max(0.5, Math.min(2, 1 / transform.scale));
    return baseRadius * scaleFactor;
  }, [selectionRadiusPercent, transform.scale]);

  /**
   * Encuentra el vértice más cercano al cursor
   */
  const findNearestVertex = useCallback((x, y, maxDistance = null) => {
    const searchRadius = maxDistance || getSelectionRadius();
    let nearest = null;
    let minDistance = searchRadius;

    // Buscar en todos los tipos de vectores
    ['bordes_externos', 'sublotes'].forEach(vectorType => {
      editableVectors[vectorType]?.forEach((vector, vectorIndex) => {
        vector?.forEach((point, pointIndex) => {
          if (!point || point.length < 2) return;
          
          const distance = Math.sqrt(
            Math.pow(x - point[0], 2) + Math.pow(y - point[1], 2)
          );

          if (distance < minDistance) {
            nearest = {
              type: vectorType,
              vectorIndex,
              pointIndex,
              point: [point[0], point[1]],
              distance,
              priority: vectorType === 'sublotes' ? 1 : 0 // Priorizar sublotes
            };
            minDistance = distance;
          }
        });
      });
    });

    return nearest;
  }, [editableVectors, getAdjustedRadius]);

  /**
   * Encuentra múltiples vértices en un área
   */
  const findVerticesInArea = useCallback((centerX, centerY, radius = null) => {
    const searchRadius = radius || getSelectionRadius() * 1.5;
    const found = [];

    ['bordes_externos', 'sublotes'].forEach(vectorType => {
      editableVectors[vectorType]?.forEach((vector, vectorIndex) => {
        vector?.forEach((point, pointIndex) => {
          if (!point || point.length < 2) return;
          
          const distance = Math.sqrt(
            Math.pow(centerX - point[0], 2) + Math.pow(centerY - point[1], 2)
          );

          if (distance <= searchRadius) {
            found.push({
              type: vectorType,
              vectorIndex,
              pointIndex,
              point: [point[0], point[1]],
              distance
            });
          }
        });
      });
    });

    // Ordenar por distancia
    return found.sort((a, b) => a.distance - b.distance);
  }, [editableVectors, getAdjustedRadius]);

  /**
   * Verifica si un vértice está seleccionado
   */
  const isVertexSelected = useCallback((vertex) => {
    return selectedVertices.some(selected => 
      selected.type === vertex.type &&
      selected.vectorIndex === vertex.vectorIndex &&
      selected.pointIndex === vertex.pointIndex
    );
  }, [selectedVertices]);

  /**
   * Selecciona un vértice individual
   */
  const selectVertex = useCallback((vertex, addToSelection = false) => {
    if (!vertex) return;

    console.log('Seleccionando vértice:', vertex);

    setSelectedVertices(prev => {
      // Si no se está agregando a la selección, limpiar selección anterior
      if (!addToSelection) {
        return [vertex];
      }

      // Verificar si ya está seleccionado
      const isAlreadySelected = prev.some(selected => 
        selected.type === vertex.type &&
        selected.vectorIndex === vertex.vectorIndex &&
        selected.pointIndex === vertex.pointIndex
      );

      if (isAlreadySelected) {
        // Deseleccionar si ya estaba seleccionado
        return prev.filter(selected => 
          !(selected.type === vertex.type &&
            selected.vectorIndex === vertex.vectorIndex &&
            selected.pointIndex === vertex.pointIndex)
        );
      } else {
        // Agregar a la selección
        return [...prev, vertex];
      }
    });

    // Guardar en historial
    selectionHistory.current.push({
      action: 'select',
      vertex,
      timestamp: Date.now()
    });

    // Mantener historial limitado
    if (selectionHistory.current.length > 50) {
      selectionHistory.current = selectionHistory.current.slice(-25);
    }
  }, []);

  /**
   * Selecciona múltiples vértices en un área
   */
  const selectVerticesInArea = useCallback((centerX, centerY, radius = null) => {
    const vertices = findVerticesInArea(centerX, centerY, radius);
    
    if (vertices.length > 0) {
      setSelectedVertices(prev => {
        const newSelection = [...prev];
        
        vertices.forEach(vertex => {
          const isAlreadySelected = newSelection.some(selected => 
            selected.type === vertex.type &&
            selected.vectorIndex === vertex.vectorIndex &&
            selected.pointIndex === vertex.pointIndex
          );

          if (!isAlreadySelected) {
            newSelection.push(vertex);
          }
        });

        return newSelection;
      });

      console.log(`Seleccionados ${vertices.length} vértices en área`);
      return vertices.length;
    }

    return 0;
  }, [findVerticesInArea]);

  /**
   * Deselecciona todos los vértices
   */
  const clearSelection = useCallback(() => {
    console.log('Limpiando selección de vértices');
    setSelectedVertices([]);
    setHoveredVertex(null);
    
    selectionHistory.current.push({
      action: 'clear',
      timestamp: Date.now()
    });
  }, []);

  /**
   * Actualiza el vértice bajo hover
   */
  const updateHover = useCallback((x, y) => {
    const vertex = findNearestVertex(x, y);
    
    if (vertex && vertex.distance <= getAdjustedRadius()) {
      setHoveredVertex(vertex);
    } else {
      setHoveredVertex(null);
    }
  }, [findNearestVertex, getSelectionRadius]);

  /**
   * Elimina vértices seleccionados
   */
  const deleteSelectedVertices = useCallback(() => {
    if (selectedVertices.length === 0) return [];

    console.log(`Eliminando ${selectedVertices.length} vértices seleccionados`);
    
    // Agrupar por vector para eliminación eficiente
    const deletionMap = new Map();
    
    selectedVertices.forEach(vertex => {
      const key = `${vertex.type}-${vertex.vectorIndex}`;
      if (!deletionMap.has(key)) {
        deletionMap.set(key, []);
      }
      deletionMap.get(key).push(vertex.pointIndex);
    });

    // Retornar información para que el componente padre maneje la eliminación
    const deletions = Array.from(deletionMap.entries()).map(([key, pointIndices]) => {
      const [type, vectorIndexStr] = key.split('-');
      return {
        type,
        vectorIndex: parseInt(vectorIndexStr),
        pointIndices: pointIndices.sort((a, b) => b - a) // Ordenar descendente para eliminación segura
      };
    });

    // Limpiar selección después de eliminar
    clearSelection();

    return deletions;
  }, [selectedVertices, clearSelection]);

  /**
   * Configura el radio de selección
   */
  const setRadius = useCallback((newRadius) => {
    const clampedRadius = Math.max(3, Math.min(20, newRadius));
    setSelectionRadius(clampedRadius);
    console.log(`Radio de selección actualizado: ${clampedRadius}px`);
  }, []);

  /**
   * Obtiene estadísticas de selección
   */
  const getSelectionStats = useCallback(() => {
    const stats = {
      totalSelected: selectedVertices.length,
      byType: {},
      currentRadius: getAdjustedRadius(),
      baseRadius: selectionRadius,
      zoomFactor: transform.scale
    };

    selectedVertices.forEach(vertex => {
      if (!stats.byType[vertex.type]) {
        stats.byType[vertex.type] = 0;
      }
      stats.byType[vertex.type]++;
    });

    return stats;
  }, [selectedVertices, getAdjustedRadius, selectionRadius, transform.scale]);

  return {
    // Estado
    selectedVertices,
    hoveredVertex,
    selectionRadius,

    // Funciones de búsqueda
    findNearestVertex,
    findVerticesInArea,

    // Funciones de selección
    selectVertex,
    selectVerticesInArea,
    clearSelection,
    isVertexSelected,

    // Funciones de hover
    updateHover,

    // Funciones de eliminación
    deleteSelectedVertices,

    // Configuración
    setRadius,
    getAdjustedRadius,

    // Información
    getSelectionStats,
    selectionHistory: selectionHistory.current
  };
}

export default useVertexSelection;
