/**
 * Algoritmos de simplificación de polígonos para optimizar detección de bordes
 * Implementa Douglas-Peucker y otros algoritmos de simplificación
 */

/**
 * Algoritmo Douglas-Peucker para simplificación de polígonos
 * Reduce el número de puntos manteniendo la forma general
 * @param {Array} points - Array de puntos [x, y]
 * @param {number} tolerance - Tolerancia para simplificación (default: 2.0)
 * @returns {Array} - Array de puntos simplificado
 */
export const douglasPeucker = (points, tolerance = 2.0) => {
  if (points.length <= 2) return points;

  // Encontrar el punto más alejado de la línea entre el primer y último punto
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // Si la distancia máxima es mayor que la tolerancia, dividir recursivamente
  if (maxDistance > tolerance) {
    // Simplificar recursivamente las dos mitades
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    
    // Combinar resultados (eliminar punto duplicado)
    return left.slice(0, -1).concat(right);
  } else {
    // Si no hay puntos significativos, devolver solo los extremos
    return [firstPoint, lastPoint];
  }
};

/**
 * Calcula la distancia perpendicular de un punto a una línea
 * @param {Array} point - Punto [x, y]
 * @param {Array} lineStart - Inicio de línea [x, y]
 * @param {Array} lineEnd - Final de línea [x, y]
 * @returns {number} - Distancia perpendicular
 */
export const perpendicularDistance = (point, lineStart, lineEnd) => {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  // Caso especial: línea de longitud cero
  if (x1 === x2 && y1 === y2) {
    return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
  }

  // Fórmula de distancia punto-línea
  const numerator = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
  
  return numerator / denominator;
};

/**
 * Elimina puntos duplicados o extremadamente cercanos
 * @param {Array} points - Array de puntos [x, y]
 * @param {number} minDistance - Distancia mínima entre puntos (default: 1.0)
 * @returns {Array} - Array de puntos sin duplicados
 */
export const removeDuplicatePoints = (points, minDistance = 1.0) => {
  if (points.length <= 1) return points;

  const filtered = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const last = filtered[filtered.length - 1];
    
    const distance = Math.sqrt(
      Math.pow(current[0] - last[0], 2) + 
      Math.pow(current[1] - last[1], 2)
    );
    
    if (distance >= minDistance) {
      filtered.push(current);
    }
  }

  return filtered;
};

/**
 * Simplificación por mínima distancia angular
 * Elimina puntos que forman ángulos muy pequeños
 * @param {Array} points - Array de puntos [x, y]
 * @param {number} minAngle - Ángulo mínimo en radianes (default: 0.1)
 * @returns {Array} - Array de puntos simplificado
 */
export const simplifyByAngle = (points, minAngle = 0.1) => {
  if (points.length <= 2) return points;

  const simplified = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];

    const angle = calculateAngle(prev, current, next);
    
    if (angle >= minAngle) {
      simplified.push(current);
    }
  }

  simplified.push(points[points.length - 1]);
  return simplified;
};

/**
 * Calcula el ángulo entre tres puntos
 * @param {Array} a - Primer punto [x, y]
 * @param {Array} b - Punto central [x, y]
 * @param {Array} c - Tercer punto [x, y]
 * @returns {number} - Ángulo en radianes
 */
export const calculateAngle = (a, b, c) => {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [cx, cy] = c;

  const ab = Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
  const bc = Math.sqrt(Math.pow(cx - bx, 2) + Math.pow(cy - by, 2));
  const ac = Math.sqrt(Math.pow(cx - ax, 2) + Math.pow(cy - ay, 2));

  // Ley de cosenos
  const cosine = (ab * ab + bc * bc - ac * ac) / (2 * ab * bc);
  
  // Manejar errores de precisión
  const clampedCosine = Math.max(-1, Math.min(1, cosine));
  
  return Math.acos(clampedCosine);
};

/**
 * Simplificación de polígono combinando múltiples métodos
 * @param {Array} points - Array de puntos [x, y]
 * @param {Object} options - Opciones de simplificación
 * @returns {Array} - Array de puntos simplificado
 */
export const simplifyPolygon = (points, options = {}) => {
  const {
    douglasPeuckerTolerance = 5.0,
    minDistance = 8.0,
    minAngle = 0.1,
    maxPoints = 50,
    preserveShape = true
  } = options;

  console.log(`Simplificando polígono: ${points.length} puntos iniciales`);
  
  let simplified = [...points];

  // Paso 1: Eliminar puntos duplicados
  simplified = removeDuplicatePoints(simplified, minDistance);
  console.log(`   Después de eliminar duplicados: ${simplified.length} puntos`);

  // Paso 2: Simplificación Douglas-Peucker si hay muchos puntos
  if (simplified.length > maxPoints) {
    simplified = douglasPeucker(simplified, douglasPeuckerTolerance);
    console.log(`   Después de Douglas-Peucker: ${simplified.length} puntos`);
  }

  // Paso 3: Simplificación por ángulo si se preserva la forma
  if (preserveShape && simplified.length > 10) {
    simplified = simplifyByAngle(simplified, minAngle);
    console.log(`   Después de simplificación angular: ${simplified.length} puntos`);
  }

  // Paso 4: Validar que el polígono sigue siendo válido
  if (simplified.length < 3) {
    console.warn('⚠️  Simplificación resultó en polígono inválido, usando original');
    return points;
  }

  // Verificar que el área no cambió significativamente
  const originalArea = calculatePolygonArea(points);
  const simplifiedArea = calculatePolygonArea(simplified);
  const areaChange = Math.abs(originalArea - simplifiedArea) / originalArea;

  if (areaChange > 0.1 && preserveShape) { // Cambio > 10%
    console.warn('⚠️  Simplificación cambió demasiado el área, usando menor tolerancia');
    return douglasPeucker(points, douglasPeuckerTolerance / 2);
  }

  console.log(`✅ Simplificación completada: ${points.length} → ${simplified.length} puntos`);
  return simplified;
};

/**
 * Calcula el área de un polígono usando el algoritmo Shoelace
 * @param {Array} vertices - Array de vértices [x, y]
 * @returns {number} - Área del polígono
 */
export const calculatePolygonArea = (vertices) => {
  if (vertices.length < 3) return 0;
  
  let area = 0;
  const n = vertices.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i][0] * vertices[j][1];
    area -= vertices[j][0] * vertices[i][1];
  }
  
  return Math.abs(area) / 2;
};

/**
 * Optimiza un vector de líneas eliminando redundancias
 * @param {Array} vectors - Array de vectores (arrays de puntos)
 * @param {Object} options - Opciones de optimización
 * @returns {Array} - Vectores optimizados
 */
export const optimizeLineVectors = (vectors, options = {}) => {
  const {
    simplificationTolerance = 2.0,
    mergeTolerance = 5.0,
    minSegmentLength = 3.0
  } = options;

  console.log(`🔧 Optimizando ${vectors.length} vectores de líneas...`);
  
  const optimized = vectors.map((vector, index) => {
    console.log(`   Procesando vector ${index + 1}/${vectors.length} (${vector.length} puntos)`);
    
    // Simplificar el vector individual
    let simplified = simplifyPolygon(vector, {
      douglasPeuckerTolerance: simplificationTolerance,
      minDistance: 1.0,
      preserveShape: false,
      maxPoints: 100
    });

    // Eliminar segmentos muy cortos
    simplified = removeShortSegments(simplified, minSegmentLength);

    return simplified;
  }).filter(vector => vector.length >= 2); // Solo conservar vectores válidos

  console.log(`✅ Optimización completada: ${vectors.length} → ${optimized.length} vectores`);
  return optimized;
};

/**
 * Elimina segmentos muy cortos de un vector
 * @param {Array} vector - Vector de puntos
 * @param {number} minLength - Longitud mínima de segmento
 * @returns {Array} - Vector sin segmentos cortos
 */
export const removeShortSegments = (vector, minLength = 3.0) => {
  if (vector.length <= 2) return vector;

  const filtered = [vector[0]];

  for (let i = 1; i < vector.length; i++) {
    const current = vector[i];
    const last = filtered[filtered.length - 1];
    
    const segmentLength = Math.sqrt(
      Math.pow(current[0] - last[0], 2) + 
      Math.pow(current[1] - last[1], 2)
    );

    if (segmentLength >= minLength) {
      filtered.push(current);
    }
  }

  return filtered.length >= 2 ? filtered : vector;
};

/**
 * Detecta y simplifica polígonos complejos con auto-intersecciones
 * @param {Array} points - Puntos del polígono
 * @returns {Array} - Polígonos simplificados sin auto-intersecciones
 */
export const simplifyComplexPolygon = (points) => {
  console.log(`🔧 Simplificando polígono complejo con ${points.length} puntos`);
  
  // Primero, aplicar simplificación básica
  let simplified = simplifyPolygon(points, {
    douglasPeuckerTolerance: 4.0,
    minDistance: 3.0,
    maxPoints: 30
  });

  // Detectar auto-intersecciones
  const intersections = findSelfIntersections(simplified);
  
  if (intersections.length > 0) {
    console.log(`⚠️  Detectadas ${intersections.length} auto-intersecciones`);
    // TODO: Implementar resolución de auto-intersecciones
    // Por ahora, usar mayor tolerancia de simplificación
    simplified = douglasPeucker(points, 6.0);
  }

  return simplified;
};

/**
 * Encuentra auto-intersecciones en un polígono
 * @param {Array} points - Puntos del polígono
 * @returns {Array} - Array de intersecciones encontradas
 */
export const findSelfIntersections = (points) => {
  const intersections = [];

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      // Evitar verificar segmentos adyacentes
      if (j === points.length - 1 && i === 0) continue;

      const intersection = findLineIntersection(
        points[i], points[i + 1],
        points[j], points[j + 1]
      );

      if (intersection) {
        intersections.push({
          point: intersection,
          segments: [i, j]
        });
      }
    }
  }

  return intersections;
};

/**
 * Encuentra la intersección entre dos segmentos de línea
 * @param {Array} p1 - Primer punto del primer segmento
 * @param {Array} p2 - Segundo punto del primer segmento
 * @param {Array} p3 - Primer punto del segundo segmento
 * @param {Array} p4 - Segundo punto del segundo segmento
 * @returns {Array|null} - Punto de intersección o null
 */
export const findLineIntersection = (p1, p2, p3, p4) => {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  const [x4, y4] = p4;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null; // Líneas paralelas

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Verificar si la intersección está dentro de ambos segmentos
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [
      x1 + t * (x2 - x1),
      y1 + t * (y2 - y1)
    ];
  }

  return null;
};

export default {
  douglasPeucker,
  perpendicularDistance,
  removeDuplicatePoints,
  simplifyByAngle,
  calculateAngle,
  simplifyPolygon,
  calculatePolygonArea,
  optimizeLineVectors,
  removeShortSegments,
  simplifyComplexPolygon,
  findSelfIntersections,
  findLineIntersection
};
