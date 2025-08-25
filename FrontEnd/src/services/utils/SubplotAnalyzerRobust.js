/**
 * SUBPLOT ANALYZER ROBUST - Versión completamente refactorizada
 * 
 * Utiliza el GeometryService para algoritmos robustos de detección de sublotes
 * Elimina falsos positivos y mejora precisión de detección mediante:
 * - Ray casting para verificación point-in-polygon
 * - Winding number para polígonos complejos  
 * - Validación geométrica estricta
 * - Spatial indexing para performance
 * - Quality filtering para resultados óptimos
 * 
 * SOLUCIONADO: Problemas de detección de polígonos de 3-10 lados dentro de bordes externos
 */

import { RobustPolygonDetector, GeometryService } from '../GeometryService.js';

/**
 * Analizador de sublotes mejorado con algoritmos robustos
 */
class SubplotAnalyzerRobust {
  constructor() {
    this.geometryService = new GeometryService();
    this.robustDetector = new RobustPolygonDetector();
    
    // Configuración optimizada basada en análisis empírico
    this.config = {
      // Parámetros de área (ajustados para píxeles de imagen)
      minArea: 1000,              // 1K píxeles² - mínimo para sublote significativo
      maxArea: 500000,            // 500K píxeles² - máximo razonable para sublote
      
      // Parámetros de forma
      minVertices: 3,             // Mínimo: triángulo
      maxVertices: 12,            // Máximo optimizado para sublotes complejos
      maxAspectRatio: 20,         // Evitar polígonos extremadamente alargados
      
      // Parámetros de conexión y tolerancia
      tolerance: 15,              // Tolerancia de conexión OPTIMIZADA (antes 25-30)
      qualityThreshold: 65,       // Umbral de calidad (antes no existía)
      containmentThreshold: 0.90, // 90% de contención dentro de bordes externos
      
      // Parámetros de filtrado
      simplificationEpsilon: 1.5, // Simplificación más conservadora
      spatialFilterEpsilon: 8,    // Filtrado espacial preciso
      duplicateThreshold: 50,     // Umbral para detectar duplicados
      
      // Parámetros de validación
      minValidVertexRatio: 0.85,  // 85% de vértices deben ser válidos
      maxSelfIntersections: 0,    // No permitir auto-intersecciones
      
      // Debug y logging
      enableDebugLog: true,
      detailedAnalysis: true
    };
    
    // Métricas de rendimiento
    this.metrics = {
      totalAnalyses: 0,
      successfulDetections: 0,
      averageProcessingTime: 0,
      falsePositivesFiltered: 0,
      qualityRejections: 0
    };
    
    this.log('🔧 SubplotAnalyzerRobust inicializado con configuración optimizada');
  }

  /**
   * MÉTODO PRINCIPAL: Analiza vectores y detecta sublotes robustamente
   * 
   * @param {Array} borderVectors - Vectores de bordes externos
   * @param {Object} options - Opciones adicionales
   * @returns {Object} - Resultado completo del análisis
   */
  analyzeSubplots(borderVectors, options = {}) {
    const startTime = performance.now();
    this.metrics.totalAnalyses++;
    
    // Merge configuración personalizada
    const analysisConfig = { ...this.config, ...options };
    
    this.log('🔍 === INICIANDO ANÁLISIS ROBUSTO DE SUBLOTES ===');
    this.log(`📊 Entrada: ${borderVectors?.length || 0} vectores de borde`);
    
    const result = {
      sublots: [],
      analysis: {
        success: false,
        totalBorderVectors: borderVectors?.length || 0,
        algorithmsUsed: ['robust-geometry-service'],
        processingTime: 0,
        qualityMetrics: {},
        detailedLog: [],
        configuration: analysisConfig,
        errors: [],
        warnings: []
      }
    };
    
    try {
      // 1. VALIDACIÓN DE ENTRADA
      const inputValidation = this.validateInput(borderVectors);
      if (!inputValidation.isValid) {
        result.analysis.errors.push(...inputValidation.errors);
        result.analysis.reason = inputValidation.reason;
        return this.finalizeResult(result, startTime);
      }
      
      // 2. PREPROCESAMIENTO DE VECTORES
      const preprocessed = this.preprocessVectors(borderVectors, analysisConfig);
      result.analysis.preprocessedVectors = preprocessed.vectors.length;
      result.analysis.detailedLog.push(...preprocessed.log);
      
      if (preprocessed.vectors.length < 3) {
        result.analysis.warnings.push('Insuficientes vectores válidos después de preprocesamiento');
        return this.finalizeResult(result, startTime);
      }
      
      // 3. DETECCIÓN ROBUSTA USANDO GEOMETRYSERVICE
      const detectionResult = this.robustDetector.detectSubplots(
        preprocessed.vectors, 
        analysisConfig
      );
      
      result.analysis.algorithmsUsed.push(...detectionResult.analysis.algorithmsUsed);
      result.analysis.detailedLog.push(`Detección robusta: ${detectionResult.sublots.length} candidatos`);
      
      // 4. VALIDACIÓN ADICIONAL Y FILTRADO DE CALIDAD
      const validatedSublots = this.applyAdditionalValidation(
        detectionResult.sublots, 
        preprocessed.vectors,
        analysisConfig
      );
      
      result.analysis.detailedLog.push(`Post-validación: ${validatedSublots.length} sublotes válidos`);
      
      // 5. ASIGNACIÓN DE METADATOS Y CALIDAD
      const enrichedSublots = this.enrichSublots(validatedSublots, analysisConfig);
      
      result.sublots = enrichedSublots;
      result.analysis.success = enrichedSublots.length > 0;
      result.analysis.qualityMetrics = this.calculateAnalysisMetrics(enrichedSublots);
      
      // 6. ACTUALIZAR MÉTRICAS DE RENDIMIENTO
      if (enrichedSublots.length > 0) {
        this.metrics.successfulDetections++;
      }
      
      this.log(`🎯 ANÁLISIS COMPLETADO: ${enrichedSublots.length} sublotes detectados`);
      
    } catch (error) {
      this.log(`❌ ERROR en análisis: ${error.message}`);
      result.analysis.errors.push(`Error interno: ${error.message}`);
      result.analysis.success = false;
    }
    
    return this.finalizeResult(result, startTime);
  }

  /**
   * Valida entrada de datos
   * @param {Array} borderVectors - Vectores a validar
   * @returns {Object} - Resultado de validación
   */
  validateInput(borderVectors) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      reason: null
    };
    
    // Verificar que exista entrada
    if (!borderVectors) {
      validation.isValid = false;
      validation.errors.push('No se proporcionaron vectores de borde');
      validation.reason = 'Entrada nula';
      return validation;
    }
    
    // Verificar que sea array
    if (!Array.isArray(borderVectors)) {
      validation.isValid = false;
      validation.errors.push('Los vectores de borde deben ser un array');
      validation.reason = 'Formato inválido';
      return validation;
    }
    
    // Verificar cantidad mínima
    if (borderVectors.length < 3) {
      validation.isValid = false;
      validation.errors.push(`Se necesitan al menos 3 vectores, se proporcionaron ${borderVectors.length}`);
      validation.reason = 'Insuficientes vectores para formar polígonos';
      return validation;
    }
    
    // Verificar calidad de vectores individuales
    let validVectors = 0;
    borderVectors.forEach((vector, index) => {
      if (Array.isArray(vector) && vector.length >= 2) {
        const allPointsValid = vector.every(point => 
          Array.isArray(point) && 
          point.length >= 2 && 
          isFinite(point[0]) && 
          isFinite(point[1])
        );
        
        if (allPointsValid) {
          validVectors++;
        } else {
          validation.warnings.push(`Vector ${index} tiene puntos inválidos`);
        }
      } else {
        validation.warnings.push(`Vector ${index} tiene estructura inválida`);
      }
    });
    
    if (validVectors < 3) {
      validation.isValid = false;
      validation.errors.push(`Solo ${validVectors} vectores válidos de ${borderVectors.length} total`);
      validation.reason = 'Insuficientes vectores válidos';
    }
    
    return validation;
  }

  /**
   * Preprocesa vectores para optimizar detección
   * @param {Array} borderVectors - Vectores originales
   * @param {Object} config - Configuración
   * @returns {Object} - Vectores procesados con log
   */
  preprocessVectors(borderVectors, config) {
    const processed = {
      vectors: [],
      log: [],
      statistics: {
        originalCount: borderVectors.length,
        filteredCount: 0,
        simplifiedCount: 0,
        totalPointsBefore: 0,
        totalPointsAfter: 0
      }
    };
    
    this.log('🔄 Iniciando preprocesamiento de vectores...');
    
    borderVectors.forEach((vector, index) => {
      if (!Array.isArray(vector) || vector.length < 2) {
        processed.log.push(`Vector ${index}: descartado por estructura inválida`);
        return;
      }
      
      processed.statistics.totalPointsBefore += vector.length;
      
      // 1. Filtrar puntos inválidos
      const validPoints = vector.filter(point => 
        Array.isArray(point) && 
        point.length >= 2 && 
        isFinite(point[0]) && 
        isFinite(point[1])
      );
      
      if (validPoints.length < 2) {
        processed.log.push(`Vector ${index}: descartado por insuficientes puntos válidos`);
        return;
      }
      
      // 2. Aplicar filtrado espacial para eliminar duplicados cercanos
      const spatialFiltered = this.geometryService.spatialFilter(
        validPoints, 
        config.spatialFilterEpsilon
      );
      
      if (spatialFiltered.length < 2) {
        processed.log.push(`Vector ${index}: descartado después de filtrado espacial`);
        return;
      }
      
      // 3. Simplificar usando Douglas-Peucker conservador
      const simplified = this.geometryService.simplifyPolyline(
        spatialFiltered,
        config.simplificationEpsilon,
        true // preservar topología
      );
      
      if (simplified.length >= 2) {
        processed.vectors.push(simplified);
        processed.statistics.filteredCount++;
        processed.statistics.totalPointsAfter += simplified.length;
        
        processed.log.push(
          `Vector ${index}: ${vector.length} → ${validPoints.length} → ${spatialFiltered.length} → ${simplified.length} puntos`
        );
      } else {
        processed.log.push(`Vector ${index}: descartado después de simplificación`);
      }
    });
    
    processed.statistics.simplifiedCount = processed.vectors.length;
    
    this.log(`📊 Preprocesamiento completado:`);
    this.log(`   - Vectores: ${processed.statistics.originalCount} → ${processed.statistics.simplifiedCount}`);
    this.log(`   - Puntos: ${processed.statistics.totalPointsBefore} → ${processed.statistics.totalPointsAfter}`);
    
    return processed;
  }

  /**
   * Aplica validación adicional específica para sublotes
   * @param {Array} candidateSublots - Sublotes candidatos
   * @param {Array} borderVectors - Vectores de borde
   * @param {Object} config - Configuración
   * @returns {Array} - Sublotes validados
   */
  applyAdditionalValidation(candidateSublots, borderVectors, config) {
    this.log('🔍 Aplicando validación adicional...');
    
    const validated = [];
    const rejectionReasons = {
      area: 0,
      vertices: 0,
      quality: 0,
      containment: 0,
      geometry: 0,
      duplicates: 0
    };
    
    // Crear límite externo unificado para validación de contención
    const externalBoundary = this.createUnifiedExternalBoundary(borderVectors);
    
    candidateSublots.forEach((candidate, index) => {
      const vertices = candidate.vertices || candidate;
      
      // Validación 1: Número de vértices
      if (vertices.length < config.minVertices || vertices.length > config.maxVertices) {
        rejectionReasons.vertices++;
        this.log(`   Candidato ${index}: rechazado por vértices (${vertices.length})`);
        return;
      }
      
      // Validación 2: Validación geométrica completa
      const geometryValidation = this.geometryService.validatePolygon(vertices);
      if (!geometryValidation.isValid) {
        rejectionReasons.geometry++;
        this.log(`   Candidato ${index}: rechazado por geometría inválida`);
        return;
      }
      
      // Validación 3: Área apropiada
      const area = Math.abs(geometryValidation.area);
      if (area < config.minArea || area > config.maxArea) {
        rejectionReasons.area++;
        this.log(`   Candidato ${index}: rechazado por área (${area.toFixed(0)}px²)`);
        return;
      }
      
      // Validación 4: Aspect ratio razonable
      const aspectRatio = this.geometryService.calculateAspectRatio(geometryValidation.boundingBox);
      if (aspectRatio > config.maxAspectRatio) {
        rejectionReasons.geometry++;
        this.log(`   Candidato ${index}: rechazado por aspect ratio (${aspectRatio.toFixed(1)})`);
        return;
      }
      
      // Validación 5: Contención dentro de bordes externos
      let containment = null;
      if (externalBoundary) {
        containment = this.geometryService.isPolygonContained(
          vertices, 
          externalBoundary, 
          'windingNumber'
        );
        
        if (containment.containmentRatio < config.containmentThreshold) {
          rejectionReasons.containment++;
          this.log(`   Candidato ${index}: rechazado por contención (${containment.containmentRatio.toFixed(2)})`);
          return;
        }
      }
      
      // Validación 6: Calidad geométrica
      const quality = this.geometryService.calculatePolygonQuality(vertices);
      if (quality.overallScore < config.qualityThreshold) {
        rejectionReasons.quality++;
        this.log(`   Candidato ${index}: rechazado por calidad (${quality.overallScore.toFixed(1)})`);
        return;
      }
      
      // Validación 7: No duplicado
      const isDuplicate = validated.some(existing => 
        this.arePolygonsEquivalent(vertices, existing.vertices, config.duplicateThreshold)
      );
      
      if (isDuplicate) {
        rejectionReasons.duplicates++;
        this.log(`   Candidato ${index}: rechazado por duplicado`);
        return;
      }
      
      // Si pasa todas las validaciones, agregar a resultados
      validated.push({
        vertices: vertices,
        area: area,
        quality: quality,
        containment: containment,
        validation: geometryValidation,
        method: 'robust-detection'
      });
      
      this.log(`   ✅ Candidato ${index}: válido (área: ${area.toFixed(0)}px², calidad: ${quality.overallScore.toFixed(1)})`);
    });
    
    // Log de estadísticas de rechazo
    this.log('📊 Estadísticas de validación:');
    Object.entries(rejectionReasons).forEach(([reason, count]) => {
      if (count > 0) {
        this.log(`   - ${reason}: ${count} rechazados`);
      }
    });
    
    this.metrics.falsePositivesFiltered += candidateSublots.length - validated.length;
    this.metrics.qualityRejections += rejectionReasons.quality;
    
    return validated;
  }

  /**
   * Crea límite externo unificado
   * @param {Array} borderVectors - Vectores de borde
   * @returns {Array|null} - Polígono unificado
   */
  createUnifiedExternalBoundary(borderVectors) {
    if (!borderVectors || borderVectors.length === 0) return null;
    
    try {
      if (borderVectors.length === 1) {
        // Si hay solo un vector, verificar si está cerrado
        const vector = borderVectors[0];
        const firstPoint = vector[0];
        const lastPoint = vector[vector.length - 1];
        const distance = this.geometryService.euclideanDistance(firstPoint, lastPoint);
        
        if (distance < this.config.tolerance) {
          // Vector cerrado, usar como límite
          return vector;
        }
      }
      
      // Para múltiples vectores o vector abierto, crear convex hull
      const allPoints = borderVectors.flat();
      const validPoints = allPoints.filter(point => 
        Array.isArray(point) && 
        point.length >= 2 && 
        isFinite(point[0]) && 
        isFinite(point[1])
      );
      
      if (validPoints.length < 3) return null;
      
      // Usar método de convex hull del detector robusto
      return this.robustDetector.computeConvexHull(validPoints);
      
    } catch (error) {
      this.log(`⚠️ Error creando límite externo: ${error.message}`);
      return null;
    }
  }

  /**
   * Compara si dos polígonos son equivalentes
   * @param {Array} poly1 - Primer polígono
   * @param {Array} poly2 - Segundo polígono  
   * @param {number} threshold - Umbral de similitud
   * @returns {boolean} - True si son equivalentes
   */
  arePolygonsEquivalent(poly1, poly2, threshold) {
    if (Math.abs(poly1.length - poly2.length) > 2) return false;
    
    // Comparar áreas
    const area1 = Math.abs(this.geometryService.calculatePolygonArea(poly1));
    const area2 = Math.abs(this.geometryService.calculatePolygonArea(poly2));
    const areaDiff = Math.abs(area1 - area2);
    
    if (areaDiff > threshold * threshold) return false;
    
    // Comparar centroides
    const centroid1 = this.robustDetector.calculateCentroid(poly1);
    const centroid2 = this.robustDetector.calculateCentroid(poly2);
    const centroidDistance = this.geometryService.euclideanDistance(centroid1, centroid2);
    
    if (centroidDistance > threshold) return false;
    
    // Comparación de vértices similares
    let similarVertices = 0;
    for (const vertex1 of poly1) {
      const hasCloseVertex = poly2.some(vertex2 => 
        this.geometryService.euclideanDistance(vertex1, vertex2) < threshold
      );
      if (hasCloseVertex) similarVertices++;
    }
    
    const similarity = similarVertices / Math.max(poly1.length, poly2.length);
    return similarity >= 0.75; // 75% de similitud
  }

  /**
   * Enriquece sublotes con metadatos adicionales
   * @param {Array} sublots - Sublotes validados
   * @param {Object} config - Configuración
   * @returns {Array} - Sublotes enriquecidos
   */
  enrichSublots(sublots, config) {
    this.log('💎 Enriqueciendo sublotes con metadatos...');
    
    return sublots.map((sublot, index) => {
      const enriched = {
        ...sublot,
        id: `robust-sublot-${index + 1}`,
        index: index,
        metadata: {
          detectionMethod: 'robust-geometry-service',
          timestamp: new Date().toISOString(),
          processingVersion: '2.0',
          confidence: this.calculateConfidence(sublot),
          category: this.categorizeSubplot(sublot),
          properties: this.extractProperties(sublot)
        }
      };
      
      this.log(`   Sublote ${index + 1}: ${enriched.metadata.category}, confianza: ${enriched.metadata.confidence.toFixed(2)}`);
      
      return enriched;
    });
  }

  /**
   * Calcula nivel de confianza del sublote
   * @param {Object} sublot - Sublote a evaluar
   * @returns {number} - Confianza (0-1)
   */
  calculateConfidence(sublot) {
    let confidence = 0.5; // Base
    
    // Factor de calidad geométrica
    const qualityScore = sublot.quality?.overallScore || 0;
    confidence += (qualityScore / 100) * 0.3;
    
    // Factor de contención
    if (sublot.containment) {
      confidence += sublot.containment.containmentRatio * 0.2;
    }
    
    // Factor de forma (convexidad)
    if (sublot.validation?.convexity?.isConvex) {
      confidence += 0.1;
    }
    
    // Factor de área apropiada
    const area = sublot.area;
    if (area >= 5000 && area <= 100000) { // Rango óptimo
      confidence += 0.1;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Categoriza sublote según características
   * @param {Object} sublot - Sublote a categorizar
   * @returns {string} - Categoría
   */
  categorizeSubplot(sublot) {
    const vertices = sublot.vertices.length;
    const area = sublot.area;
    const isConvex = sublot.validation?.convexity?.isConvex;
    
    if (vertices === 3) return 'triangular';
    if (vertices === 4 && isConvex) return 'cuadrilateral';
    if (vertices <= 6 && isConvex) return 'regular';
    if (vertices > 6) return 'complejo';
    if (!isConvex) return 'irregular';
    
    return 'estándar';
  }

  /**
   * Extrae propiedades geométricas relevantes
   * @param {Object} sublot - Sublote a analizar
   * @returns {Object} - Propiedades extraídas
   */
  extractProperties(sublot) {
    const validation = sublot.validation;
    
    return {
      area: sublot.area,
      perimeter: validation.perimeter,
      vertices: sublot.vertices.length,
      aspectRatio: this.geometryService.calculateAspectRatio(validation.boundingBox),
      isConvex: validation.convexity?.isConvex || false,
      convexityRatio: validation.convexity?.convexityRatio || 0,
      hasWarnings: validation.warnings?.length > 0,
      boundingBox: validation.boundingBox
    };
  }

  /**
   * Calcula métricas del análisis completo
   * @param {Array} sublots - Sublotes detectados
   * @returns {Object} - Métricas del análisis
   */
  calculateAnalysisMetrics(sublots) {
    if (sublots.length === 0) {
      return {
        totalSublots: 0,
        averageQuality: 0,
        averageConfidence: 0,
        totalArea: 0,
        categories: {},
        qualityDistribution: {}
      };
    }
    
    const qualities = sublots.map(s => s.quality?.overallScore || 0);
    const confidences = sublots.map(s => s.metadata?.confidence || 0);
    const areas = sublots.map(s => s.area);
    const categories = sublots.map(s => s.metadata?.category || 'unknown');
    
    // Distribución de categorías
    const categoryCount = {};
    categories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    // Distribución de calidad
    const qualityRanges = {
      'excelente (90-100)': qualities.filter(q => q >= 90).length,
      'buena (70-89)': qualities.filter(q => q >= 70 && q < 90).length,
      'aceptable (50-69)': qualities.filter(q => q >= 50 && q < 70).length,
      'baja (<50)': qualities.filter(q => q < 50).length
    };
    
    return {
      totalSublots: sublots.length,
      averageQuality: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
      averageConfidence: confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
      totalArea: areas.reduce((sum, a) => sum + a, 0),
      averageArea: areas.reduce((sum, a) => sum + a, 0) / areas.length,
      categories: categoryCount,
      qualityDistribution: qualityRanges
    };
  }

  /**
   * Finaliza resultado del análisis
   * @param {Object} result - Resultado a finalizar
   * @param {number} startTime - Tiempo de inicio
   * @returns {Object} - Resultado finalizado
   */
  finalizeResult(result, startTime) {
    const processingTime = performance.now() - startTime;
    result.analysis.processingTime = processingTime;
    
    // Actualizar métricas globales
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalAnalyses - 1) + processingTime) / 
      this.metrics.totalAnalyses;
    
    this.log(`⏱️ Tiempo de procesamiento: ${processingTime.toFixed(2)}ms`);
    this.log('🔚 === ANÁLISIS ROBUSTO COMPLETADO ===');
    
    return result;
  }

  /**
   * Método de compatibilidad con versión anterior
   * @param {Array} borderVectors - Vectores de borde
   * @returns {boolean} - True si dos sublotes son iguales
   */
  areSublotsEqual(sublot1, sublot2) {
    // Convertir a formato de vértices si es necesario
    const vertices1 = sublot1.vertices || sublot1;
    const vertices2 = sublot2.vertices || sublot2;
    
    return this.arePolygonsEquivalent(vertices1, vertices2, this.config.duplicateThreshold);
  }

  /**
   * Actualiza configuración
   * @param {Object} newConfig - Nueva configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.robustDetector.updateConfig(newConfig);
    this.log('⚙️ Configuración actualizada');
  }

  /**
   * Obtiene métricas de rendimiento
   * @returns {Object} - Métricas actuales
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalAnalyses > 0 ? 
        this.metrics.successfulDetections / this.metrics.totalAnalyses : 0,
      averageSublotsPerAnalysis: this.metrics.successfulDetections > 0 ?
        this.metrics.successfulDetections / this.metrics.totalAnalyses : 0
    };
  }

  /**
   * Logger condicional
   * @param {string} message - Mensaje a loggear
   */
  log(message) {
    if (this.config.enableDebugLog) {
      console.log(`[SubplotAnalyzerRobust] ${message}`);
    }
  }

  /**
   * Resetea métricas
   */
  resetMetrics() {
    this.metrics = {
      totalAnalyses: 0,
      successfulDetections: 0,
      averageProcessingTime: 0,
      falsePositivesFiltered: 0,
      qualityRejections: 0
    };
    this.log('📊 Métricas reseteadas');
  }
}

export default SubplotAnalyzerRobust;
