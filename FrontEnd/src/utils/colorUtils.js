/**
 * Utilidades para gestión automática de colores de sublotes
 * Implementa algoritmos para evitar colores similares y asignación inteligente
 */

// Paleta de colores profesional para sublotes
export const DEFAULT_SUBLOT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#EC4899', // pink-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
  '#EAB308', // yellow-500
  '#DC2626', // red-600
  '#7C3AED', // violet-600
  '#059669', // emerald-600
  '#D97706', // amber-600
];

/**
 * Convierte un color hexadecimal a HSL
 * @param {string} hex - Color en formato hexadecimal (#RRGGBB)
 * @returns {Object} - Objeto con propiedades h, s, l
 */
export const hexToHsl = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

/**
 * Convierte HSL a hexadecimal
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} - Color en formato hexadecimal
 */
export const hslToHex = (h, s, l) => {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Calcula la distancia de color entre dos colores en espacio HSL
 * @param {string} color1 - Primer color (hex)
 * @param {string} color2 - Segundo color (hex)
 * @returns {number} - Distancia de color (0-100)
 */
export const calculateColorDistance = (color1, color2) => {
  const hsl1 = hexToHsl(color1);
  const hsl2 = hexToHsl(color2);

  // Calcular diferencias
  const hueDiff = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h));
  const satDiff = Math.abs(hsl1.s - hsl2.s);
  const lightDiff = Math.abs(hsl1.l - hsl2.l);

  // Peso mayor al hue para evitar colores similares
  const distance = Math.sqrt(
    (hueDiff / 180) * (hueDiff / 180) * 0.6 +
    (satDiff / 100) * (satDiff / 100) * 0.2 +
    (lightDiff / 100) * (lightDiff / 100) * 0.2
  );

  return distance * 100;
};

/**
 * Obtiene el próximo color disponible evitando similares
 * @param {Array} usedColors - Colores ya utilizados
 * @param {number} minDistance - Distancia mínima requerida (default: 25)
 * @returns {string} - Color hexadecimal disponible
 */
export const getNextAvailableColor = (usedColors = [], minDistance = 25) => {
  // Primero, intentar con la paleta predefinida
  for (const color of DEFAULT_SUBLOT_COLORS) {
    const isTooSimilar = usedColors.some(usedColor => 
      calculateColorDistance(color, usedColor) < minDistance
    );
    
    if (!isTooSimilar) {
      console.log(`🎨 Color seleccionado de paleta: ${color}`);
      return color;
    }
  }

  // Si no hay colores disponibles en la paleta, generar uno aleatorio
  console.log('🎨 Generando color aleatorio - paleta agotada');
  return generateRandomColor(usedColors, minDistance);
};

/**
 * Genera un color aleatorio evitando similares
 * @param {Array} usedColors - Colores ya utilizados
 * @param {number} minDistance - Distancia mínima requerida
 * @param {number} maxAttempts - Máximo número de intentos
 * @returns {string} - Color hexadecimal generado
 */
export const generateRandomColor = (usedColors = [], minDistance = 25, maxAttempts = 50) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generar color con buena saturación y luminosidad
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 40); // 60-100%
    const lightness = 40 + Math.floor(Math.random() * 30); // 40-70%
    
    const newColor = hslToHex(hue, saturation, lightness);
    
    // Verificar distancia con colores usados
    const isTooSimilar = usedColors.some(usedColor => 
      calculateColorDistance(newColor, usedColor) < minDistance
    );
    
    if (!isTooSimilar) {
      console.log(`🎨 Color aleatorio generado en intento ${attempt + 1}: ${newColor}`);
      return newColor;
    }
  }

  // Si no se pudo generar, usar un color básico
  console.warn('🎨 No se pudo generar color único, usando por defecto');
  return DEFAULT_SUBLOT_COLORS[0];
};

/**
 * Asigna colores a sublotes evitando adjacencias similares
 * @param {Array} sublots - Array de sublotes a colorear
 * @param {Function} getAdjacency - Función que determina si dos sublotes son adyacentes
 * @returns {Array} - Sublotes con colores asignados
 */
export const assignColorsToSublots = (sublots, getAdjacency = null) => {
  if (sublots.length === 0) return [];

  const coloredSublots = [];
  const usedColors = [];

  sublots.forEach((sublot, index) => {
    let availableColors = [...DEFAULT_SUBLOT_COLORS];
    
    if (getAdjacency && coloredSublots.length > 0) {
      // Filtrar colores de sublotes adyacentes
      const adjacentColors = coloredSublots
        .filter(colored => getAdjacency(sublot, colored))
        .map(colored => colored.color);
      
      availableColors = availableColors.filter(color => 
        !adjacentColors.some(adjacentColor => 
          calculateColorDistance(color, adjacentColor) < 30
        )
      );
    }

    // Seleccionar color
    let selectedColor;
    if (availableColors.length > 0) {
      selectedColor = availableColors[0];
    } else {
      selectedColor = generateRandomColor(usedColors, 20);
    }

    const coloredSublot = {
      ...sublot,
      color: selectedColor,
      id: sublot.id || `sublot-${index + 1}`
    };

    coloredSublots.push(coloredSublot);
    usedColors.push(selectedColor);
  });

  console.log(`🎨 Colores asignados a ${coloredSublots.length} sublotes`);
  return coloredSublots;
};

/**
 * Función auxiliar para determinar si dos sublotes son adyacentes geométricamente
 * @param {Object} sublot1 - Primer sublote
 * @param {Object} sublot2 - Segundo sublote
 * @param {number} tolerance - Tolerancia para determinar adyacencia (default: 50px)
 * @returns {boolean} - True si son adyacentes
 */
export const areSublotsAdjacent = (sublot1, sublot2, tolerance = 50) => {
  const vertices1 = sublot1.vertices || [];
  const vertices2 = sublot2.vertices || [];

  // Verificar si algún vértice de un sublote está cerca de algún vértice del otro
  for (const vertex1 of vertices1) {
    for (const vertex2 of vertices2) {
      const distance = Math.sqrt(
        Math.pow(vertex1[0] - vertex2[0], 2) + 
        Math.pow(vertex1[1] - vertex2[1], 2)
      );
      
      if (distance <= tolerance) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Valida que un color esté en formato hexadecimal válido
 * @param {string} color - Color a validar
 * @returns {boolean} - True si es válido
 */
export const isValidHexColor = (color) => {
  return /^#[0-9A-F]{6}$/i.test(color);
};

/**
 * Convierte cualquier color a hexadecimal válido
 * @param {string} color - Color en cualquier formato
 * @returns {string} - Color hexadecimal válido
 */
export const normalizeColor = (color) => {
  if (isValidHexColor(color)) {
    return color.toUpperCase();
  }

  // Si es HSL, convertir
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (hslMatch) {
    const [, h, s, l] = hslMatch.map(Number);
    return hslToHex(h, s, l);
  }

  // Si es RGB, convertir
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  // Si no se puede convertir, usar color por defecto
  console.warn('Color inválido, usando por defecto:', color);
  return DEFAULT_SUBLOT_COLORS[0];
};

export default {
  DEFAULT_SUBLOT_COLORS,
  hexToHsl,
  hslToHex,
  calculateColorDistance,
  getNextAvailableColor,
  generateRandomColor,
  assignColorsToSublots,
  areSublotsAdjacent,
  isValidHexColor,
  normalizeColor
};
