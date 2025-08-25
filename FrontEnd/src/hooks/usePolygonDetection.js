import { useState, useCallback, useRef } from 'react';
import SubplotAnalyzerRobust from '../services/utils/SubplotAnalyzerRobust';

/**
 * Hook personalizado para detección mejorada de polígonos
 * Elimina falsos positivos y mejora la precisión de detección
 */
function usePolygonDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetectionResult, setLastDetectionResult] = useState(null);
  const analyzerRef = useRef(null);

  // Inicializar analizador robusto con configuración optimizada
  const getAnalyzer = useCallback(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new SubplotAnalyzerRobust();
      // Configuración optimizada para máxima precisión
      analyzerRef.current.updateConfig({
        tolerance: 15,              // OPTIMIZADO: más preciso que versión anterior
        minArea: 1000,              // Área mínima para sublotes significativos
        maxArea: 500000,            // Área máxima razonable
        minVertices: 3,             // Mínimo: triángulo
        maxVertices: 12,            // OPTIMIZADO: menos vértices para mejor detección
        qualityThreshold: 65,       // NUEVO: umbral de calidad geométrica
        containmentThreshold: 0.90, // NUEVO: 90% contención dentro de bordes
        enableDebugLog: true        // NUEVO: logging detallado para debug
      });
    }
    return analyzerRef.current;
  }, []);

  /**
   * Valida que un polígono esté realmente cerrado manualmente
   */
  const validateClosedPolygon = useCallback((vertices, borderVectors) => {
    if (vertices.length < 3) return false;

    const firstPoint = vertices[0];
    const lastPoint = vertices[vertices.length - 1];
    
    // Verificar que el primer y último punto estén muy cerca (polígono cerrado)
    const distance = Math.sqrt(
      Math.pow(firstPoint[0] - lastPoint[0], 2) + 
      Math.pow(firstPoint[1] - lastPoint[1], 2)
    );
    
    // Debe estar cerrado dentro de 10px
    if (distance > 10) return false;

    // Verificar que todos los vértices del polígono correspondan a puntos reales de los vectores
    let validVertexCount = 0;
    
    vertices.forEach(polyVertex => {
      let foundInVector = false;
      
      borderVectors.forEach(vector => {
        vector.forEach(vectorPoint => {
          const dist = Math.sqrt(
            Math.pow(polyVertex[0] - vectorPoint[0], 2) + 
            Math.pow(polyVertex[1] - vectorPoint[1], 2)
          );
          
          if (dist < 15) { // Tolerancia de 15px
            foundInVector = true;
          }
        });
      });
      
      if (foundInVector) validVertexCount++;
    });

    // Al menos 80% de los vértices deben corresponder a puntos reales
    const validRatio = validVertexCount / vertices.length;
    return validRatio >= 0.8;
  }, []);

  /**
   * Filtra polígonos que son solo combinaciones automáticas
   */
  const filterFalsePositives = useCallback((detectedPolygons, borderVectors) => {
    console.log('🔍 Filtrando falsos positivos...');
    
    const validPolygons = detectedPolygons.filter(polygon => {
      const vertices = polygon.vertices || polygon;
      
      // Validación 1: Polígono cerrado manualmente
      const isValidClosure = validateClosedPolygon(vertices, borderVectors);
      if (!isValidClosure) {
        console.log('❌ Polígono rechazado: no está cerrado manualmente');
        return false;
      }

      // Validación 2: Área razonable
      const area = polygon.area || calculatePolygonArea(vertices);
      if (area < 1000 || area > 1000000) {
        console.log(`❌ Polígono rechazado: área fuera de rango (${area.toFixed(0)}px²)`);
        return false;
      }

      // Validación 3: Forma geométrica válida
      const aspectRatio = calculateAspectRatio(vertices);
      if (aspectRatio > 20) { // Evitar polígonos extremadamente alargados
        console.log(`❌ Polígono rechazado: forma extrema (ratio: ${aspectRatio.toFixed(1)})`);
        return false;
      }

      // Validación 4: No debe ser solo un rectángulo de bordes externos
      const isExternalBorder = isPolygonExternalBorder(vertices, borderVectors);
      if (isExternalBorder) {
        console.log('❌ Polígono rechazado: es solo el borde externo');
        return false;
      }

      console.log(`✅ Polígono válido: ${area.toFixed(0)}px², ${vertices.length} vértices`);
      return true;
    });

    console.log(`🎯 Filtrado completado: ${validPolygons.length}/${detectedPolygons.length} polígonos válidos`);
    return validPolygons;
  }, [validateClosedPolygon]);

  /**
   * Calcula el área de un polígono usando el algoritmo Shoelace
   */
  const calculatePolygonArea = useCallback((vertices) => {
    if (vertices.length < 3) return 0;
    
    let area = 0;
    const n = vertices.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i][0] * vertices[j][1];
      area -= vertices[j][0] * vertices[i][1];
    }
    
    return Math.abs(area) / 2;
  }, []);

  /**
   * Calcula la relación de aspecto de un polígono
   */
  const calculateAspectRatio = useCallback((vertices) => {
    if (vertices.length < 3) return 0;

    let minX = vertices[0][0], maxX = vertices[0][0];
    let minY = vertices[0][1], maxY = vertices[0][1];

    vertices.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    const width = maxX - minX;
    const height = maxY - minY;

    return Math.max(width, height) / Math.min(width, height);
  }, []);

  /**
   * Verifica si el polígono es solo el borde externo
   */
  const isPolygonExternalBorder = useCallback((polygonVertices, borderVectors) => {
    if (borderVectors.length !== 1) return false;

    const borderVector = borderVectors[0];
    if (borderVector.length !== polygonVertices.length) return false;

    // Verificar si todos los puntos coinciden (con tolerancia)
    let matchCount = 0;
    polygonVertices.forEach(polyPoint => {
      const hasMatch = borderVector.some(borderPoint => {
        const dist = Math.sqrt(
          Math.pow(polyPoint[0] - borderPoint[0], 2) + 
          Math.pow(polyPoint[1] - borderPoint[1], 2)
        );
        return dist < 20;
      });
      if (hasMatch) matchCount++;
    });

    return matchCount >= polygonVertices.length * 0.9; // 90% de coincidencia
  }, []);

  /**
   * Detecta sublotes usando algoritmos robustos
   */
  const detectSubplots = useCallback(async (borderVectors) => {
    if (!borderVectors || borderVectors.length === 0) {
      console.warn('No hay vectores de borde para analizar');
      return { sublots: [], analysis: { reason: 'No hay vectores' } };
    }

    setIsDetecting(true);
    
    try {
      console.log('🔍 Iniciando detección ROBUSTA de sublotes...');
      
      const analyzer = getAnalyzer();
      
      // El nuevo analizador robusto maneja toda la validación internamente
      const result = analyzer.analyzeSubplots(borderVectors);
      
      setLastDetectionResult(result);
      
      console.log('🎯 Detección robusta completada:', {
        sublots: result.sublots.length,
        success: result.analysis.success,
        processingTime: result.analysis.processingTime?.toFixed(2) + 'ms',
        algorithms: result.analysis.algorithmsUsed
      });
      
      // Log métricas de calidad si están disponibles
      if (result.analysis.qualityMetrics) {
        console.log('📊 Métricas de calidad:', result.analysis.qualityMetrics);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error en detección robusta:', error);
      return { 
        sublots: [], 
        analysis: { 
          success: false,
          error: error.message,
          reason: 'Error en el proceso de detección robusta' 
        } 
      };
    } finally {
      setIsDetecting(false);
    }
  }, [getAnalyzer]);

  /**
   * Valida conexiones entre líneas para formar polígonos
   */
  const validateLineConnections = useCallback((lines) => {
    console.log('🔗 Validando conexiones entre líneas...');
    
    const connectionMap = new Map();
    const tolerance = 20;

    // Encontrar todas las conexiones válidas
    lines.forEach((line, lineIndex) => {
      const startPoint = line[0];
      const endPoint = line[line.length - 1];
      
      [startPoint, endPoint].forEach((point, pointIndex) => {
        const key = `${Math.round(point[0])},${Math.round(point[1])}`;
        
        if (!connectionMap.has(key)) {
          connectionMap.set(key, []);
        }
        
        connectionMap.get(key).push({
          lineIndex,
          pointIndex,
          point,
          isExtreme: pointIndex === 0 || pointIndex === line.length - 1
        });
      });
    });

    // Buscar conexiones cercanas
    const validConnections = [];
    
    connectionMap.forEach((connections, key) => {
      if (connections.length >= 2) {
        // Punto conecta múltiples líneas
        validConnections.push({
          position: connections[0].point,
          connectedLines: connections.map(c => c.lineIndex),
          connectionType: 'multi-line'
        });
      }
    });

    console.log(`🔗 Conexiones válidas encontradas: ${validConnections.length}`);
    return validConnections;
  }, []);

  return {
    // Estado
    isDetecting,
    lastDetectionResult,
    
    // Funciones principales
    detectSubplots,
    validateClosedPolygon,
    filterFalsePositives,
    calculatePolygonArea,
    validateLineConnections,
    
    // Funciones auxiliares
    calculateAspectRatio,
    isPolygonExternalBorder
  };
}

export default usePolygonDetection;
