import { useState, useCallback, useRef } from 'react';

/**
 * Sistema de vértices compartidos para conexiones reales entre vectores
 * Este hook gestiona vértices únicos que pueden ser referenciados por múltiples vectores
 */
function useSharedVertexSystem() {
  // Mapa de vértices únicos: ID -> {x, y, connections: [{vectorType, vectorIndex, pointIndex}]}
  const [sharedVertices, setSharedVertices] = useState(new Map());
  const vertexIdCounter = useRef(0);
  
  // Tolerancia para considerar que dos puntos son el mismo vértice
  const MERGE_TOLERANCE = 20;

  /**
   * Genera un nuevo ID único para un vértice
   */
  const generateVertexId = useCallback(() => {
    return `vertex_${++vertexIdCounter.current}`;
  }, []);

  /**
   * Encuentra un vértice existente en la posición dada
   */
  const findVertexAtPosition = useCallback((x, y, tolerance = MERGE_TOLERANCE) => {
    for (const [id, vertex] of sharedVertices) {
      const distance = Math.sqrt(Math.pow(x - vertex.x, 2) + Math.pow(y - vertex.y, 2));
      if (distance <= tolerance) {
        return { id, vertex };
      }
    }
    return null;
  }, [sharedVertices]);

  /**
   * Crea o encuentra un vértice en la posición dada
   */
  const getOrCreateVertex = useCallback((x, y, vectorType, vectorIndex, pointIndex) => {
    // Buscar vértice existente en esa posición
    const existing = findVertexAtPosition(x, y);
    
    if (existing) {
      // Agregar nueva conexión al vértice existente
      const updatedVertex = {
        ...existing.vertex,
        connections: [
          ...existing.vertex.connections.filter(conn => 
            !(conn.vectorType === vectorType && 
              conn.vectorIndex === vectorIndex && 
              conn.pointIndex === pointIndex)
          ),
          { vectorType, vectorIndex, pointIndex }
        ]
      };
      
      setSharedVertices(prev => new Map(prev).set(existing.id, updatedVertex));
      return existing.id;
    } else {
      // Crear nuevo vértice
      const newId = generateVertexId();
      const newVertex = {
        x,
        y,
        connections: [{ vectorType, vectorIndex, pointIndex }]
      };
      
      setSharedVertices(prev => new Map(prev).set(newId, newVertex));
      return newId;
    }
  }, [findVertexAtPosition, generateVertexId]);

  /**
   * Mueve un vértice y actualiza todas sus conexiones
   */
  const moveVertex = useCallback((vertexId, newX, newY) => {
    const vertex = sharedVertices.get(vertexId);
    if (!vertex) return null;

    const updatedVertex = { ...vertex, x: newX, y: newY };
    setSharedVertices(prev => new Map(prev).set(vertexId, updatedVertex));
    
    // Retornar las conexiones que necesitan actualizarse
    return vertex.connections;
  }, [sharedVertices]);

  /**
   * Conecta dos vértices realmente (los fusiona en uno solo)
   */
  const connectVertices = useCallback((vertexId1, vertexId2) => {
    const vertex1 = sharedVertices.get(vertexId1);
    const vertex2 = sharedVertices.get(vertexId2);
    
    if (!vertex1 || !vertex2 || vertexId1 === vertexId2) return null;

    // Fusionar conexiones en el primer vértice
    const mergedVertex = {
      ...vertex1,
      connections: [
        ...vertex1.connections,
        ...vertex2.connections
      ]
    };

    // Actualizar mapas
    setSharedVertices(prev => {
      const newMap = new Map(prev);
      newMap.set(vertexId1, mergedVertex);
      newMap.delete(vertexId2);
      return newMap;
    });

    // Retornar info sobre la fusión
    return {
      mergedVertexId: vertexId1,
      removedVertexId: vertexId2,
      allConnections: mergedVertex.connections
    };
  }, [sharedVertices]);

  /**
   * Elimina un vértice y todas sus conexiones
   */
  const removeVertex = useCallback((vertexId) => {
    const vertex = sharedVertices.get(vertexId);
    if (!vertex) return null;

    setSharedVertices(prev => {
      const newMap = new Map(prev);
      newMap.delete(vertexId);
      return newMap;
    });

    return vertex.connections;
  }, [sharedVertices]);

  /**
   * Inicializa el sistema con vectores existentes
   */
  const initializeFromVectors = useCallback((vectors) => {
    // Evitar re-inicialización innecesaria
    if (!vectors || (Object.keys(vectors).length === 0)) return;
    
    const newVertexMap = new Map();
    vertexIdCounter.current = 0;

    // Procesar cada tipo de vector
    Object.entries(vectors).forEach(([vectorType, vectorList]) => {
      if (!Array.isArray(vectorList)) return;
      
      vectorList.forEach((vector, vectorIndex) => {
        if (!Array.isArray(vector)) return;
        
        vector.forEach((point, pointIndex) => {
          if (!Array.isArray(point) || point.length < 2) return;
          
          const [x, y] = point;
          
          // Buscar si ya existe un vértice en esta posición
          let existingVertexId = null;
          for (const [id, vertex] of newVertexMap) {
            const distance = Math.sqrt(Math.pow(x - vertex.x, 2) + Math.pow(y - vertex.y, 2));
            if (distance <= MERGE_TOLERANCE) {
              existingVertexId = id;
              break;
            }
          }

          if (existingVertexId) {
            // Agregar conexión al vértice existente
            const existingVertex = newVertexMap.get(existingVertexId);
            existingVertex.connections.push({ vectorType, vectorIndex, pointIndex });
          } else {
            // Crear nuevo vértice
            const newId = `vertex_${++vertexIdCounter.current}`;
            newVertexMap.set(newId, {
              x,
              y,
              connections: [{ vectorType, vectorIndex, pointIndex }]
            });
          }
        });
      });
    });

    // Solo actualizar si realmente hay cambios
    if (newVertexMap.size > 0) {
      setSharedVertices(newVertexMap);
    }
  }, []);

  /**
   * Obtiene la posición de un vértice
   */
  const getVertexPosition = useCallback((vertexId) => {
    const vertex = sharedVertices.get(vertexId);
    return vertex ? { x: vertex.x, y: vertex.y } : null;
  }, [sharedVertices]);

  /**
   * Obtiene todas las conexiones de un vértice
   */
  const getVertexConnections = useCallback((vertexId) => {
    const vertex = sharedVertices.get(vertexId);
    return vertex ? vertex.connections : [];
  }, [sharedVertices]);

  /**
   * Encuentra el vértice más cercano a una posición
   */
  const findNearestVertex = useCallback((x, y, maxDistance = 50) => {
    let nearest = null;
    let minDistance = maxDistance;

    for (const [id, vertex] of sharedVertices) {
      const distance = Math.sqrt(Math.pow(x - vertex.x, 2) + Math.pow(y - vertex.y, 2));
      if (distance < minDistance) {
        nearest = { id, vertex, distance };
        minDistance = distance;
      }
    }

    return nearest;
  }, [sharedVertices]);

  return {
    // Estado
    sharedVertices,
    
    // Operaciones de vértices
    getOrCreateVertex,
    moveVertex,
    connectVertices,
    removeVertex,
    getVertexPosition,
    getVertexConnections,
    findVertexAtPosition,
    findNearestVertex,
    
    // Inicialización
    initializeFromVectors,
    
    // Constantes
    MERGE_TOLERANCE
  };
}

export default useSharedVertexSystem;
