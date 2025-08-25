import { useState, useCallback, useRef, useEffect } from 'react';
import { TOOL_TYPES } from '../components/ui/DrawingTools';
import SubplotAnalyzerRobust from '../services/utils/SubplotAnalyzerRobust';
import useSharedVertexSystem from './useSharedVertexSystem';

/**
 * Hook para manejar todas las operaciones de edición vectorial
 * Incluye: eliminar vértices, agregar vértices, líneas rectas, detección inteligente
 * Mejoras: snap a bordes, auto-unión de vértices, fusión al arrastrar
 */

/**
 * Verifica si una nueva línea forma un polígono cerrado con bordes existentes
 * MEJORADO: Solo detecta polígonos explícitamente cerrados por el usuario
 * @param {Object} vectors - Vectores editables actuales
 * @param {Array} newLine - Nueva línea dibujada
 * @param {SubplotAnalyzer} analyzer - Instancia del analizador
 * @returns {Array|null} - Polígono detectado o null si no se forma uno
 */
const checkForClosedPolygon = (vectors, newLine, analyzer) => {
  if (newLine.length < 2) return null;
  
  console.log('🔍 Analizando nueva línea para sublotes explícitamente cerrados...');
  
  // Solo usar bordes externos para el análisis principal
  const bordersOnly = [...vectors.bordes_externos];
  
  // MEJORADO: Verificar conexiones reales de la nueva línea
  const newLineStart = newLine[0];
  const newLineEnd = newLine[newLine.length - 1];
  
  // Buscar conexiones explícitas de la nueva línea con bordes existentes
  let connectionsFound = 0;
  const connectedBorders = [];
  
  bordersOnly.forEach((border, borderIndex) => {
    const borderStart = border[0];
    const borderEnd = border[border.length - 1];
    
    // Verificar conexiones en endpoints
    const tolerance = 20;
    
    if (Math.sqrt(Math.pow(newLineStart[0] - borderStart[0], 2) + Math.pow(newLineStart[1] - borderStart[1], 2)) < tolerance ||
        Math.sqrt(Math.pow(newLineStart[0] - borderEnd[0], 2) + Math.pow(newLineStart[1] - borderEnd[1], 2)) < tolerance ||
        Math.sqrt(Math.pow(newLineEnd[0] - borderStart[0], 2) + Math.pow(newLineEnd[1] - borderStart[1], 2)) < tolerance ||
        Math.sqrt(Math.pow(newLineEnd[0] - borderEnd[0], 2) + Math.pow(newLineEnd[1] - borderEnd[1], 2)) < tolerance) {
      connectionsFound++;
      connectedBorders.push(borderIndex);
    }
  });
  
  console.log(`🔗 Conexiones explícitas encontradas: ${connectionsFound}`);
  
  // Solo proceder si hay conexiones explícitas reales
  if (connectionsFound < 1) {
    console.log('❌ Nueva línea no conecta explícitamente con bordes existentes');
    return null;
  }
  
  // Analizar ANTES de agregar la nueva línea
  const resultBefore = analyzer.analyzeSubplots(bordersOnly);
  const sublotsBeforeCount = resultBefore.sublots.length;
  
  console.log(`📊 Estado previo: ${sublotsBeforeCount} sublotes detectables`);
  
  // Crear conjunto temporal con la nueva línea
  const tempVectors = [...bordersOnly, newLine];
  
  // Analizar DESPUÉS de agregar la nueva línea
  const resultAfter = analyzer.analyzeSubplots(tempVectors);
  
  // MEJORADO: Verificar que efectivamente se creó un polígono nuevo específico
  if (resultAfter.sublots.length > sublotsBeforeCount) {
    // Encontrar sublotes que sean genuinamente nuevos y contengan la nueva línea
    const genuinelyNewSublots = resultAfter.sublots.filter(sublot => {
      // 1. Debe contener puntos de la nueva línea
      const containsNewLinePoints = newLine.some(newPoint => {
        return sublot.vertices.some(vertex => {
          const distance = Math.sqrt(
            Math.pow(newPoint[0] - vertex[0], 2) + 
            Math.pow(newPoint[1] - vertex[1], 2)
          );
          return distance < 25; // Tolerancia ajustada
        });
      });
      
      if (!containsNewLinePoints) return false;
      
      // 2. No debe ser igual a ningún sublote anterior
      const isReallyNew = !resultBefore.sublots.some(existingSublot => {
        return analyzer.areSublotsEqual(sublot, existingSublot);
      });
      
      if (!isReallyNew) return false;
      
      // 3. NUEVA VALIDACIÓN: No debe ser combinación de sublotes existentes del estado actual
      const existingSublotsInVectors = vectors.sublotes || [];
      if (existingSublotsInVectors.length >= 2) {
        const sublotArea = Math.abs(sublot.area || analyzer.calculatePolygonArea(sublot.vertices));
        
        // Verificar si es combinación de sublotes ya guardados
        for (let i = 0; i < existingSublotsInVectors.length - 1; i++) {
          for (let j = i + 1; j < existingSublotsInVectors.length; j++) {
            const area1 = Math.abs(analyzer.calculatePolygonArea(existingSublotsInVectors[i]));
            const area2 = Math.abs(analyzer.calculatePolygonArea(existingSublotsInVectors[j]));
            const combinedArea = area1 + area2;
            
            // Si el área es similar a la suma de dos sublotes existentes
            if (Math.abs(sublotArea - combinedArea) < Math.min(area1, area2) * 0.15) {
              console.log(`🚫 Sublote rechazado: posible combinación de sublotes ${i} y ${j}`);
              return false;
            }
          }
        }
      }
      
      return true;
    });
    
    if (genuinelyNewSublots.length > 0) {
      // Seleccionar el sublote más pequeño (más específico) si hay múltiples
      const bestSublot = genuinelyNewSublots.reduce((best, current) => {
        const currentArea = Math.abs(current.area || analyzer.calculatePolygonArea(current.vertices));
        const bestArea = Math.abs(best.area || analyzer.calculatePolygonArea(best.vertices));
        return currentArea < bestArea ? current : best;
      });
      
      console.log('🎯 SUBLOTE EXPLÍCITAMENTE CERRADO DETECTADO:', {
        vertices: bestSublot.vertices.length,
        area: (bestSublot.area || analyzer.calculatePolygonArea(bestSublot.vertices)).toFixed(2),
        method: bestSublot.method,
        connections: connectionsFound
      });
      
      return bestSublot.vertices;
    }
  }
  
  console.log('❌ No se detectaron sublotes explícitamente cerrados válidos');
  return null;
};





// Función no utilizada, comentada para evitar warning
// const calculatePolygonArea = (vertices) => {
//   if (vertices.length < 3) return 0;
//   let area = 0;
//   const n = vertices.length;
//   for (let i = 0; i < n; i++) {
//     const j = (i + 1) % n;
//     area += vertices[i][0] * vertices[j][1];
//     area -= vertices[j][0] * vertices[i][1];
//   }
//   return Math.abs(area) / 2;
// };

function useVectorEditing(editableVectors, setEditableVectors, coordinates, transform) {
  const [activeTool, setActiveTool] = useState(TOOL_TYPES.SELECT);
  const [selectedVertices, setSelectedVertices] = useState([]);
  const [drawingPath, setDrawingPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointsToConnect, setPointsToConnect] = useState([]);
  
  // Referencias para el estado temporal
  const drawingRef = useRef({
    startPoint: null,
    currentPath: [],
    snapToGrid: false
  });

  // Instancia del analizador robusto de sublotes (memo para evitar reconstrucción)
  const subplotAnalyzer = useRef();
  if (!subplotAnalyzer.current) {
    subplotAnalyzer.current = new SubplotAnalyzerRobust();
  }

  // Sistema de vértices compartidos para conexiones reales
  const vertexSystem = useSharedVertexSystem();

  // Inicializar sistema de vértices cuando cambien los vectores editables
  useEffect(() => {
    if (editableVectors && (editableVectors.bordes_externos?.length > 0 || editableVectors.sublotes?.length > 0)) {
      vertexSystem.initializeFromVectors(editableVectors);
    }
  }, [editableVectors.bordes_externos, editableVectors.sublotes]); // Solo depende de los arrays, no del sistema completo

  // Cambiar herramienta activa
  const setTool = useCallback((toolType) => {
    setActiveTool(toolType);
    setSelectedVertices([]);
    setDrawingPath([]);
    setIsDrawing(false);
    setPointsToConnect([]);
    drawingRef.current = { startPoint: null, currentPath: [], snapToGrid: false };
  }, []);

  // Encontrar el vértice más cercano usando el sistema de vértices compartidos (MEJORADO)
  const findVertexAt = useCallback((x, y, maxDistance = 25) => {
    // Tolerancia dinámica basada en escala: más pequeña cuando hay zoom
    const dynamicTolerance = Math.max(10, maxDistance / Math.max(1, transform.scale * 0.5));
    
    const nearestSharedVertex = vertexSystem.findNearestVertex(x, y, dynamicTolerance);
    
    if (nearestSharedVertex) {
      // Obtener la primera conexión para compatibilidad con el sistema anterior
      const firstConnection = nearestSharedVertex.vertex.connections[0];
      if (firstConnection) {
        return {
          type: firstConnection.vectorType,
          vectorIndex: firstConnection.vectorIndex,
          pointIndex: firstConnection.pointIndex,
          distance: nearestSharedVertex.distance,
          point: [nearestSharedVertex.vertex.x, nearestSharedVertex.vertex.y],
          vertexId: nearestSharedVertex.id, // ID del vértice compartido
          allConnections: nearestSharedVertex.vertex.connections, // Todas las conexiones
          actualTolerance: dynamicTolerance // Para debugging
        };
      }
    }
    
    return null;
  }, [vertexSystem, transform]);

  // Encontrar el punto más cercano en una línea para agregar un vértice (x, y en coordenadas del mundo)
  const findNearestEdge = useCallback((x, y, maxDistance = 15) => {
    let nearest = null;
    let minDistance = maxDistance;

    const checkVector = (vector, type, vectorIndex) => {
      for (let i = 0; i < vector.length - 1; i++) {
        // Convertir puntos de imagen a coordenadas del canvas y luego del mundo
        const p1Canvas = coordinates.imageToCanvas(vector[i][0], vector[i][1]);
        const p2Canvas = coordinates.imageToCanvas(vector[i + 1][0], vector[i + 1][1]);
        
        const wp1 = coordinates.canvasToWorld(p1Canvas.x, p1Canvas.y);
        const wp2 = coordinates.canvasToWorld(p2Canvas.x, p2Canvas.y);
        
        // Calcular distancia punto-línea en coordenadas del mundo
        const A = x - wp1.x;
        const B = y - wp1.y;
        const C = wp2.x - wp1.x;
        const D = wp2.y - wp1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) continue;
        
        const param = dot / lenSq;
        
        if (param < 0 || param > 1) continue;
        
        const xx = wp1.x + param * C;
        const yy = wp1.y + param * D;
        
        const distance = Math.sqrt(Math.pow(x - xx, 2) + Math.pow(y - yy, 2));
        
        if (distance < minDistance) {
          // Convertir el punto de intersección a coordenadas de imagen
          const canvasCoord = coordinates.worldToCanvas(xx, yy);
          const imageCoord = coordinates.canvasToImage(canvasCoord.x, canvasCoord.y);
          
          nearest = {
            type,
            vectorIndex,
            insertIndex: i + 1,
            point: [imageCoord.x, imageCoord.y],
            distance
          };
          minDistance = distance;
        }
      }
    };

    editableVectors.bordes_externos.forEach((vector, vectorIndex) => {
      checkVector(vector, 'bordes_externos', vectorIndex);
    });

    editableVectors.sublotes.forEach((vector, vectorIndex) => {
      checkVector(vector, 'sublotes', vectorIndex);
    });

    return nearest;
  }, [editableVectors, coordinates]);

  // Eliminar vértices seleccionados y conectar automáticamente los puntos adyacentes
  const deleteSelectedVertices = useCallback(() => {
    if (selectedVertices.length === 0) return;

    setEditableVectors(prev => {
      const newVectors = JSON.parse(JSON.stringify(prev)); // Deep copy para evitar mutaciones
      
      // Agrupar por tipo y vector para eliminar de manera eficiente
      const toDelete = {};
      selectedVertices.forEach(vertex => {
        const key = `${vertex.type}_${vertex.vectorIndex}`;
        if (!toDelete[key]) {
          toDelete[key] = { type: vertex.type, vectorIndex: vertex.vectorIndex, indices: [] };
        }
        toDelete[key].indices.push(vertex.pointIndex);
      });
      
      // Procesar cada vector que tiene vértices para eliminar
      Object.values(toDelete).forEach(({ type, vectorIndex, indices }) => {
        if (!newVectors[type] || !newVectors[type][vectorIndex]) return;
        
        const vector = newVectors[type][vectorIndex];
        
        // Ordenar índices de mayor a menor para no afectar posiciones al eliminar
        const sortedIndices = [...new Set(indices)].sort((a, b) => b - a);
        
        // Eliminar vértices uno por uno
        sortedIndices.forEach(pointIndex => {
          if (pointIndex >= 0 && pointIndex < vector.length) {
            vector.splice(pointIndex, 1);
          }
        });
        
        // Si el vector queda con menos de 2 puntos, marcarlo para eliminación
        if (vector.length < 2) {
          newVectors[type][vectorIndex] = null; // Marcar como null para eliminar después
        }
      });
      
      // Eliminar vectores marcados como null (de mayor a menor índice)
      Object.keys(toDelete).forEach(key => {
        const { type, vectorIndex } = toDelete[key];
        if (newVectors[type] && newVectors[type][vectorIndex] === null) {
          newVectors[type].splice(vectorIndex, 1);
        }
      });
      
      // Filtrar vectores null que pudieran quedar
      newVectors.bordes_externos = newVectors.bordes_externos.filter(v => v !== null);
      newVectors.sublotes = newVectors.sublotes.filter(v => v !== null);
      
      return newVectors;
    });

    setSelectedVertices([]);
  }, [selectedVertices, setEditableVectors]);

  // Agregar vértice en una línea existente (x, y en coordenadas del mundo)
  const addVertexToEdge = useCallback((x, y, tolerance = 20) => {
    const nearestEdge = findNearestEdge(x, y, tolerance);
    if (!nearestEdge) return false;

    setEditableVectors(prev => {
      const newVectors = JSON.parse(JSON.stringify(prev)); // Deep copy para evitar mutaciones
      const vector = newVectors[nearestEdge.type][nearestEdge.vectorIndex];
      
      // Insertar el nuevo vértice en la posición calculada
      vector.splice(nearestEdge.insertIndex, 0, nearestEdge.point);
      
      return newVectors;
    });

    return true;
  }, [findNearestEdge, setEditableVectors]);

  // Función para obtener la distancia de snap basada en el tamaño de la imagen
  const getSnapDistance = useCallback(() => {
    const imageBounds = coordinates.getImageBounds();
    const imageDiagonal = Math.sqrt(
      Math.pow(imageBounds.width, 2) + 
      Math.pow(imageBounds.height, 2)
    );
    return imageDiagonal * 0.005; // 0.5% de la diagonal de la imagen
  }, [coordinates]);
  
  /**
   * Encuentra el vértice más cercano dentro de la distancia de snap
   * @param {number} x - Coordenada X en imagen
   * @param {number} y - Coordenada Y en imagen
   * @returns {Object|null} - Vértice cercano o null
   */
  const findNearbyVertex = useCallback((x, y) => {
    let nearest = null;
    let minDistance = getSnapDistance();
    
    // Buscar en todos los vectores
    ['bordes_externos', 'sublotes'].forEach(vectorType => {
      editableVectors[vectorType].forEach((vector, vectorIndex) => {
        vector.forEach((point, pointIndex) => {
          const distance = Math.sqrt(
            Math.pow(x - point[0], 2) + Math.pow(y - point[1], 2)
          );
          
          if (distance < minDistance) {
            nearest = {
              type: vectorType,
              vectorIndex,
              pointIndex,
              point: point,
              distance
            };
            minDistance = distance;
          }
        });
      });
    });
    
    return nearest;
  }, [editableVectors]);
  
  /**
   * Encuentra el borde externo más cercano para snap CON CONEXIÓN REAL
   * @param {number} x - Coordenada X en imagen
   * @param {number} y - Coordenada Y en imagen
   * @returns {Object|null} - Punto de snap en borde o null
   */
  const findNearbyEdge = useCallback((x, y) => {
    let nearest = null;
    let minDistance = getSnapDistance();
    
    editableVectors.bordes_externos.forEach((vector, vectorIndex) => {
      for (let i = 0; i < vector.length - 1; i++) {
        const p1 = vector[i];
        const p2 = vector[i + 1];
        
        // Calcular punto más cercano en la línea
        const A = x - p1[0];
        const B = y - p1[1];
        const C = p2[0] - p1[0];
        const D = p2[1] - p1[1];
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) continue;
        
        const param = Math.max(0, Math.min(1, dot / lenSq));
        const closestX = p1[0] + param * C;
        const closestY = p1[1] + param * D;
        
        const distance = Math.sqrt(
          Math.pow(x - closestX, 2) + Math.pow(y - closestY, 2)
        );
        
        if (distance < minDistance) {
          nearest = {
            point: [closestX, closestY],
            distance,
            vectorIndex,
            edgeIndex: i,
            needsInsertion: param > 0.1 && param < 0.9, // Solo insertar si no está cerca de extremos
            insertionParam: param
          };
          minDistance = distance;
        }
      }
    });
    
    return nearest;
  }, [editableVectors, getSnapDistance]);

  /**
   * Crea una conexión REAL con un borde externo insertando un vértice
   * @param {Object} edgeInfo - Información del borde donde conectar
   * @returns {Object} - Información del vértice creado
   */
  const createRealBorderConnection = useCallback((edgeInfo) => {
    if (!edgeInfo || !edgeInfo.needsInsertion) {
      return { point: edgeInfo.point, isNew: false };
    }

    console.log('🔗 Creando conexión REAL con borde externo:', edgeInfo);

    // Actualizar el vector de borde externo para incluir el nuevo punto
    setEditableVectors(prev => {
      const newVectors = JSON.parse(JSON.stringify(prev));
      const targetVector = newVectors.bordes_externos[edgeInfo.vectorIndex];
      
      if (targetVector) {
        // Insertar el nuevo punto en la posición correcta
        const insertIndex = edgeInfo.edgeIndex + 1;
        targetVector.splice(insertIndex, 0, edgeInfo.point);
        
        console.log(`📍 Punto insertado en borde externo ${edgeInfo.vectorIndex} en índice ${insertIndex}`);
        
        // Registrar el nuevo punto en el sistema de vértices compartidos
        const vertexId = vertexSystem.getOrCreateVertex(
          edgeInfo.point[0], 
          edgeInfo.point[1], 
          'bordes_externos', 
          edgeInfo.vectorIndex, 
          insertIndex
        );
        
        console.log(`🔗 Vértice compartido creado: ${vertexId}`);
        
        return newVectors;
      }
      
      return prev;
    });

    return { 
      point: edgeInfo.point, 
      isNew: true,
      vectorIndex: edgeInfo.vectorIndex,
      insertIndex: edgeInfo.edgeIndex + 1
    };
  }, [setEditableVectors, vertexSystem]);
  
  // Iniciar dibujo de línea con detección inteligente y conexiones REALES
  const startDrawing = useCallback((x, y) => {
    let imageCoord = coordinates.screenToImageCoordinates(x, y);
    let startVertexId = null;
    
    // MEJORA 1: Buscar vértice compartido cercano al iniciar
    const nearestSharedVertex = vertexSystem.findNearestVertex(imageCoord.x, imageCoord.y, 15);
    if (nearestSharedVertex) {
      imageCoord = { x: nearestSharedVertex.vertex.x, y: nearestSharedVertex.vertex.y };
      startVertexId = nearestSharedVertex.id;
      console.log('🔗 Snap a vértice compartido:', nearestSharedVertex.id);
    }
    // MEJORA 2: Si no hay vértice compartido, buscar vértice tradicional
    else {
      const nearbyVertex = findNearbyVertex(imageCoord.x, imageCoord.y);
      if (nearbyVertex) {
        imageCoord = { x: nearbyVertex.point[0], y: nearbyVertex.point[1] };
        console.log('📍 Snap a vértice tradicional:', nearbyVertex);
      }
      // MEJORA 3: Si no hay vértice cercano, snap a borde cercano con CONEXIÓN REAL
      else {
        const nearbyEdge = findNearbyEdge(imageCoord.x, imageCoord.y);
        if (nearbyEdge) {
          // Crear conexión real con el borde externo
          const borderConnection = createRealBorderConnection(nearbyEdge);
          imageCoord = { x: borderConnection.point[0], y: borderConnection.point[1] };
          console.log('🔗 Snap REAL al borde:', borderConnection);
        }
      }
    }
    
    setIsDrawing(true);
    setDrawingPath([imageCoord]);
    drawingRef.current.startPoint = imageCoord;
    drawingRef.current.currentPath = [imageCoord];
    drawingRef.current.startVertexId = startVertexId; // Guardar ID del vértice inicial
  }, [coordinates, findNearbyVertex, findNearbyEdge, vertexSystem]);

  // Continuar dibujo de línea con snap VISUAL únicamente (sin crear vértices)
  const continueDrawing = useCallback((x, y) => {
    if (!isDrawing) return;
    
    let imageCoord = coordinates.screenToImageCoordinates(x, y);
    let endVertexId = null;
    let pendingBorderConnection = null;
    
    // MEJORA: Buscar vértice compartido cercano durante el dibujo
    const nearestSharedVertex = vertexSystem.findNearestVertex(imageCoord.x, imageCoord.y, 15);
    if (nearestSharedVertex) {
      imageCoord = { x: nearestSharedVertex.vertex.x, y: nearestSharedVertex.vertex.y };
      endVertexId = nearestSharedVertex.id;
      console.log('📍 Snap visual a vértice compartido:', nearestSharedVertex.id);
    } else {
      // Si no hay vértice compartido, buscar vértice tradicional
      const nearbyVertex = findNearbyVertex(imageCoord.x, imageCoord.y);
      if (nearbyVertex) {
        imageCoord = { x: nearbyVertex.point[0], y: nearbyVertex.point[1] };
        console.log('📍 Snap visual a vértice tradicional');
      } else {
        const nearbyEdge = findNearbyEdge(imageCoord.x, imageCoord.y);
        if (nearbyEdge) {
          // CORRECCIÓN: Solo snap visual, NO crear vértice todavía
          imageCoord = { x: nearbyEdge.point[0], y: nearbyEdge.point[1] };
          pendingBorderConnection = nearbyEdge; // Guardar para uso posterior
          console.log('📍 Snap visual al borde (sin crear vértice):', nearbyEdge);
        }
      }
    }
    
    // Guardar información para uso en finishDrawing
    drawingRef.current.endVertexId = endVertexId;
    drawingRef.current.pendingBorderConnection = pendingBorderConnection;
    
    if (activeTool === TOOL_TYPES.DRAW_LINE) {
      // Para líneas rectas, solo mantener inicio y punto actual
      setDrawingPath([drawingRef.current.startPoint, imageCoord]);
      drawingRef.current.currentPath = [drawingRef.current.startPoint, imageCoord];
    } else {
      // Para otros tipos de dibujo, agregar punto al path
      const newPath = [...drawingRef.current.currentPath, imageCoord];
      setDrawingPath(newPath);
      drawingRef.current.currentPath = newPath;
    }
  }, [isDrawing, activeTool, coordinates, findNearbyVertex, findNearbyEdge, vertexSystem]);

  /**
   * Fusión inteligente de vértices: Une automáticamente puntos cuando el final
   * de una nueva línea está cerca del inicio, creando conexiones automáticas
   */
  const mergeNearbyVertices = useCallback((newPath) => {
    if (newPath.length < 2) return newPath;
    
    const startPoint = newPath[0];
    const endPoint = newPath[newPath.length - 1];
    
    // Verificar si el punto final está cerca de vértices existentes
    const nearbyEndVertex = findNearbyVertex(
      endPoint.x || endPoint[0], 
      endPoint.y || endPoint[1]
    );
    
    if (nearbyEndVertex) {
      // Reemplazar el punto final con el vértice existente
      const mergedPath = [...newPath];
      mergedPath[mergedPath.length - 1] = {
        x: nearbyEndVertex.point[0],
        y: nearbyEndVertex.point[1]
      };
      console.log('Punto final conectado a vértice existente:', nearbyEndVertex);
      return mergedPath;
    }
    
    // Verificar si el punto inicial está cerca de vértices existentes
    const nearbyStartVertex = findNearbyVertex(
      startPoint.x || startPoint[0],
      startPoint.y || startPoint[1]
    );
    
    if (nearbyStartVertex) {
      // Reemplazar el punto inicial con el vértice existente
      const mergedPath = [...newPath];
      mergedPath[0] = {
        x: nearbyStartVertex.point[0],
        y: nearbyStartVertex.point[1]
      };
      console.log('Punto inicial conectado a vértice existente:', nearbyStartVertex);
      return mergedPath;
    }
    
    return newPath;
  }, [findNearbyVertex]);
  
  // Finalizar dibujo con auto-conexión inteligente y conexiones REALES
  const finishDrawing = useCallback(() => {
    if (!isDrawing || drawingPath.length < 2) {
      setIsDrawing(false);
      setDrawingPath([]);
      drawingRef.current = { startPoint: null, currentPath: [], snapToGrid: false };
      return;
    }

    // CORRECCIÓN: Procesar conexión pendiente con borde externo AQUÍ (al hacer clic)
    let finalPath = [...drawingPath];
    
    // Si hay una conexión pendiente con borde externo, crearla ahora
    if (drawingRef.current.pendingBorderConnection) {
      console.log('🔗 Creando conexión REAL con borde externo al finalizar:', drawingRef.current.pendingBorderConnection);
      
      // Crear la conexión real con el borde externo
      const borderConnection = createRealBorderConnection(drawingRef.current.pendingBorderConnection);
      
      // Actualizar el punto final del path con la conexión real
      finalPath[finalPath.length - 1] = { 
        x: borderConnection.point[0], 
        y: borderConnection.point[1] 
      };
    }
    
    // Aplicar fusión inteligente
    finalPath = mergeNearbyVertices(finalPath);
    
    // Siempre agregar como borde externo - la detección inteligente se maneja después
    const targetType = 'bordes_externos';

    // Agregar a vectores editables y registrar en sistema de vértices compartidos
    setEditableVectors(prev => {
      const newVectors = { ...prev };
      
      // Convertir el path a formato de array de coordenadas
      const pathCoordinates = finalPath.map(point => [point.x || point[0], point.y || point[1]]);
      
      const newVectorIndex = newVectors[targetType].length;
      newVectors[targetType] = [...newVectors[targetType], pathCoordinates];
      
      // MEJORA: Registrar vértices en el sistema compartido con conexiones reales
      pathCoordinates.forEach((point, pointIndex) => {
        const [x, y] = point;
        
        // Para todos los puntos, usar el sistema de vértices compartidos
        // Esto automáticamente conectará con vértices existentes o creará nuevos
        const vertexId = vertexSystem.getOrCreateVertex(x, y, targetType, newVectorIndex, pointIndex);
        
        console.log(`🔗 Punto ${pointIndex} registrado con vértice ${vertexId}`);
      });
      
      console.log('🔗 Nueva línea con conexiones reales registrada');
      
      // Verificar si la nueva línea forma un polígono cerrado con bordes existentes
      const detectedSubplot = checkForClosedPolygon(newVectors, pathCoordinates, subplotAnalyzer.current);
      if (detectedSubplot) {
        newVectors.sublotes = [...newVectors.sublotes, detectedSubplot];
        console.log('Sublote detectado automáticamente:', detectedSubplot);
      }
      
      return newVectors;
    });

    // Limpiar estado de dibujo
    setIsDrawing(false);
    setDrawingPath([]);
    drawingRef.current = { startPoint: null, currentPath: [], snapToGrid: false };
  }, [isDrawing, drawingPath, setEditableVectors, mergeNearbyVertices, subplotAnalyzer, vertexSystem, createRealBorderConnection]);

  // Cancelar dibujo
  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawingPath([]);
    drawingRef.current = { startPoint: null, currentPath: [], snapToGrid: false };
  }, []);

  // Seleccionar/deseleccionar vértices
  const toggleVertexSelection = useCallback((vertex) => {
    setSelectedVertices(prev => {
      const isSelected = prev.some(v => 
        v.type === vertex.type && 
        v.vectorIndex === vertex.vectorIndex && 
        v.pointIndex === vertex.pointIndex
      );
      
      if (isSelected) {
        return prev.filter(v => 
          !(v.type === vertex.type && 
            v.vectorIndex === vertex.vectorIndex && 
            v.pointIndex === vertex.pointIndex)
        );
      } else {
        return [...prev, vertex];
      }
    });
  }, []);

  // Limpiar selección
  const clearSelection = useCallback(() => {
    setSelectedVertices([]);
    setPointsToConnect([]);
  }, []);

  // Validar y limpiar selecciones después de cambios en vectores
  const validateAndCleanSelections = useCallback(() => {
    setSelectedVertices(prev => {
      return prev.filter(vertex => {
        try {
          // Verificar que el vector y el punto aún existan
          if (!vertex || typeof vertex.type !== 'string' || 
              typeof vertex.vectorIndex !== 'number' || 
              typeof vertex.pointIndex !== 'number') {
            return false;
          }
          
          const vectorArray = editableVectors[vertex.type];
          if (!vectorArray || !vectorArray[vertex.vectorIndex]) {
            return false;
          }
          
          const vector = vectorArray[vertex.vectorIndex];
          if (!vector || vertex.pointIndex < 0 || vertex.pointIndex >= vector.length) {
            return false;
          }
          
          return true;
        } catch (error) {
          console.warn('Error validando vértice seleccionado:', error);
          return false;
        }
      });
    });
    
    setPointsToConnect(prev => {
      return prev.filter(vertex => {
        try {
          if (!vertex || typeof vertex.type !== 'string' || 
              typeof vertex.vectorIndex !== 'number' || 
              typeof vertex.pointIndex !== 'number') {
            return false;
          }
          
          const vectorArray = editableVectors[vertex.type];
          if (!vectorArray || !vectorArray[vertex.vectorIndex]) {
            return false;
          }
          
          const vector = vectorArray[vertex.vectorIndex];
          if (!vector || vertex.pointIndex < 0 || vertex.pointIndex >= vector.length) {
            return false;
          }
          
          return true;
        } catch (error) {
          console.warn('Error validando punto de conexión:', error);
          return false;
        }
      });
    });
  }, [editableVectors]);

  // Conectar dos puntos con conexión REAL usando el sistema de vértices compartidos
  const connectTwoPoints = useCallback((point1, point2) => {
    console.log('🔗 Conectando puntos REAL con sistema compartido:', point1, point2);
    
    // Si ambos puntos ya tienen vertexId, conectarlos en el sistema compartido
    if (point1.vertexId && point2.vertexId) {
      const mergeResult = vertexSystem.connectVertices(point1.vertexId, point2.vertexId);
      
      if (mergeResult) {
        console.log('✅ Vértices fusionados en sistema compartido:', mergeResult);
        
        // Actualizar vectores editables para reflejar la fusión
        setEditableVectors(prev => {
          const newVectors = JSON.parse(JSON.stringify(prev));
          
          // Actualizar todas las conexiones afectadas
          mergeResult.allConnections.forEach(conn => {
            const vector = newVectors[conn.vectorType][conn.vectorIndex];
            if (vector && vector[conn.pointIndex]) {
              vector[conn.pointIndex] = [point1.point[0], point1.point[1]];
            }
          });
          
          return newVectors;
        });
        
        return;
      }
    }
    
    // Fallback: crear nueva línea conectada
    const newLine = [point1.point, point2.point];
    
    setEditableVectors(prev => {
      const newVectors = { ...prev };
      newVectors.bordes_externos = [...newVectors.bordes_externos, newLine];
      
      // Registrar en el sistema de vértices compartidos
      const vertexId1 = vertexSystem.getOrCreateVertex(
        point1.point[0], point1.point[1], 
        'bordes_externos', newVectors.bordes_externos.length - 1, 0
      );
      const vertexId2 = vertexSystem.getOrCreateVertex(
        point2.point[0], point2.point[1], 
        'bordes_externos', newVectors.bordes_externos.length - 1, 1
      );
      
      console.log('📏 Nueva línea creada con vértices compartidos:', { vertexId1, vertexId2 });
      
      return newVectors;
    });
    
  }, [setEditableVectors, vertexSystem]);

  // Seleccionar punto para conectar
  const selectPointToConnect = useCallback((vertex) => {
    setPointsToConnect(prev => {
      const newPoints = [...prev];
      
      // Si ya hay 2 puntos, reemplazar el primero
      if (newPoints.length >= 2) {
        newPoints[0] = newPoints[1];
        newPoints[1] = vertex;
      } else {
        newPoints.push(vertex);
      }
      
      // Si tenemos 2 puntos, conectarlos automáticamente
      if (newPoints.length === 2) {
        connectTwoPoints(newPoints[0], newPoints[1]);
        return [];
      }
      
      return newPoints;
    });
  }, [connectTwoPoints]);

  // Función mejorada para borrar vértices usando el sistema compartido
  const eraseVertexAt = useCallback((x, y) => {
    // Calcular el radio de borrado basado en la imagen
    const imageDiagonal = Math.sqrt(
      Math.pow(coordinates.getImageBounds().width, 2) + 
      Math.pow(coordinates.getImageBounds().height, 2)
    );
    const deleteRadius = imageDiagonal * 0.005; // 0.5% de la diagonal de la imagen
    
    const nearest = findVertexAt(x, y, deleteRadius);
    if (!nearest) return false;

    console.log('🗑️ Borrando vértice compartido:', nearest);

    // Si el vértice es compartido, eliminarlo del sistema compartido
    if (nearest.vertexId && nearest.allConnections) {
      const connections = vertexSystem.removeVertex(nearest.vertexId);
      
      if (connections) {
        setEditableVectors(prev => {
          const newVectors = JSON.parse(JSON.stringify(prev));
          
          // Agrupar conexiones por vector
          const vectorsToUpdate = new Map();
          
          connections.forEach(conn => {
            const key = `${conn.vectorType}_${conn.vectorIndex}`;
            if (!vectorsToUpdate.has(key)) {
              vectorsToUpdate.set(key, { 
                type: conn.vectorType, 
                index: conn.vectorIndex, 
                pointsToRemove: [] 
              });
            }
            vectorsToUpdate.get(key).pointsToRemove.push(conn.pointIndex);
          });
          
          // Procesar cada vector afectado
          vectorsToUpdate.forEach(({ type, index, pointsToRemove }) => {
            const vector = newVectors[type][index];
            if (!vector) return;
            
            // Ordenar índices de mayor a menor para no afectar posiciones
            pointsToRemove.sort((a, b) => b - a);
            
            pointsToRemove.forEach(pointIndex => {
              if (pointIndex >= 0 && pointIndex < vector.length) {
                vector.splice(pointIndex, 1);
              }
            });
            
            // Si el vector queda con menos de 2 puntos, eliminarlo
            if (vector.length < 2) {
              newVectors[type].splice(index, 1);
              console.log(`🗑️ Vector ${type}[${index}] eliminado por quedar vacío`);
            }
          });
          
          return newVectors;
        });
        
        console.log('✅ Vértice compartido eliminado exitosamente');
        return true;
      }
    }
    
    return false;
  }, [findVertexAt, vertexSystem, setEditableVectors]);

  // Función para forzar detección manual de sublotes
  const forceDetectSubplots = useCallback(() => {
    console.log('🔍 Iniciando detección forzada de sublotes...');
    
    const allLines = editableVectors.bordes_externos;
    
    if (allLines.length < 3) {
      console.log('❌ Se necesitan al menos 3 líneas para formar sublotes');
      return {
        success: false,
        message: 'Se necesitan al menos 3 líneas para formar sublotes',
        details: [`Líneas disponibles: ${allLines.length}`, 'Mínimo requerido: 3']
      };
    }
    
    // Usar el analizador mejorado para detectar todos los sublotes
    const result = subplotAnalyzer.current.analyzeSubplots(allLines);
    
    console.log('📊 Análisis completo:', result.analysis);
    
    if (result.sublots.length > 0) {
      // Filtrar sublotes que no estén ya detectados
      const existingSublots = editableVectors.sublotes;
      const newSublots = result.sublots.filter(newSublot => {
        const isDuplicate = existingSublots.some(existing => {
          return subplotAnalyzer.current.areSublotsEqual(newSublot.vertices, existing);
        });
        return !isDuplicate;
      });
      
      if (newSublots.length > 0) {
        setEditableVectors(prev => ({
          ...prev,
          sublotes: [...prev.sublotes, ...newSublots.map(s => s.vertices)]
        }));
        
        console.log('🎯 Nuevos sublotes detectados:', newSublots.length);
        
        return {
          success: true,
          message: `Se detectaron ${newSublots.length} nuevos sublotes`,
          details: newSublots.map((sublot, index) => 
            `Sublote ${index + 1}: ${sublot.area.toFixed(0)} m² (${sublot.method})`
          ),
          analysis: result.analysis
        };
      } else {
        return {
          success: false,
          message: 'Todos los sublotes ya han sido detectados',
          details: [`Total sublotes existentes: ${existingSublots.length}`]
        };
      }
    } else {
      return {
        success: false,
        message: 'No se detectaron sublotes válidos',
        details: result.analysis.methods || ['Verificar que las líneas estén conectadas correctamente']
      };
    }
  }, [editableVectors, setEditableVectors, subplotAnalyzer]);

  // Nueva función para mover vértices usando el sistema compartido
  const moveVertexTo = useCallback((vertexId, newX, newY) => {
    const affectedConnections = vertexSystem.moveVertex(vertexId, newX, newY);
    
    if (affectedConnections) {
      setEditableVectors(prev => {
        const newVectors = JSON.parse(JSON.stringify(prev));
        
        // Actualizar todas las conexiones del vértice movido
        affectedConnections.forEach(conn => {
          const vector = newVectors[conn.vectorType][conn.vectorIndex];
          if (vector && vector[conn.pointIndex]) {
            vector[conn.pointIndex] = [newX, newY];
          }
        });
        
        return newVectors;
      });
      
      console.log('✅ Vértice movido con todas sus conexiones:', {
        vertexId,
        newPosition: [newX, newY],
        affectedConnections: affectedConnections.length
      });
    }
  }, [vertexSystem, setEditableVectors]);

  return {
    // Estado
    activeTool,
    selectedVertices,
    drawingPath,
    isDrawing,
    pointsToConnect,
    
    // Acciones de herramientas
    setTool,
    
    // Funciones de búsqueda
    findVertexAt,
    findNearestEdge,
    
    // Operaciones de vértices
    deleteSelectedVertices,
    addVertexToEdge,
    toggleVertexSelection,
    clearSelection,
    eraseVertexAt,
    moveVertexTo, // Nueva función para movimiento con conexiones reales
    
    // Operaciones de conexión de puntos
    selectPointToConnect,
    connectTwoPoints,
    
    // Operaciones de dibujo
    startDrawing,
    continueDrawing,
    finishDrawing,
    cancelDrawing,
    
    // Utilidades
    snapToGrid: drawingRef.current.snapToGrid,
    setSnapToGrid: (value) => { drawingRef.current.snapToGrid = value; },
    validateAndCleanSelections,
    
    // Nuevas funciones de detección inteligente
    findNearbyVertex,
    findNearbyEdge,
    createRealBorderConnection,
    
    // Sistema de vértices compartidos
    vertexSystem,
    
    // Función para forzar detección manual de sublotes
    forceDetectSubplots
  };
}

export default useVectorEditing;
