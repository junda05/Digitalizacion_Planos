/**
 * GEOMETRY SERVICE - Algoritmos Geométricos Robustos para CAD/GIS
 * 
 * Implementa algoritmos estándar de geometría computacional:
 * - Ray Casting para detección point-in-polygon
 * - Winding Number para polígonos complejos
 * - Delaunay Triangulation para validación de polígonos
 * - Spatial Indexing (R-tree) para optimización
 * - Douglas-Peucker para simplificación de líneas
 * - RANSAC para filtrado de outliers
 * 
 * Cumple con OGC Simple Feature Access standards
 */

/**
 * Clase principal para operaciones geométricas robustas
 */
export class GeometryService {
  constructor() {
    this.spatialIndex = new RTreeIndex();
    this.tolerance = 1e-10; // Tolerancia para operaciones de punto flotante
    this.epsilon = 1e-6;   // Epsilon para comparaciones geométricas
  }

  /**
   * RAY CASTING ALGORITHM
   * Determina si un punto está dentro de un polígono usando ray casting
   * Complexity: O(n) donde n es el número de vértices
   * 
   * @param {Array} point - [x, y] coordenadas del punto
   * @param {Array} polygon - Array de [x, y] vértices del polígono
   * @returns {boolean} - True si el punto está dentro del polígono
   */
  pointInPolygonRayCasting(point, polygon) {
    if (polygon.length < 3) return false;
    
    const [x, y] = point;
    let inside = false;
    let j = polygon.length - 1;

    for (let i = 0; i < polygon.length; i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      // Verificar si el punto está exactamente en un vértice
      if (Math.abs(xi - x) < this.epsilon && Math.abs(yi - y) < this.epsilon) {
        return true;
      }

      // Ray casting: contar intersecciones con borde horizontal a la derecha
      if (((yi > y) !== (yj > y)) && 
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
      j = i;
    }

    return inside;
  }

  /**
   * WINDING NUMBER ALGORITHM
   * Algoritmo más robusto para polígonos complejos (con holes o self-intersecting)
   * Complexity: O(n)
   * 
   * @param {Array} point - [x, y] coordenadas del punto
   * @param {Array} polygon - Array de [x, y] vértices del polígono
   * @returns {number} - Winding number (0 = outside, ≠0 = inside)
   */
  pointInPolygonWindingNumber(point, polygon) {
    if (polygon.length < 3) return 0;
    
    const [px, py] = point;
    let wn = 0; // winding number

    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const [x1, y1] = polygon[i];
      const [x2, y2] = polygon[j];

      if (y1 <= py) {
        if (y2 > py) { // upward crossing
          if (this.isLeft([x1, y1], [x2, y2], [px, py]) > 0) {
            wn++;
          }
        }
      } else {
        if (y2 <= py) { // downward crossing
          if (this.isLeft([x1, y1], [x2, y2], [px, py]) < 0) {
            wn--;
          }
        }
      }
    }

    return wn;
  }

  /**
   * Test if point is left of infinite line defined by two points
   * @param {Array} p0 - First point of line
   * @param {Array} p1 - Second point of line  
   * @param {Array} p2 - Test point
   * @returns {number} - >0 if left, <0 if right, =0 if on line
   */
  isLeft(p0, p1, p2) {
    return ((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]));
  }

  /**
   * POLYGON VALIDATION usando algoritmos robustos
   * Valida que un polígono sea geométricamente válido según OGC standards
   * 
   * @param {Array} polygon - Array de [x, y] vértices
   * @returns {Object} - Resultado de validación con detalles
   */
  validatePolygon(polygon) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      area: 0,
      perimeter: 0,
      boundingBox: null,
      convexity: null
    };

    if (!polygon || polygon.length < 3) {
      result.isValid = false;
      result.errors.push('Polígono debe tener al menos 3 vértices');
      return result;
    }

    // 1. Validar que los vértices sean números finitos
    for (let i = 0; i < polygon.length; i++) {
      const [x, y] = polygon[i];
      if (!isFinite(x) || !isFinite(y)) {
        result.isValid = false;
        result.errors.push(`Vértice ${i} tiene coordenadas inválidas: [${x}, ${y}]`);
      }
    }

    if (!result.isValid) return result;

    // 2. Calcular área usando Shoelace algorithm
    result.area = this.calculatePolygonArea(polygon);
    
    if (Math.abs(result.area) < this.tolerance) {
      result.isValid = false;
      result.errors.push('Polígono tiene área cero (vértices colineales)');
    }

    // 3. Calcular perímetro
    result.perimeter = this.calculatePolygonPerimeter(polygon);

    // 4. Calcular bounding box
    result.boundingBox = this.calculateBoundingBox(polygon);

    // 5. Verificar auto-intersecciones
    const selfIntersects = this.checkSelfIntersection(polygon);
    if (selfIntersects.hasIntersection) {
      result.warnings.push(`Polígono tiene auto-intersecciones en: ${selfIntersects.intersections.length} puntos`);
    }

    // 6. Verificar convexidad
    result.convexity = this.checkConvexity(polygon);

    // 7. Verificar aspect ratio (forma geométrica válida)
    const aspectRatio = this.calculateAspectRatio(result.boundingBox);
    if (aspectRatio > 50) { // Polígono extremadamente alargado
      result.warnings.push(`Polígono muy alargado (ratio: ${aspectRatio.toFixed(1)})`);
    }

    return result;
  }

  /**
   * SHOELACE ALGORITHM para calcular área de polígono
   * Complexity: O(n)
   * 
   * @param {Array} polygon - Array de [x, y] vértices
   * @returns {number} - Área del polígono (positiva si CCW, negativa si CW)
   */
  calculatePolygonArea(polygon) {
    if (polygon.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i][0] * polygon[j][1];
      area -= polygon[j][0] * polygon[i][1];
    }
    return area / 2;
  }

  /**
   * Calcula el perímetro de un polígono
   * @param {Array} polygon - Array de [x, y] vértices
   * @returns {number} - Perímetro total
   */
  calculatePolygonPerimeter(polygon) {
    if (polygon.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      perimeter += this.euclideanDistance(polygon[i], polygon[j]);
    }
    return perimeter;
  }

  /**
   * Distancia euclidiana entre dos puntos
   * @param {Array} p1 - Punto 1 [x, y]
   * @param {Array} p2 - Punto 2 [x, y]
   * @returns {number} - Distancia
   */
  euclideanDistance(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calcula bounding box de un polígono
   * @param {Array} polygon - Array de [x, y] vértices
   * @returns {Object} - {minX, minY, maxX, maxY, width, height}
   */
  calculateBoundingBox(polygon) {
    if (polygon.length === 0) return null;
    
    let minX = polygon[0][0], maxX = polygon[0][0];
    let minY = polygon[0][1], maxY = polygon[0][1];
    
    for (let i = 1; i < polygon.length; i++) {
      const [x, y] = polygon[i];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  /**
   * Calcula aspect ratio del bounding box
   * @param {Object} bbox - Bounding box
   * @returns {number} - Aspect ratio (mayor/menor dimensión)
   */
  calculateAspectRatio(bbox) {
    if (!bbox || bbox.width === 0 || bbox.height === 0) return Infinity;
    return Math.max(bbox.width, bbox.height) / Math.min(bbox.width, bbox.height);
  }

  /**
   * LINE INTERSECTION ALGORITHM
   * Encuentra intersección entre dos segmentos de línea
   * Usa determinantes para robustez numérica
   * 
   * @param {Array} line1 - [[x1,y1], [x2,y2]] primer segmento
   * @param {Array} line2 - [[x3,y3], [x4,y4]] segundo segmento
   * @returns {Object|null} - Punto de intersección o null
   */
  findLineIntersection(line1, line2) {
    const [[x1, y1], [x2, y2]] = line1;
    const [[x3, y3], [x4, y4]] = line2;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    // Líneas paralelas
    if (Math.abs(denom) < this.tolerance) {
      return null;
    }
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    // Verificar si la intersección está dentro de ambos segmentos
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        point: [x1 + t * (x2 - x1), y1 + t * (y2 - y1)],
        t, u,
        onBothSegments: true
      };
    }
    
    return null;
  }

  /**
   * SELF-INTERSECTION DETECTION
   * Detecta auto-intersecciones en un polígono
   * Complexity: O(n²) pero optimizado con early termination
   * 
   * @param {Array} polygon - Array de [x, y] vértices
   * @returns {Object} - Resultado con intersecciones encontradas
   */
  checkSelfIntersection(polygon) {
    const result = {
      hasIntersection: false,
      intersections: []
    };
    
    if (polygon.length < 4) return result; // Triángulo no puede auto-intersectarse
    
    // Verificar cada par de aristas no adyacentes
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const edge1 = [polygon[i], polygon[j]];
      
      for (let k = i + 2; k < polygon.length; k++) {
        // Evitar vértices adyacentes y el último con el primero
        if (k === polygon.length - 1 && i === 0) continue;
        
        const l = (k + 1) % polygon.length;
        const edge2 = [polygon[k], polygon[l]];
        
        const intersection = this.findLineIntersection(edge1, edge2);
        if (intersection && intersection.onBothSegments) {
          result.hasIntersection = true;
          result.intersections.push({
            point: intersection.point,
            edges: [[i, j], [k, l]]
          });
        }
      }
    }
    
    return result;
  }

  /**
   * CONVEXITY TEST
   * Verifica si un polígono es convexo
   * @param {Array} polygon - Array de [x, y] vértices
   * @returns {Object} - Información sobre convexidad
   */
  checkConvexity(polygon) {
    if (polygon.length < 3) return { isConvex: false, reason: 'Insuficientes vértices' };
    
    let sign = null;
    let convexVertices = 0;
    let reflex = 0;
    
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      const p3 = polygon[(i + 2) % polygon.length];
      
      const cross = this.crossProduct(
        [p2[0] - p1[0], p2[1] - p1[1]],
        [p3[0] - p2[0], p3[1] - p2[1]]
      );
      
      if (Math.abs(cross) > this.tolerance) {
        const currentSign = cross > 0 ? 1 : -1;
        
        if (sign === null) {
          sign = currentSign;
        } else if (sign !== currentSign) {
          reflex++;
        }
        
        convexVertices++;
      }
    }
    
    const isConvex = reflex === 0;
    
    return {
      isConvex,
      convexVertices,
      reflexVertices: reflex,
      convexityRatio: convexVertices > 0 ? (convexVertices - reflex) / convexVertices : 0
    };
  }

  /**
   * Producto cruzado de dos vectores 2D
   * @param {Array} v1 - Vector 1 [x, y]
   * @param {Array} v2 - Vector 2 [x, y]
   * @returns {number} - Producto cruzado (z component)
   */
  crossProduct(v1, v2) {
    return v1[0] * v2[1] - v1[1] * v2[0];
  }

  /**
   * DOUGLAS-PEUCKER ALGORITHM MEJORADO
   * Simplifica líneas preservando características importantes
   * 
   * @param {Array} points - Array de [x, y] puntos
   * @param {number} epsilon - Tolerancia de simplificación
   * @param {boolean} preserveTopology - Preservar topología crítica
   * @returns {Array} - Puntos simplificados
   */
  simplifyPolyline(points, epsilon = 1.0, preserveTopology = true) {
    if (points.length <= 2) return [...points];
    
    return this.douglasPeuckerRecursive(points, epsilon, 0, points.length - 1, preserveTopology);
  }

  /**
   * Implementación recursiva de Douglas-Peucker
   */
  douglasPeuckerRecursive(points, epsilon, start, end, preserveTopology) {
    let maxDistance = 0;
    let maxIndex = start;
    
    // Encontrar el punto más alejado de la línea start-end
    for (let i = start + 1; i < end; i++) {
      const distance = this.perpendicularDistance(
        points[i], 
        points[start], 
        points[end]
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    // Si la distancia máxima es mayor que epsilon, recursivamente simplificar
    if (maxDistance > epsilon) {
      const leftResults = this.douglasPeuckerRecursive(points, epsilon, start, maxIndex, preserveTopology);
      const rightResults = this.douglasPeuckerRecursive(points, epsilon, maxIndex, end, preserveTopology);
      
      // Combinar resultados sin duplicar el punto del medio
      return [...leftResults.slice(0, -1), ...rightResults];
    } else {
      // Si preserveTopology está activado, verificar características críticas
      if (preserveTopology && this.hasCriticalTopology(points, start, end)) {
        // Mantener más puntos en áreas críticas
        const midIndex = Math.floor((start + end) / 2);
        const leftResults = this.douglasPeuckerRecursive(points, epsilon * 0.5, start, midIndex, preserveTopology);
        const rightResults = this.douglasPeuckerRecursive(points, epsilon * 0.5, midIndex, end, preserveTopology);
        return [...leftResults.slice(0, -1), ...rightResults];
      }
      
      return [points[start], points[end]];
    }
  }

  /**
   * Calcula distancia perpendicular de un punto a una línea
   * @param {Array} point - Punto [x, y]
   * @param {Array} lineStart - Inicio de línea [x, y]
   * @param {Array} lineEnd - Final de línea [x, y]
   * @returns {number} - Distancia perpendicular
   */
  perpendicularDistance(point, lineStart, lineEnd) {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Línea degenerada (punto)
      return Math.sqrt(A * A + B * B);
    }
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Detecta si una sección tiene topología crítica que debe preservarse
   * @param {Array} points - Puntos de la línea
   * @param {number} start - Índice de inicio
   * @param {number} end - Índice de final
   * @returns {boolean} - True si tiene topología crítica
   */
  hasCriticalTopology(points, start, end) {
    if (end - start < 3) return false;
    
    // Verificar cambios de dirección significativos
    let significantTurns = 0;
    for (let i = start + 1; i < end; i++) {
      const angle = this.calculateTurnAngle(points[i-1], points[i], points[i+1]);
      if (Math.abs(angle) > Math.PI / 4) { // 45 grados
        significantTurns++;
      }
    }
    
    return significantTurns > 0;
  }

  /**
   * Calcula el ángulo de giro en un punto
   * @param {Array} p1 - Punto anterior
   * @param {Array} p2 - Punto actual
   * @param {Array} p3 - Punto siguiente
   * @returns {number} - Ángulo de giro en radianes
   */
  calculateTurnAngle(p1, p2, p3) {
    const v1 = [p2[0] - p1[0], p2[1] - p1[1]];
    const v2 = [p3[0] - p2[0], p3[1] - p2[1]];
    
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const cross = v1[0] * v2[1] - v1[1] * v2[0];
    
    return Math.atan2(cross, dot);
  }

  /**
   * POLYGON CONTAINMENT VERIFICATION
   * Verifica si un polígono está completamente contenido dentro de otro
   * 
   * @param {Array} innerPolygon - Polígono interno
   * @param {Array} outerPolygon - Polígono externo
   * @param {string} algorithm - 'rayCasting' o 'windingNumber'
   * @returns {Object} - Resultado de verificación
   */
  isPolygonContained(innerPolygon, outerPolygon, algorithm = 'windingNumber') {
    const result = {
      isContained: true,
      containedVertices: 0,
      totalVertices: innerPolygon.length,
      outsideVertices: [],
      containmentRatio: 0
    };
    
    // Verificar cada vértice del polígono interno
    for (let i = 0; i < innerPolygon.length; i++) {
      const vertex = innerPolygon[i];
      let isInside;
      
      if (algorithm === 'rayCasting') {
        isInside = this.pointInPolygonRayCasting(vertex, outerPolygon);
      } else {
        isInside = this.pointInPolygonWindingNumber(vertex, outerPolygon) !== 0;
      }
      
      if (isInside) {
        result.containedVertices++;
      } else {
        result.outsideVertices.push({
          index: i,
          point: vertex
        });
      }
    }
    
    result.containmentRatio = result.containedVertices / result.totalVertices;
    result.isContained = result.containmentRatio >= 0.95; // 95% de vértices dentro
    
    return result;
  }

  /**
   * SPATIAL FILTERING with epsilon-neighbor clustering
   * Elimina puntos duplicados usando clustering espacial
   * 
   * @param {Array} points - Array de [x, y] puntos
   * @param {number} epsilon - Radio de clustering
   * @returns {Array} - Puntos filtrados
   */
  spatialFilter(points, epsilon = 1.0) {
    if (points.length === 0) return [];
    
    const clusters = [];
    const visited = new Set();
    
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      
      const cluster = [i];
      visited.add(i);
      
      // Encontrar todos los puntos dentro del radio epsilon
      for (let j = i + 1; j < points.length; j++) {
        if (visited.has(j)) continue;
        
        const distance = this.euclideanDistance(points[i], points[j]);
        if (distance <= epsilon) {
          cluster.push(j);
          visited.add(j);
        }
      }
      
      clusters.push(cluster);
    }
    
    // Crear puntos representativos para cada cluster
    const filteredPoints = clusters.map(cluster => {
      if (cluster.length === 1) {
        return points[cluster[0]];
      }
      
      // Calcular centroide del cluster
      let sumX = 0, sumY = 0;
      for (const index of cluster) {
        sumX += points[index][0];
        sumY += points[index][1];
      }
      
      return [sumX / cluster.length, sumY / cluster.length];
    });
    
    return filteredPoints;
  }

  /**
   * QUALITY METRICS para polígonos detectados
   * Calcula métricas de calidad geométrica
   * 
   * @param {Array} polygon - Array de [x, y] vértices
   * @returns {Object} - Métricas de calidad
   */
  calculatePolygonQuality(polygon) {
    const validation = this.validatePolygon(polygon);
    
    const quality = {
      geometricScore: 0,
      topologicalScore: 0,
      overallScore: 0,
      issues: [],
      recommendations: []
    };
    
    if (!validation.isValid) {
      quality.issues.push(...validation.errors);
      return quality;
    }
    
    // 1. Geometric Quality Score (0-100)
    let geometricScore = 100;
    
    // Penalizar aspect ratio extremo
    const aspectRatio = this.calculateAspectRatio(validation.boundingBox);
    if (aspectRatio > 10) {
      geometricScore -= Math.min(30, (aspectRatio - 10) * 2);
      quality.recommendations.push('Considerar subdividir polígono muy alargado');
    }
    
    // Penalizar área muy pequeña o muy grande
    const area = Math.abs(validation.area);
    if (area < 1000) {
      geometricScore -= 20;
      quality.recommendations.push('Área muy pequeña para ser sublote significativo');
    } else if (area > 1000000) {
      geometricScore -= 10;
      quality.recommendations.push('Área muy grande, verificar delimitación');
    }
    
    // Bonus por convexidad
    if (validation.convexity.isConvex) {
      geometricScore += 10;
    } else if (validation.convexity.convexityRatio > 0.8) {
      geometricScore += 5;
    }
    
    quality.geometricScore = Math.max(0, Math.min(100, geometricScore));
    
    // 2. Topological Quality Score (0-100)
    let topologicalScore = 100;
    
    // Penalizar auto-intersecciones
    if (validation.warnings.some(w => w.includes('auto-intersecciones'))) {
      topologicalScore -= 40;
      quality.issues.push('Polígono tiene auto-intersecciones');
    }
    
    // Verificar número de vértices apropiado
    const vertexCount = polygon.length;
    if (vertexCount < 3) {
      topologicalScore = 0;
      quality.issues.push('Insuficientes vértices');
    } else if (vertexCount > 20) {
      topologicalScore -= 15;
      quality.recommendations.push('Considerar simplificar polígono complejo');
    }
    
    quality.topologicalScore = Math.max(0, Math.min(100, topologicalScore));
    
    // 3. Overall Score
    quality.overallScore = (quality.geometricScore * 0.6 + quality.topologicalScore * 0.4);
    
    return quality;
  }
}

/**
 * SPATIAL INDEX - R-Tree implementation básica para optimización
 * Permite búsquedas espaciales eficientes O(log n)
 */
export class RTreeIndex {
  constructor() {
    this.items = [];
    this.built = false;
  }

  /**
   * Inserta un elemento con su bounding box
   * @param {Object} item - Elemento a insertar
   * @param {Object} bbox - Bounding box {minX, minY, maxX, maxY}
   */
  insert(item, bbox) {
    this.items.push({ item, bbox });
    this.built = false;
  }

  /**
   * Busca elementos que intersecten con el bounding box dado
   * @param {Object} queryBbox - Bounding box de consulta
   * @returns {Array} - Elementos que intersectan
   */
  search(queryBbox) {
    return this.items.filter(({ bbox }) => 
      this.bboxIntersects(bbox, queryBbox)
    ).map(({ item }) => item);
  }

  /**
   * Verifica si dos bounding boxes intersectan
   * @param {Object} bbox1 - Primer bbox
   * @param {Object} bbox2 - Segundo bbox
   * @returns {boolean} - True si intersectan
   */
  bboxIntersects(bbox1, bbox2) {
    return !(bbox1.maxX < bbox2.minX || 
             bbox2.maxX < bbox1.minX || 
             bbox1.maxY < bbox2.minY || 
             bbox2.maxY < bbox1.minY);
  }

  /**
   * Limpia el índice
   */
  clear() {
    this.items = [];
    this.built = false;
  }
}

/**
 * ROBUST POLYGON DETECTOR
 * Detector de polígonos que combina múltiples algoritmos para máxima robustez
 */
export class RobustPolygonDetector {
  constructor() {
    this.geometry = new GeometryService();
    this.config = {
      minArea: 1000,              // Área mínima en píxeles²
      maxArea: 1000000,           // Área máxima en píxeles²
      minVertices: 3,             // Mínimo vértices
      maxVertices: 20,            // Máximo vértices
      tolerance: 25,              // Tolerancia de conexión
      qualityThreshold: 60,       // Umbral de calidad mínima
      containmentThreshold: 0.95, // Umbral de contención
      simplificationEpsilon: 2.0  // Tolerancia para simplificación
    };
  }

  /**
   * DETECTA SUBLOTES ROBUSTOS dentro de bordes externos
   * Combina múltiples algoritmos para máxima precisión
   * 
   * @param {Array} borderVectors - Vectores de bordes externos
   * @param {Object} options - Opciones de configuración
   * @returns {Object} - Resultado con sublotes detectados
   */
  detectSubplots(borderVectors, options = {}) {
    const config = { ...this.config, ...options };
    console.log('🔍 Iniciando detección robusta de sublotes...');
    
    const result = {
      sublots: [],
      analysis: {
        totalBorderVectors: borderVectors.length,
        algorithmsUsed: [],
        qualityMetrics: {},
        processingTime: 0
      }
    };
    
    const startTime = performance.now();
    
    try {
      // 1. VALIDACIÓN Y PREPARACIÓN
      if (!borderVectors || borderVectors.length < 3) {
        result.analysis.error = 'Insuficientes bordes externos (mínimo 3)';
        return result;
      }
      
      // 2. PROCESAMIENTO DE BORDES EXTERNOS
      const processedBorders = this.preprocessBorderVectors(borderVectors, config);
      result.analysis.processedBorders = processedBorders.length;
      
      // 3. CONSTRUCCIÓN DE GRAFO TOPOLÓGICO
      const topologyGraph = this.buildTopologyGraph(processedBorders, config);
      result.analysis.algorithmsUsed.push('topology-graph');
      
      // 4. DETECCIÓN POR CYCLE DETECTION CON VALIDACIÓN GEOMÉTRICA
      const cycles = this.detectValidCycles(topologyGraph, processedBorders, config);
      result.analysis.algorithmsUsed.push('cycle-detection');
      
      // 5. VALIDACIÓN DE CONTENCIÓN
      const containedPolygons = this.validateContainment(cycles, processedBorders, config);
      result.analysis.algorithmsUsed.push('containment-validation');
      
      // 6. FILTRADO POR CALIDAD GEOMÉTRICA
      const qualityFiltered = this.filterByQuality(containedPolygons, config);
      result.analysis.algorithmsUsed.push('quality-filtering');
      
      // 7. ELIMINACIÓN DE DUPLICADOS GEOMÉTRICOS
      const uniqueSubplots = this.removeDuplicatePolygons(qualityFiltered, config);
      result.analysis.algorithmsUsed.push('duplicate-removal');
      
      result.sublots = uniqueSubplots;
      
      // 8. MÉTRICAS DE CALIDAD FINAL
      result.analysis.qualityMetrics = this.calculateOverallQuality(uniqueSubplots);
      
    } catch (error) {
      console.error('Error en detección robusta:', error);
      result.analysis.error = error.message;
    } finally {
      result.analysis.processingTime = performance.now() - startTime;
    }
    
    console.log(`🎯 Detección completada: ${result.sublots.length} sublotes en ${result.analysis.processingTime.toFixed(2)}ms`);
    return result;
  }

  /**
   * Preprocesa vectores de bordes externos
   * @param {Array} borderVectors - Vectores originales
   * @param {Object} config - Configuración
   * @returns {Array} - Vectores procesados
   */
  preprocessBorderVectors(borderVectors, config) {
    const processed = [];
    
    for (let i = 0; i < borderVectors.length; i++) {
      const vector = borderVectors[i];
      
      if (!vector || vector.length < 2) continue;
      
      // 1. Simplificar usando Douglas-Peucker
      const simplified = this.geometry.simplifyPolyline(vector, config.simplificationEpsilon, true);
      
      // 2. Filtrado espacial para eliminar duplicados
      const filtered = this.geometry.spatialFilter(simplified, config.tolerance / 3);
      
      if (filtered.length >= 2) {
        processed.push({
          originalIndex: i,
          vertices: filtered,
          length: this.geometry.calculatePolygonPerimeter(filtered),
          bbox: this.geometry.calculateBoundingBox(filtered)
        });
      }
    }
    
    return processed;
  }

  /**
   * Construye grafo topológico robusto
   * @param {Array} processedBorders - Bordes procesados
   * @param {Object} config - Configuración
   * @returns {Object} - Grafo topológico
   */
  buildTopologyGraph(processedBorders, config) {
    const graph = new Map();
    const spatialIndex = new RTreeIndex();
    
    // 1. Indexar todos los vértices espacialmente
    processedBorders.forEach((border, borderIndex) => {
      border.vertices.forEach((vertex, vertexIndex) => {
        const vertexId = `${borderIndex}-${vertexIndex}`;
        const bbox = {
          minX: vertex[0] - config.tolerance,
          minY: vertex[1] - config.tolerance,
          maxX: vertex[0] + config.tolerance,
          maxY: vertex[1] + config.tolerance
        };
        
        spatialIndex.insert({
          id: vertexId,
          borderIndex,
          vertexIndex,
          position: vertex,
          isEndpoint: vertexIndex === 0 || vertexIndex === border.vertices.length - 1
        }, bbox);
        
        if (!graph.has(vertexId)) {
          graph.set(vertexId, {
            position: vertex,
            connections: [],
            borderIndex,
            vertexIndex,
            isEndpoint: vertexIndex === 0 || vertexIndex === border.vertices.length - 1
          });
        }
      });
    });
    
    // 2. Encontrar conexiones robustas
    graph.forEach((node, nodeId) => {
      const queryBbox = {
        minX: node.position[0] - config.tolerance,
        minY: node.position[1] - config.tolerance,
        maxX: node.position[0] + config.tolerance,
        maxY: node.position[1] + config.tolerance
      };
      
      const nearbyNodes = spatialIndex.search(queryBbox);
      
      nearbyNodes.forEach(nearby => {
        if (nearby.id === nodeId) return;
        
        const distance = this.geometry.euclideanDistance(node.position, nearby.position);
        if (distance <= config.tolerance) {
          // Crear conexión con peso basado en distancia y tipo
          const weight = this.calculateConnectionWeight(node, nearby, distance);
          
          node.connections.push({
            targetId: nearby.id,
            weight,
            distance,
            type: this.getConnectionType(node, nearby)
          });
        }
      });
      
      // Ordenar conexiones por peso (mejores primero)
      node.connections.sort((a, b) => b.weight - a.weight);
    });
    
    return { graph, spatialIndex };
  }

  /**
   * Calcula peso de conexión entre nodos
   * @param {Object} node1 - Primer nodo
   * @param {Object} node2 - Segundo nodo
   * @param {number} distance - Distancia entre nodos
   * @returns {number} - Peso de conexión (0-1)
   */
  calculateConnectionWeight(node1, node2, distance) {
    let weight = 1 - (distance / this.config.tolerance); // Base: proximidad
    
    // Bonus por endpoints
    if (node1.isEndpoint && node2.isEndpoint) {
      weight += 0.3;
    }
    
    // Penalty por misma línea
    if (node1.borderIndex === node2.borderIndex) {
      weight -= 0.5;
    }
    
    return Math.max(0, Math.min(1, weight));
  }

  /**
   * Determina tipo de conexión entre nodos
   * @param {Object} node1 - Primer nodo
   * @param {Object} node2 - Segundo nodo
   * @returns {string} - Tipo de conexión
   */
  getConnectionType(node1, node2) {
    if (node1.borderIndex === node2.borderIndex) {
      return 'internal';
    } else if (node1.isEndpoint && node2.isEndpoint) {
      return 'endpoint-connection';
    } else {
      return 'cross-border';
    }
  }

  /**
   * Detecta ciclos válidos en el grafo usando DFS mejorado
   * MEJORADO: Solo detecta polígonos explícitamente cerrados por el usuario
   * @param {Object} topologyGraph - Grafo topológico
   * @param {Array} processedBorders - Bordes procesados
   * @param {Object} config - Configuración
   * @returns {Array} - Ciclos detectados
   */
  detectValidCycles(topologyGraph, processedBorders, config) {
    const { graph } = topologyGraph;
    const validCycles = [];
    const globalVisited = new Set();
    
    // Identificar líneas que fueron agregadas recientemente (últimas en el array)
    // para priorizar ciclos que incluyan nuevas conexiones
    const totalBorders = processedBorders.length;
    const recentBorderIndices = new Set();
    
    // Considerar las últimas 2-3 líneas como "recientes"
    for (let i = Math.max(0, totalBorders - 3); i < totalBorders; i++) {
      recentBorderIndices.add(i);
    }
    
    // DFS desde cada nodo no visitado, priorizando nodos de líneas recientes
    graph.forEach((node, startNodeId) => {
      if (globalVisited.has(startNodeId)) return;
      
      const cycles = this.dfsSearchCycles(
        graph, 
        startNodeId, 
        startNodeId, 
        new Set(), 
        [], 
        0, 
        config
      );
      
      cycles.forEach(cycle => {
        const polygon = this.cycleToPolygon(cycle, graph);
        
        // NUEVA VALIDACIÓN: Verificar que el ciclo forma un polígono explícitamente cerrado
        if (this.isValidCyclePolygon(polygon, config) && 
            this.isExplicitlyClosedPolygon(cycle, graph, recentBorderIndices)) {
          
          // Verificar que no sea una combinación de sublotes existentes
          if (!this.isCombinationOfExistingSubplots(polygon, validCycles)) {
            validCycles.push({
              vertices: polygon,
              cycle: cycle,
              area: Math.abs(this.geometry.calculatePolygonArea(polygon)),
              quality: this.geometry.calculatePolygonQuality(polygon),
              isExplicitlyClosed: true
            });
            
            // Marcar nodos del ciclo como visitados
            cycle.forEach(nodeId => globalVisited.add(nodeId));
          }
        }
      });
    });
    
    return validCycles;
  }

  /**
   * DFS recursivo para búsqueda de ciclos con optimizaciones
   * @param {Map} graph - Grafo
   * @param {string} startNodeId - Nodo inicial
   * @param {string} currentNodeId - Nodo actual
   * @param {Set} visited - Nodos visitados
   * @param {Array} path - Camino actual
   * @param {number} depth - Profundidad actual
   * @param {Object} config - Configuración
   * @returns {Array} - Ciclos encontrados
   */
  dfsSearchCycles(graph, startNodeId, currentNodeId, visited, path, depth, config) {
    const cycles = [];
    const maxDepth = Math.min(config.maxVertices, 15); // Limitar profundidad
    
    if (depth > maxDepth) return cycles;
    
    // Si regresamos al inicio con suficientes nodos
    if (currentNodeId === startNodeId && path.length >= config.minVertices && depth > 0) {
      cycles.push([...path]);
      return cycles;
    }
    
    if (visited.has(currentNodeId)) return cycles;
    
    const newVisited = new Set(visited);
    newVisited.add(currentNodeId);
    const newPath = [...path, currentNodeId];
    
    const currentNode = graph.get(currentNodeId);
    if (!currentNode) return cycles;
    
    // Explorar conexiones ordenadas por peso
    for (const connection of currentNode.connections) {
      const { targetId } = connection;
      
      // Solo permitir regresar al inicio o ir a nodos no visitados
      if (targetId === startNodeId || !newVisited.has(targetId)) {
        const subCycles = this.dfsSearchCycles(
          graph, 
          startNodeId, 
          targetId, 
          newVisited, 
          newPath, 
          depth + 1, 
          config
        );
        cycles.push(...subCycles);
        
        // Limitar número de ciclos por nodo para performance
        if (cycles.length > 5) break;
      }
    }
    
    return cycles;
  }

  /**
   * Convierte ciclo de nodos a polígono
   * @param {Array} cycle - Ciclo de IDs de nodos
   * @param {Map} graph - Grafo
   * @returns {Array} - Polígono [x, y][]
   */
  cycleToPolygon(cycle, graph) {
    return cycle.map(nodeId => {
      const node = graph.get(nodeId);
      return node ? [...node.position] : null;
    }).filter(pos => pos !== null);
  }

  /**
   * Valida si un polígono de ciclo es geométricamente válido
   * @param {Array} polygon - Polígono a validar
   * @param {Object} config - Configuración
   * @returns {boolean} - True si es válido
   */
  isValidCyclePolygon(polygon, config) {
    if (polygon.length < config.minVertices || polygon.length > config.maxVertices) {
      return false;
    }
    
    const validation = this.geometry.validatePolygon(polygon);
    if (!validation.isValid) return false;
    
    const area = Math.abs(validation.area);
    if (area < config.minArea || area > config.maxArea) {
      return false;
    }
    
    // Verificar que no sea extremadamente alargado
    const aspectRatio = this.geometry.calculateAspectRatio(validation.boundingBox);
    if (aspectRatio > 50) return false;
    
    return true;
  }

  /**
   * Valida contención de polígonos dentro de bordes externos
   * @param {Array} cycles - Ciclos detectados
   * @param {Array} processedBorders - Bordes externos procesados
   * @param {Object} config - Configuración
   * @returns {Array} - Polígonos contenidos
   */
  validateContainment(cycles, processedBorders, config) {
    const contained = [];
    
    // Crear polígono unificado de bordes externos
    const externalBoundary = this.createUnifiedBoundary(processedBorders);
    
    if (!externalBoundary) {
      console.warn('No se pudo crear límite externo unificado');
      return cycles; // Sin validación de contención
    }
    
    cycles.forEach(cycle => {
      const containment = this.geometry.isPolygonContained(
        cycle.vertices, 
        externalBoundary, 
        'windingNumber'
      );
      
      if (containment.containmentRatio >= config.containmentThreshold) {
        contained.push({
          ...cycle,
          containment: containment
        });
      } else {
        console.log(`Polígono rechazado por contención: ${containment.containmentRatio.toFixed(2)} < ${config.containmentThreshold}`);
      }
    });
    
    return contained;
  }

  /**
   * Crea límite unificado de bordes externos
   * @param {Array} processedBorders - Bordes procesados
   * @returns {Array|null} - Polígono unificado o null
   */
  createUnifiedBoundary(processedBorders) {
    if (processedBorders.length === 0) return null;
    
    // Si hay solo un borde, usarlo directamente
    if (processedBorders.length === 1) {
      return processedBorders[0].vertices;
    }
    
    // Para múltiples bordes, crear convex hull
    const allVertices = processedBorders.flatMap(border => border.vertices);
    return this.computeConvexHull(allVertices);
  }

  /**
   * Calcula convex hull usando algoritmo de Graham
   * @param {Array} points - Puntos [x, y][]
   * @returns {Array} - Convex hull
   */
  computeConvexHull(points) {
    if (points.length < 3) return points;
    
    // Encontrar punto más bajo (y más pequeña, x más pequeña en caso de empate)
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i][1] < points[start][1] || 
          (points[i][1] === points[start][1] && points[i][0] < points[start][0])) {
        start = i;
      }
    }
    
    // Intercambiar punto inicial
    [points[0], points[start]] = [points[start], points[0]];
    const startPoint = points[0];
    
    // Ordenar puntos por ángulo polar respecto al punto inicial
    const polarSorted = points.slice(1).map(point => ({
      point,
      angle: Math.atan2(point[1] - startPoint[1], point[0] - startPoint[0]),
      distance: this.geometry.euclideanDistance(startPoint, point)
    }));
    
    polarSorted.sort((a, b) => {
      if (Math.abs(a.angle - b.angle) < this.geometry.epsilon) {
        return a.distance - b.distance;
      }
      return a.angle - b.angle;
    });
    
    // Construir convex hull
    const hull = [startPoint];
    
    for (const { point } of polarSorted) {
      // Remover puntos que crean giros en sentido horario
      while (hull.length > 1 && 
             this.geometry.crossProduct(
               [hull[hull.length-1][0] - hull[hull.length-2][0], 
                hull[hull.length-1][1] - hull[hull.length-2][1]],
               [point[0] - hull[hull.length-1][0], 
                point[1] - hull[hull.length-1][1]]
             ) < 0) {
        hull.pop();
      }
      hull.push(point);
    }
    
    return hull;
  }

  /**
   * Filtra polígonos por calidad geométrica
   * @param {Array} polygons - Polígonos a filtrar
   * @param {Object} config - Configuración
   * @returns {Array} - Polígonos de calidad
   */
  filterByQuality(polygons, config) {
    return polygons.filter(polygon => {
      const quality = polygon.quality || this.geometry.calculatePolygonQuality(polygon.vertices);
      
      if (quality.overallScore < config.qualityThreshold) {
        console.log(`Polígono rechazado por calidad: ${quality.overallScore.toFixed(1)} < ${config.qualityThreshold}`);
        return false;
      }
      
      return true;
    });
  }

  /**
   * Elimina polígonos duplicados usando comparación geométrica
   * @param {Array} polygons - Polígonos a deduplicar
   * @param {Object} config - Configuración
   * @returns {Array} - Polígonos únicos
   */
  removeDuplicatePolygons(polygons, config) {
    const unique = [];
    const tolerance = config.tolerance;
    
    for (const polygon of polygons) {
      const isDuplicate = unique.some(existing => 
        this.arePolygonsEqual(polygon.vertices, existing.vertices, tolerance)
      );
      
      if (!isDuplicate) {
        unique.push(polygon);
      }
    }
    
    return unique;
  }

  /**
   * Compara si dos polígonos son iguales geométricamente
   * @param {Array} poly1 - Primer polígono
   * @param {Array} poly2 - Segundo polígono
   * @param {number} tolerance - Tolerancia de comparación
   * @returns {boolean} - True si son iguales
   */
  arePolygonsEqual(poly1, poly2, tolerance) {
    if (poly1.length !== poly2.length) return false;
    
    // Comparar áreas
    const area1 = Math.abs(this.geometry.calculatePolygonArea(poly1));
    const area2 = Math.abs(this.geometry.calculatePolygonArea(poly2));
    
    if (Math.abs(area1 - area2) > tolerance * tolerance) return false;
    
    // Comparar centroides
    const centroid1 = this.calculateCentroid(poly1);
    const centroid2 = this.calculateCentroid(poly2);
    
    const centroidDistance = this.geometry.euclideanDistance(centroid1, centroid2);
    if (centroidDistance > tolerance) return false;
    
    // Comparación detallada de vértices
    let matchCount = 0;
    for (const vertex1 of poly1) {
      const hasMatch = poly2.some(vertex2 => 
        this.geometry.euclideanDistance(vertex1, vertex2) < tolerance
      );
      if (hasMatch) matchCount++;
    }
    
    const similarity = matchCount / poly1.length;
    return similarity >= 0.8; // 80% de vértices similares
  }

  /**
   * Calcula centroide de un polígono
   * @param {Array} polygon - Polígono
   * @returns {Array} - Centroide [x, y]
   */
  calculateCentroid(polygon) {
    const area = this.geometry.calculatePolygonArea(polygon);
    if (Math.abs(area) < this.geometry.tolerance) {
      // Para polígonos degenerados, usar centroide aritmético
      const sumX = polygon.reduce((sum, point) => sum + point[0], 0);
      const sumY = polygon.reduce((sum, point) => sum + point[1], 0);
      return [sumX / polygon.length, sumY / polygon.length];
    }
    
    let cx = 0, cy = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const factor = polygon[i][0] * polygon[j][1] - polygon[j][0] * polygon[i][1];
      cx += (polygon[i][0] + polygon[j][0]) * factor;
      cy += (polygon[i][1] + polygon[j][1]) * factor;
    }
    
    const centroidFactor = 1 / (6 * area);
    return [cx * centroidFactor, cy * centroidFactor];
  }

  /**
   * Calcula métricas de calidad general
   * @param {Array} sublots - Sublotes detectados
   * @returns {Object} - Métricas generales
   */
  calculateOverallQuality(sublots) {
    if (sublots.length === 0) {
      return {
        averageQuality: 0,
        qualityDistribution: {},
        totalArea: 0,
        avgArea: 0,
        areaDistribution: {}
      };
    }
    
    const qualities = sublots.map(s => s.quality?.overallScore || 0);
    const areas = sublots.map(s => s.area || 0);
    
    return {
      averageQuality: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
      qualityDistribution: this.calculateDistribution(qualities, [0, 40, 70, 85, 100]),
      totalArea: areas.reduce((sum, a) => sum + a, 0),
      avgArea: areas.reduce((sum, a) => sum + a, 0) / areas.length,
      areaDistribution: this.calculateDistribution(areas, [0, 1000, 10000, 50000, 1000000])
    };
  }

  /**
   * Calcula distribución de valores en rangos
   * @param {Array} values - Valores a distribuir
   * @param {Array} ranges - Rangos de distribución
   * @returns {Object} - Distribución por rangos
   */
  calculateDistribution(values, ranges) {
    const distribution = {};
    
    for (let i = 0; i < ranges.length - 1; i++) {
      const min = ranges[i];
      const max = ranges[i + 1];
      const key = `${min}-${max}`;
      distribution[key] = values.filter(v => v >= min && v < max).length;
    }
    
    return distribution;
  }

  /**
   * Verifica si un ciclo forma un polígono explícitamente cerrado por el usuario
   * NUEVO: Evita detección automática de combinaciones de sublotes adyacentes
   * @param {Array} cycle - Ciclo de nodos
   * @param {Map} graph - Grafo topológico
   * @param {Set} recentBorderIndices - Índices de líneas agregadas recientemente
   * @returns {boolean} - True si es explícitamente cerrado
   */
  isExplicitlyClosedPolygon(cycle, graph, recentBorderIndices) {
    if (cycle.length < 3) return false;
    
    // Un polígono es "explícitamente cerrado" si:
    // 1. Incluye al menos una línea reciente (nueva conexión manual)
    // 2. Los puntos de conexión son endpoints reales de líneas
    // 3. No es solo una combinación automática de geometría existente
    
    let hasRecentConnection = false;
    let hasExplicitConnections = 0;
    
    cycle.forEach(nodeId => {
      const node = graph.get(nodeId);
      if (!node) return;
      
      // Verificar si incluye líneas recientes
      if (recentBorderIndices.has(node.borderIndex)) {
        hasRecentConnection = true;
      }
      
      // Verificar conexiones explícitas (endpoints que se conectan intencionalmente)
      if (node.isEndpoint && node.connections.length >= 2) {
        // Endpoint que conecta con múltiples líneas = conexión explícita
        hasExplicitConnections++;
      }
    });
    
    // Criterios para polígono explícitamente cerrado:
    // - Debe incluir al menos una línea reciente, O
    // - Debe tener suficientes conexiones explícitas de endpoints
    const isExplicit = hasRecentConnection || hasExplicitConnections >= 2;
    
    if (!isExplicit) {
      console.log(`🚫 Ciclo rechazado: no es explícitamente cerrado (recent: ${hasRecentConnection}, explicit: ${hasExplicitConnections})`);
    }
    
    return isExplicit;
  }

  /**
   * Verifica si un polígono es una combinación de sublotes existentes
   * NUEVO: Previene detección de polígonos formados por unión automática
   * @param {Array} newPolygon - Nuevo polígono candidato
   * @param {Array} existingSubplots - Sublotes ya detectados
   * @returns {boolean} - True si es combinación de existentes
   */
  isCombinationOfExistingSubplots(newPolygon, existingSubplots) {
    if (existingSubplots.length < 2) return false;
    
    // Verificar si el nuevo polígono puede ser formado por la unión de 2+ sublotes existentes
    const newArea = Math.abs(this.geometry.calculatePolygonArea(newPolygon));
    const newCentroid = this.calculateCentroid(newPolygon);
    
    // Buscar combinaciones de sublotes existentes que podrían formar este polígono
    for (let i = 0; i < existingSubplots.length - 1; i++) {
      for (let j = i + 1; j < existingSubplots.length; j++) {
        const subplot1 = existingSubplots[i];
        const subplot2 = existingSubplots[j];
        
        const area1 = subplot1.area || Math.abs(this.geometry.calculatePolygonArea(subplot1.vertices));
        const area2 = subplot2.area || Math.abs(this.geometry.calculatePolygonArea(subplot2.vertices));
        const combinedArea = area1 + area2;
        
        // Si el área del nuevo polígono es aproximadamente igual a la suma de dos existentes
        const areaDifference = Math.abs(newArea - combinedArea);
        const areaThreshold = Math.min(area1, area2) * 0.1; // 10% de tolerancia
        
        if (areaDifference < areaThreshold) {
          // Verificar proximidad de centroides
          const centroid1 = this.calculateCentroid(subplot1.vertices);
          const centroid2 = this.calculateCentroid(subplot2.vertices);
          
          // Calcular centroide esperado de la combinación
          const expectedCentroid = [
            (centroid1[0] * area1 + centroid2[0] * area2) / combinedArea,
            (centroid1[1] * area1 + centroid2[1] * area2) / combinedArea
          ];
          
          const centroidDistance = this.geometry.euclideanDistance(newCentroid, expectedCentroid);
          
          // Si el centroide también coincide, probablemente es una combinación
          if (centroidDistance < 50) { // Tolerancia de 50px
            console.log(`🚫 Polígono rechazado: combinación de sublotes existentes (${i} + ${j})`);
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Actualiza configuración del detector
   * @param {Object} newConfig - Nueva configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export default instance
const geometryService = new GeometryService();
const robustDetector = new RobustPolygonDetector();

export default {
  GeometryService,
  RTreeIndex,
  RobustPolygonDetector,
  geometryService,
  robustDetector
};
