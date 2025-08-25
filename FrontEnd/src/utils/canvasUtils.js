/**
 * Utilidades para dibujar elementos específicos en el canvas
 * Cada función tiene una responsabilidad específica y es reutilizable
 */

/**
 * Dibuja la cuadrícula de referencia
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {number} cellSize - Tamaño de cada celda en píxeles
 * @param {Object} transform - Transform actual (scale, translateX, translateY)
 */
export const drawGrid = (ctx, cellSize = 20, transform) => {
  const { width, height } = ctx.canvas;
  
  ctx.save();
  
  // Aplicar transformación para que la grid se mueva y escale con el contenido
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);
  
  // Configurar estilo de la grid
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
  ctx.lineWidth = 1 / transform.scale; // Ajustar grosor para que sea consistente
  
  // Calcular bounds visibles considerando transform
  const visibleLeft = (-transform.translateX) / transform.scale;
  const visibleTop = (-transform.translateY) / transform.scale;
  const visibleRight = (width - transform.translateX) / transform.scale;
  const visibleBottom = (height - transform.translateY) / transform.scale;
  
  // Calcular grid lines necesarias
  const startX = Math.floor(visibleLeft / cellSize) * cellSize;
  const endX = Math.ceil(visibleRight / cellSize) * cellSize;
  const startY = Math.floor(visibleTop / cellSize) * cellSize;
  const endY = Math.ceil(visibleBottom / cellSize) * cellSize;
  
  // Dibujar líneas verticales
  for (let x = startX; x <= endX; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, visibleTop);
    ctx.lineTo(x, visibleBottom);
    ctx.stroke();
  }
  
  // Dibujar líneas horizontales
  for (let y = startY; y <= endY; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(visibleLeft, y);
    ctx.lineTo(visibleRight, y);
    ctx.stroke();
  }
  
  ctx.restore();
};

/**
 * Dibuja la imagen de fondo
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {HTMLImageElement} image - Elemento de imagen
 * @param {Object} imageBounds - Bounds donde dibujar la imagen
 * @param {Object} transform - Transform actual
 */
export const drawBackgroundImage = (ctx, image, imageBounds, transform) => {
  if (!image || !image.complete) return;
  
  ctx.save();
  
  // Aplicar transformación
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);
  
  // Dibujar imagen
  ctx.drawImage(
    image,
    imageBounds.x,
    imageBounds.y,
    imageBounds.width,
    imageBounds.height
  );
  
  ctx.restore();
};

/**
 * Dibuja un vector (polígono) con vértices editables
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Array} vector - Array de puntos [x, y]
 * @param {string} type - Tipo de vector ('border', 'sublot', 'editing', 'lot')
 * @param {Object} transform - Transform actual
 * @param {Function} imageToCanvas - Función para convertir coordenadas de imagen a canvas
 * @param {boolean} showVertices - Si mostrar vértices editables
 */
export const drawVector = (ctx, vector, type = 'default', transform, imageToCanvas, showVertices = true, customColors = null) => {
  if (!vector || vector.length < 2) return;
  
  const colors = {
    default: { stroke: '#333333', fill: 'rgba(51, 51, 51, 0.1)', vertex: '#333333' },
    border: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.1)', vertex: '#ef4444' },
    sublot: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.1)', vertex: '#10b981' },
    editing: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)', vertex: '#3b82f6' },
    lot: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.1)', vertex: '#8b5cf6' }
  };
  
  // NUEVA FUNCIONALIDAD: Usar colores personalizados si se proporcionan
  let color;
  if (customColors) {
    color = {
      stroke: customColors.strokeColor || colors[type]?.stroke || colors.default.stroke,
      fill: customColors.fillColor || colors[type]?.fill || colors.default.fill,
      vertex: customColors.vertexColor || customColors.strokeColor || colors[type]?.vertex || colors.default.vertex
    };
  } else {
    color = colors[type] || colors.default;
  }
  
  ctx.save();
  
  // Aplicar transformación
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);
  
  // Convertir puntos de imagen a coordenadas del canvas
  const canvasPoints = vector.map(point => {
    if (Array.isArray(point) && point.length >= 2) {
      return imageToCanvas(point[0], point[1]);
    }
    return { x: 0, y: 0 };
  }).filter(point => point.x !== undefined && point.y !== undefined);
  
  // Solo dibujar si tenemos puntos válidos
  if (canvasPoints.length < 2) {
    ctx.restore();
    return;
  }
  
  // Dibujar líneas (no polígono cerrado para evitar relleno no deseado)
  ctx.beginPath();
  canvasPoints.forEach((point, i) => {
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  
  // Solo cerrar si es un sublote (polígono) y tiene suficientes puntos
  if (type === 'sublot' && canvasPoints.length >= 3) {
    ctx.closePath();
    ctx.fillStyle = color.fill;
    ctx.fill();
  }
  
  // Contornear siempre
  ctx.strokeStyle = color.stroke;
  ctx.lineWidth = Math.max(2 / transform.scale, 1); // Asegurar línea visible mínima
  ctx.stroke();
  
  // Dibujar vértices si están habilitados
  if (showVertices) {
    const vertexRadius = Math.max(6 / transform.scale, 3); // Radio mínimo visible
    
    ctx.fillStyle = 'white';
    ctx.strokeStyle = color.vertex;
    ctx.lineWidth = Math.max(2 / transform.scale, 1);
    
    canvasPoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, vertexRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Dibujar punto central
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(vertexRadius / 3, 1), 0, Math.PI * 2);
      ctx.fillStyle = color.vertex;
      ctx.fill();
      ctx.fillStyle = 'white'; // Restaurar para el próximo vértice
    });
  }
  
  ctx.restore();
};

/**
 * Dibuja un lote con información adicional
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Object} lote - Objeto lote con vértices y propiedades
 * @param {boolean} isSelected - Si el lote está seleccionado
 * @param {boolean} showLabels - Si mostrar etiquetas
 * @param {Object} transform - Transform actual
 * @param {Function} imageToCanvas - Función para convertir coordenadas
 */
export const drawLote = (ctx, lote, isSelected, showLabels, transform, imageToCanvas) => {
  if (!lote.vertices || lote.vertices.length < 3) return;
  
  const colors = {
    disponible: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.3)' },
    reservado: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.3)' },
    vendido: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.3)' }
  };
  
  const color = colors[lote.estado] || colors.disponible;
  
  ctx.save();
  
  // Aplicar transformación
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);
  
  // Convertir vértices
  const canvasVertices = lote.vertices.map(vertex => imageToCanvas(vertex[0], vertex[1]));
  
  // Dibujar polígono
  ctx.beginPath();
  canvasVertices.forEach((vertex, i) => {
    if (i === 0) {
      ctx.moveTo(vertex.x, vertex.y);
    } else {
      ctx.lineTo(vertex.x, vertex.y);
    }
  });
  ctx.closePath();
  
  // Estilo del lote
  ctx.fillStyle = color.fill;
  ctx.strokeStyle = isSelected ? '#3b82f6' : color.stroke;
  ctx.lineWidth = (isSelected ? 3 : 2) / transform.scale;
  if (isSelected) {
    ctx.setLineDash([5 / transform.scale, 5 / transform.scale]);
  }
  
  ctx.fill();
  ctx.stroke();
  
  // Restaurar línea sólida
  ctx.setLineDash([]);
  
  // Mostrar etiquetas
  if (showLabels && lote.nombre) {
    // Calcular centroide
    let centroidX = 0;
    let centroidY = 0;
    canvasVertices.forEach(vertex => {
      centroidX += vertex.x;
      centroidY += vertex.y;
    });
    centroidX /= canvasVertices.length;
    centroidY /= canvasVertices.length;
    
    ctx.fillStyle = color.stroke;
    ctx.font = `${14 / transform.scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lote.nombre, centroidX, centroidY);
  }
  
  ctx.restore();
};

/**
 * Encuentra el vértice más cercano a una posición
 * @param {number} x - Coordenada X del canvas
 * @param {number} y - Coordenada Y del canvas  
 * @param {Object} editableVectors - Vectores editables
 * @param {Function} imageToCanvas - Función de conversión
 * @param {Object} transform - Transform actual
 * @param {number} maxDistance - Distancia máxima en píxeles
 * @returns {Object|null} - Información del vértice encontrado
 */
export const findNearestVertex = (x, y, editableVectors, imageToCanvas, transform, maxDistance = 15) => {
  let nearest = null;
  let minDistance = maxDistance / transform.scale; // Ajustar distancia por zoom
  
  // Buscar en bordes externos
  editableVectors.bordes_externos.forEach((vector, vectorIndex) => {
    vector.forEach((point, pointIndex) => {
      const canvasPoint = imageToCanvas(point[0], point[1]);
      const distance = Math.sqrt(Math.pow(x - canvasPoint.x, 2) + Math.pow(y - canvasPoint.y, 2));
      
      if (distance < minDistance) {
        nearest = { type: 'bordes_externos', vectorIndex, pointIndex, distance };
        minDistance = distance;
      }
    });
  });
  
  // Buscar en sublotes
  editableVectors.sublotes.forEach((vector, vectorIndex) => {
    vector.forEach((point, pointIndex) => {
      const canvasPoint = imageToCanvas(point[0], point[1]);
      const distance = Math.sqrt(Math.pow(x - canvasPoint.x, 2) + Math.pow(y - canvasPoint.y, 2));
      
      if (distance < minDistance) {
        nearest = { type: 'sublotes', vectorIndex, pointIndex, distance };
        minDistance = distance;
      }
    });
  });
  
  return nearest;
};

/**
 * Dibuja vértices seleccionados con highlight
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Array} selectedVertices - Array de vértices seleccionados
 * @param {Function} imageToCanvas - Función de conversión
 * @param {Object} transform - Transform actual
 */
export const drawSelectedVertices = (ctx, selectedVertices, imageToCanvas, transform) => {
  if (selectedVertices.length === 0) return;

  ctx.save();
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);

  selectedVertices.forEach(vertex => {
    // VALIDACIÓN: Verificar que el vértice y su punto existan
    if (!vertex || !vertex.point || !Array.isArray(vertex.point) || vertex.point.length < 2) {
      console.warn('Vértice inválido detectado en drawSelectedVertices:', vertex);
      return; // Saltar este vértice
    }

    // Validar que las coordenadas sean números válidos
    const x = vertex.point[0];
    const y = vertex.point[1];
    
    if (!isFinite(x) || !isFinite(y)) {
      console.warn('Coordenadas inválidas en vértice:', vertex.point);
      return; // Saltar este vértice
    }

    try {
      const canvasPoint = imageToCanvas(x, y);
      
      // Validar que imageToCanvas retornó un punto válido
      if (!canvasPoint || !isFinite(canvasPoint.x) || !isFinite(canvasPoint.y)) {
        console.warn('Conversión de coordenadas falló:', { x, y, canvasPoint });
        return;
      }

      const radius = 8 / transform.scale;
      
      // Círculo exterior (highlight)
      ctx.beginPath();
      ctx.arc(canvasPoint.x, canvasPoint.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 193, 7, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#ffc107';
      ctx.lineWidth = 2 / transform.scale;
      ctx.stroke();
      
      // Punto central
      ctx.beginPath();
      ctx.arc(canvasPoint.x, canvasPoint.y, radius / 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8f00';
      ctx.fill();
    } catch (error) {
      console.error('Error dibujando vértice seleccionado:', error, vertex);
    }
  });

  ctx.restore();
};

/**
 * Dibuja puntos seleccionados para conexión con indicador especial
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Array} connectionPoints - Array de puntos para conectar
 * @param {Function} imageToCanvas - Función de conversión
 * @param {Object} transform - Transform actual
 */
export const drawConnectionPoints = (ctx, connectionPoints, imageToCanvas, transform) => {
  if (connectionPoints.length === 0) return;

  ctx.save();
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);

  connectionPoints.forEach((vertex, index) => {
    const canvasPoint = imageToCanvas(vertex.point[0], vertex.point[1]);
    const radius = 10 / transform.scale;
    
    // Color diferente para primer y segundo punto
    const color = index === 0 ? '#3b82f6' : '#10b981';
    
    // Círculo exterior pulsante
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `${color}40`; // Semi-transparente
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 / transform.scale;
    ctx.stroke();
    
    // Punto central
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, radius / 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Número de orden
    ctx.fillStyle = 'white';
    ctx.font = `${12 / transform.scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), canvasPoint.x, canvasPoint.y - radius - 8 / transform.scale);
  });

  ctx.restore();
};

/**
 * Dibuja un path temporal mientras se está dibujando
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Array} drawingPath - Array de puntos del path temporal
 * @param {Function} imageToCanvas - Función de conversión
 * @param {Object} transform - Transform actual
 * @param {boolean} isClosedPolygon - Si debe cerrar el polígono
 */
export const drawTemporaryPath = (ctx, drawingPath, imageToCanvas, transform, isClosedPolygon = false) => {
  if (drawingPath.length < 1) return;

  ctx.save();
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);

  // Convertir puntos a coordenadas del canvas
  const canvasPoints = drawingPath.map(point => {
    // Manejar diferentes formatos de punto
    if (point && typeof point === 'object') {
      if (point.x !== undefined && point.y !== undefined) {
        return imageToCanvas(point.x, point.y);
      } else if (Array.isArray(point) && point.length >= 2) {
        return imageToCanvas(point[0], point[1]);
      }
    }
    return { x: 0, y: 0 };
  });

  // Solo dibujar si tenemos al menos un punto válido
  if (canvasPoints.length === 0) {
    ctx.restore();
    return;
  }

  // Dibujar líneas si hay más de un punto
  if (canvasPoints.length > 1) {
    ctx.beginPath();
    canvasPoints.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    if (isClosedPolygon) {
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fill();
    }

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3 / transform.scale; // Línea más gruesa para mejor visibilidad
    ctx.setLineDash([8 / transform.scale, 4 / transform.scale]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Dibujar puntos
  ctx.fillStyle = '#3b82f6';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2 / transform.scale;
  
  canvasPoints.forEach((point, i) => {
    const radius = i === 0 ? 8 / transform.scale : 6 / transform.scale;
    
    // Círculo principal
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Punto central para el primer punto
    if (i === 0) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3 / transform.scale, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.fillStyle = '#3b82f6';
    }
  });

  ctx.restore();
};

/**
 * Dibuja indicadores de snap/magnetismo
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Object} snapPoint - Punto de snap
 * @param {Object} transform - Transform actual
 */
export const drawSnapIndicators = (ctx, snapPoint, transform) => {
  if (!snapPoint) return;

  ctx.save();
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);

  const { x, y, type } = snapPoint;
  const radius = 8 / transform.scale;

  // Indicador según el tipo
  ctx.strokeStyle = type === 'grid' ? '#10b981' : '#f59e0b';
  ctx.lineWidth = 2 / transform.scale;
  ctx.setLineDash([2 / transform.scale, 2 / transform.scale]);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Cruz central
  const crossSize = 4 / transform.scale;
  ctx.beginPath();
  ctx.moveTo(x - crossSize, y);
  ctx.lineTo(x + crossSize, y);
  ctx.moveTo(x, y - crossSize);
  ctx.lineTo(x, y + crossSize);
  ctx.stroke();

  ctx.restore();
};

/**
 * Dibuja información de herramienta activa
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {string} toolType - Tipo de herramienta activa
 * @param {Object} mousePos - Posición del mouse en coordenadas del canvas
 * @param {Object} transform - Transform actual
 */
export const drawToolCursor = (ctx, toolType, mousePos, transform) => {
  if (!mousePos) return;

  ctx.save();
  
  // Aplicar transformaciones para que el cursor se mantenga en la posición correcta
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);
  
  // Convertir mousePos a coordenadas del mundo
  const worldX = (mousePos.x - transform.translateX) / transform.scale;
  const worldY = (mousePos.y - transform.translateY) / transform.scale;
  
  ctx.lineWidth = 2 / transform.scale; // Ajustar grosor según zoom
  ctx.setLineDash([4 / transform.scale, 4 / transform.scale]); // Ajustar patrón según zoom

  switch (toolType) {
    case 'delete_vertex':
      // Símbolo de borrador para eliminar
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      
      const eraserSize = 12 / transform.scale;
      
      // Círculo base del borrador
      ctx.beginPath();
      ctx.arc(worldX, worldY, eraserSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Banda metálica del borrador
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1 / transform.scale;
      ctx.beginPath();
      ctx.arc(worldX, worldY, eraserSize * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      
      // Líneas del borrador
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const innerRadius = eraserSize * 0.4;
        const outerRadius = eraserSize * 0.9;
        ctx.beginPath();
        ctx.moveTo(
          worldX + Math.cos(angle) * innerRadius,
          worldY + Math.sin(angle) * innerRadius
        );
        ctx.lineTo(
          worldX + Math.cos(angle) * outerRadius,
          worldY + Math.sin(angle) * outerRadius
        );
        ctx.stroke();
      }
      break;
      
    case 'add_vertex':
      // Plus verde para agregar
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      
      const addSize = 10 / transform.scale;
      
      // Círculo de fondo
      ctx.beginPath();
      ctx.arc(worldX, worldY, addSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Cruz plus
      ctx.lineWidth = 3 / transform.scale;
      ctx.beginPath();
      ctx.moveTo(worldX - addSize * 0.6, worldY);
      ctx.lineTo(worldX + addSize * 0.6, worldY);
      ctx.moveTo(worldX, worldY - addSize * 0.6);
      ctx.lineTo(worldX, worldY + addSize * 0.6);
      ctx.stroke();
      break;
      
    case 'draw_line':
    case 'draw_polygon':
      // Círculo azul con cruz para dibujar
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      
      const drawSize = 10 / transform.scale;
      
      // Círculo base
      ctx.beginPath();
      ctx.arc(worldX, worldY, drawSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Cruz en el centro
      ctx.lineWidth = 2 / transform.scale;
      const crossSize = drawSize * 0.5;
      ctx.beginPath();
      ctx.moveTo(worldX - crossSize, worldY);
      ctx.lineTo(worldX + crossSize, worldY);
      ctx.moveTo(worldX, worldY - crossSize);
      ctx.lineTo(worldX, worldY + crossSize);
      ctx.stroke();
      break;
      
    case 'connect_points':
      // Icono de conexión
      ctx.strokeStyle = '#8b5cf6';
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      
      const connectSize = 10 / transform.scale;
      
      // Círculo base
      ctx.beginPath();
      ctx.arc(worldX, worldY, connectSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Líneas de conexión
      ctx.lineWidth = 2 / transform.scale;
      const lineLength = connectSize * 0.7;
      ctx.beginPath();
      // Línea diagonal
      ctx.moveTo(worldX - lineLength, worldY - lineLength);
      ctx.lineTo(worldX + lineLength, worldY + lineLength);
      // Puntos en los extremos
      ctx.arc(worldX - lineLength, worldY - lineLength, 2 / transform.scale, 0, Math.PI * 2);
      ctx.moveTo(worldX + lineLength + 2 / transform.scale, worldY + lineLength);
      ctx.arc(worldX + lineLength, worldY + lineLength, 2 / transform.scale, 0, Math.PI * 2);
      ctx.stroke();
      break;
      
    default:
      // No cursor especial para otros tipos de herramienta
      break;
  }

  ctx.restore();
};

/**
 * Calcula el área de un polígono usando el algoritmo de Shoelace
 * @param {Array} vertices - Array de vértices [[x, y], ...]
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
 * Limpia completamente el canvas
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 */
export const clearCanvas = (ctx) => {
  ctx.resetTransform();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

/**
 * Genera un color único para cada sublote basado en su índice
 * @param {number} index - Índice del sublote
 * @param {number} total - Total de sublotes (opcional, para mejor distribución)
 * @returns {string} - Color en formato CSS
 */
export const generateUniqueSubplotColor = (index, total = 10) => {
  // Paleta de colores vibrantes y distinguibles para sublotes
  const baseColors = [
    'rgba(255, 99, 71, 0.6)',   // Tomato
    'rgba(54, 162, 235, 0.6)',  // Blue
    'rgba(255, 206, 86, 0.6)',  // Yellow
    'rgba(75, 192, 192, 0.6)',  // Teal
    'rgba(153, 102, 255, 0.6)', // Purple
    'rgba(255, 159, 64, 0.6)',  // Orange
    'rgba(199, 199, 199, 0.6)', // Grey
    'rgba(83, 102, 255, 0.6)',  // Indigo
    'rgba(255, 99, 255, 0.6)',  // Magenta
    'rgba(50, 205, 50, 0.6)',   // Lime Green
    'rgba(255, 20, 147, 0.6)',  // Deep Pink
    'rgba(0, 191, 255, 0.6)',   // Deep Sky Blue
    'rgba(255, 140, 0, 0.6)',   // Dark Orange
    'rgba(148, 0, 211, 0.6)',   // Dark Violet
    'rgba(220, 20, 60, 0.6)',   // Crimson
  ];

  // Si el índice está dentro de la paleta base, usar color directo
  if (index < baseColors.length) {
    return baseColors[index];
  }

  // Para índices mayores, generar colores proceduralmente
  const hue = (index * 137.508) % 360; // Número áureo para buena distribución
  const saturation = 70 + (index * 13) % 30; // Variación en saturación
  const lightness = 50 + (index * 7) % 20;   // Variación en luminosidad
  
  return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`;
};

/**
 * Genera un color de borde más oscuro basado en el color de relleno del sublote
 * @param {string} fillColor - Color de relleno en formato CSS
 * @returns {string} - Color de borde más oscuro
 */
export const generateSubplotBorderColor = (fillColor) => {
  // Extraer valores HSL del color de relleno y hacer el borde más oscuro
  if (fillColor.includes('hsla')) {
    return fillColor.replace(/(\d+)%\)/, (match, lightness) => {
      const newLightness = Math.max(20, parseInt(lightness) - 30);
      return `${newLightness}%)`;
    }).replace('0.6)', '0.8)'); // Mayor opacidad para el borde
  }
  
  // Fallback para colores rgba
  if (fillColor.includes('rgba')) {
    // Convertir a una versión más oscura reduciendo los valores RGB
    return fillColor.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, (match, r, g, b) => {
      const darkR = Math.max(0, parseInt(r) - 60);
      const darkG = Math.max(0, parseInt(g) - 60);
      const darkB = Math.max(0, parseInt(b) - 60);
      return `rgba(${darkR}, ${darkG}, ${darkB}, 0.8)`;
    });
  }
  
  // Fallback por defecto
  return 'rgba(100, 100, 100, 0.8)';
};
