import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Edit, Hash, DollarSign, Square, FileText, Save } from 'lucide-react';
import planosService from '../../services/api/PlanosService';
import lotesService from '../../services/api/LotesService';
import usePanZoom from '../../hooks/usePanZoom';
import ZoomControls from '../../components/ui/ZoomControls';

/**
 * Página de visualización 3D del plano digitalizado
 * Muestra únicamente el croquis digitalizado con efectos 3D interactivos
 * Los lotes se elevan al hacer hover y permiten edición de propiedades
 */
function PlanoDigitalPageNew() {
  const { planoId } = useParams();
  const navigate = useNavigate();
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  
  // Referencia para controlar rendering con requestAnimationFrame
  const renderingRef = useRef({
    frameId: null,
    needsRender: false
  });
  
  // Estados - declarados primero antes de usar en hooks
  const [plano, setPlano] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de visualización (sin transformaciones de pan/zoom)
  const [selectedLote, setSelectedLote] = useState(null);
  const [hoveredLote, setHoveredLote] = useState(null);
  const [elevatedLotes, setElevatedLotes] = useState(new Set());
  
  // Panel lateral para mostrar información del lote
  const [showLotePanel, setShowLotePanel] = useState(false);
  const [currentLote, setCurrentLote] = useState(null);
  const [formData, setFormData] = useState({
    numero: '',
    area: '',
    precio: '',
    estado: 'disponible',
    descripcion: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Configuración 3D
  const [viewConfig] = useState({
    showShadows: true,
    elevation: 10, // Altura base de elevación de lotes
    hoverElevation: 25, // Altura adicional al hacer hover
    animationSpeed: 0.5, // Aumentado para animaciones más suaves
    transitionDuration: 300 // Duración de la transición en ms
  });
  
  // Hook de pan y zoom con inicialización apropiada
  const { 
    transform, 
    isDragging, 
    zoomIn, 
    zoomOut, 
    resetTransform, 
    fitToContainer 
  } = usePanZoom(canvasRef, containerRef);

  const loadPlanoData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cargar plano primero
      const planoData = await planosService.obtenerPlano(planoId);
      setPlano(planoData);
      
      // Luego cargar lotes (opcional)
      try {
        const lotesData = await lotesService.obtenerLotesPorPlano(planoId);
        setLotes(lotesData || []);
      } catch (lotesError) {
        console.warn('No se pudieron cargar los lotes:', lotesError);
        setLotes([]); // Continuar sin lotes
      }
      
    } catch (err) {
      console.error('Error al cargar plano:', err);
      if (err.response?.status === 404) {
        setError('El plano solicitado no existe');
      } else if (err.response?.status === 500) {
        setError('Error del servidor. Intenta más tarde.');
      } else {
        setError('Error al cargar el plano digitalizado. Verifica tu conexión.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [planoId]);

  useEffect(() => {
    loadPlanoData();
  }, [planoId, loadPlanoData]);

  // Renderizar el canvas con transformaciones de pan y zoom
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || !plano) return;
    
    const ctx = canvas.getContext('2d');
    
    // Establecer tamaño del canvas
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Solo redimensionar si es necesario para evitar re-renders innecesarios
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    }
    
    // Limpiar canvas con fondo pastel suave
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width / dpr, canvas.height / dpr);
    gradient.addColorStop(0, '#fefbff'); // Lavender mist
    gradient.addColorStop(0.5, '#f0f4ff'); // Light periwinkle
    gradient.addColorStop(1, '#e8f2ff'); // Alice blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Aplicar transformaciones de pan y zoom
    ctx.save();
    ctx.setTransform(
      transform.scale * dpr, 
      0, 
      0, 
      transform.scale * dpr, 
      transform.translateX * dpr, 
      transform.translateY * dpr
    );
    
    // Función para convertir coordenadas de imagen a canvas considerando transformaciones
    const imageToCanvas = (x, y) => ({
      x: x,
      y: y
    });

    // NO dibujar la imagen original - solo mostrar el croquis digitalizado
    
    // Dibujar bordes externos del plano
    if (plano.bordes_externos && Array.isArray(plano.bordes_externos)) {
      plano.bordes_externos.forEach(vector => {
        if (vector && Array.isArray(vector) && vector.length > 0) {
          drawVector3D(ctx, vector, 'border', imageToCanvas);
        }
      });
    }
    
    // Dibujar sublotes con efecto 3D
    if (plano.sublotes && Array.isArray(plano.sublotes)) {
      // Primero dibujar todos los sublotes no seleccionados/no hovereados
      plano.sublotes.forEach((vector, index) => {
        if (vector && Array.isArray(vector) && vector.length > 0) {
          const lote = lotes.find(l => l.vertices && 
            JSON.stringify(l.vertices) === JSON.stringify(vector)
          );
          
          const isHovered = hoveredLote === index;
          const isSelected = selectedLote === index;
          const isElevated = elevatedLotes.has(index);
          
          // Solo dibujar si no está seleccionado ni hovereado (para layering correcto)
          if (!isSelected && !isHovered) {
            drawLote3D(ctx, vector, lote, index, {
              isHovered,
              isSelected,
              isElevated,
              imageToCanvas
            });
          }
        }
      });
      
      // Luego dibujar lotes hovereados (encima de los normales)
      plano.sublotes.forEach((vector, index) => {
        if (vector && Array.isArray(vector) && vector.length > 0) {
          const lote = lotes.find(l => l.vertices && 
            JSON.stringify(l.vertices) === JSON.stringify(vector)
          );
          
          const isHovered = hoveredLote === index;
          const isSelected = selectedLote === index;
          const isElevated = elevatedLotes.has(index);
          
          // Solo dibujar si está hovereado pero no seleccionado
          if (isHovered && !isSelected) {
            drawLote3D(ctx, vector, lote, index, {
              isHovered,
              isSelected,
              isElevated,
              imageToCanvas
            });
          }
        }
      });
      
      // Finalmente dibujar lote seleccionado (encima de todos)
      plano.sublotes.forEach((vector, index) => {
        if (vector && Array.isArray(vector) && vector.length > 0) {
          const lote = lotes.find(l => l.vertices && 
            JSON.stringify(l.vertices) === JSON.stringify(vector)
          );
          
          const isHovered = hoveredLote === index;
          const isSelected = selectedLote === index;
          const isElevated = elevatedLotes.has(index);
          
          // Solo dibujar si está seleccionado
          if (isSelected) {
            drawLote3D(ctx, vector, lote, index, {
              isHovered,
              isSelected,
              isElevated,
              imageToCanvas
            });
          }
        }
      });
    }
    
    ctx.restore();
    ctx.restore();
    
    // Dibujar mensaje si no hay elementos digitalizados (sin transformaciones)
    if ((!plano.bordes_externos || plano.bordes_externos.length === 0) && 
        (!plano.sublotes || plano.sublotes.length === 0)) {
      drawEmptyMessage(ctx, { width: canvas.width / dpr, height: canvas.height / dpr });
    }
  }, [plano, lotes, selectedLote, hoveredLote, elevatedLotes, viewConfig, transform]);

  // Función de renderizado optimizada con requestAnimationFrame
  const scheduleRender = useCallback(() => {
    if (renderingRef.current.frameId) {
      return; // Ya hay un frame pendiente
    }
    
    renderingRef.current.frameId = requestAnimationFrame(() => {
      if (plano && canvasRef.current) {
        renderCanvas();
      }
      renderingRef.current.frameId = null;
    });
  }, [renderCanvas, plano]);

  // Forzar inicialización del canvas y eventos después de cargar el plano
  useEffect(() => {
    if (!plano || !canvasRef.current || !containerRef.current) return;
    
    // Asegurar que el canvas sea interactivo inmediatamente
    const canvas = canvasRef.current;
    canvas.setAttribute('tabindex', '0');
    canvas.style.outline = 'none';
    canvas.focus();
    canvas.style.pointerEvents = 'auto';
    
    // Renderizar el canvas una vez y ajustar la vista (solo en carga inicial)
    renderCanvas();
    
    // Usar un timeout para evitar problemas de timing con el DOM
    const timer = setTimeout(() => {
      // Ajustar la vista para que todo el contenido sea visible
      fitToContainer();
      // Programar otro render para asegurar que todo esté actualizado
      scheduleRender();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [plano]); // Solo dependencia plano para evitar ciclos infinitos

  // Reemplazar el useEffect que renderiza cuando cambian los datos
  useEffect(() => {
    if (plano && canvasRef.current) {
      scheduleRender();
    }
  }, [
    plano, 
    lotes, 
    selectedLote, 
    hoveredLote, 
    elevatedLotes, 
    transform.scale,
    transform.translateX,
    transform.translateY,
    scheduleRender
  ]); // Desglosar transform para evitar problemas con referencias

  // Dibujar mensaje cuando no hay elementos digitalizados
  const drawEmptyMessage = (ctx, canvas) => {
    ctx.save();
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Fondo del mensaje
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    
    const boxWidth = 400;
    const boxHeight = 120;
    
    ctx.fillRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);
    ctx.strokeRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);
    
    // Título
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Plano sin digitalizar', centerX, centerY - 20);
    
    // Descripción
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Este plano aún no tiene elementos digitalizados', centerX, centerY + 10);
    ctx.fillText('Usa la página de edición para digitalizar bordes y lotes', centerX, centerY + 30);
    
    ctx.restore();
  };

  // Dibujar vector con efecto 3D - colores pasteles
  const drawVector3D = (ctx, vector, type, imageToCanvas) => {
    if (!vector || vector.length < 3) return;
    
    ctx.save();
    
    // Sombra suave para efecto 3D
    if (viewConfig.showShadows) {
      ctx.shadowColor = 'rgba(139, 69, 19, 0.15)'; // Soft brown shadow
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }
    
    ctx.beginPath();
    vector.forEach((point, i) => {
      const canvasPoint = imageToCanvas(point[0], point[1]);
      if (i === 0) {
        ctx.moveTo(canvasPoint.x, canvasPoint.y);
      } else {
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      }
    });
    ctx.closePath();
    
    if (type === 'border') {
      ctx.strokeStyle = '#7c3aed'; // Soft purple
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // Dibujar lote con efecto 3D y elevación - colores pasteles
  const drawLote3D = (ctx, vector, lote, index, options) => {
    const { isHovered, isSelected, isElevated, imageToCanvas } = options;
    
    if (!vector || vector.length < 3) return;
    
    // Calcular elevación con interpolación suave para transiciones
    const targetElevation = isSelected ? 
      viewConfig.elevation + viewConfig.hoverElevation : 
      (isHovered || isElevated) ? viewConfig.elevation : 0;
    
    // Aplicar elevación con transición suave
    let elevation = targetElevation;
    
    // Colores pasteles basados en el estado del lote con mayor opacidad para mejor visibilidad
    let fillColor, strokeColor, shadowColor;
    if (lote && lote.estado) {
      switch (lote.estado) {
        case 'disponible':
          fillColor = isSelected ? 'rgba(134, 239, 172, 0.95)' : isHovered ? 'rgba(134, 239, 172, 0.9)' : 'rgba(187, 247, 208, 0.8)';
          strokeColor = '#059669'; // Emerald
          shadowColor = 'rgba(5, 150, 105, 0.4)'; // Más opaco para sombras más definidas
          break;
        case 'reservado':
          fillColor = isSelected ? 'rgba(253, 230, 138, 0.95)' : isHovered ? 'rgba(253, 230, 138, 0.9)' : 'rgba(254, 240, 138, 0.8)';
          strokeColor = '#d97706'; // Amber
          shadowColor = 'rgba(217, 119, 6, 0.4)';
          break;
        case 'vendido':
          fillColor = isSelected ? 'rgba(252, 165, 165, 0.95)' : isHovered ? 'rgba(252, 165, 165, 0.9)' : 'rgba(254, 202, 202, 0.8)';
          strokeColor = '#dc2626'; // Red
          shadowColor = 'rgba(220, 38, 38, 0.4)';
          break;
        default:
          // Colores pasteles por defecto con mayor saturación
          const pastelHues = [
            { fill: 'rgba(196, 181, 253, 0.8)', stroke: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.4)' }, // Violet
            { fill: 'rgba(165, 243, 252, 0.8)', stroke: '#06b6d4', shadow: 'rgba(6, 182, 212, 0.4)' }, // Cyan
            { fill: 'rgba(254, 205, 211, 0.8)', stroke: '#ec4899', shadow: 'rgba(236, 72, 153, 0.4)' }, // Pink
            { fill: 'rgba(196, 253, 186, 0.8)', stroke: '#22c55e', shadow: 'rgba(34, 197, 94, 0.4)' }, // Green
            { fill: 'rgba(255, 237, 213, 0.8)', stroke: '#f97316', shadow: 'rgba(249, 115, 22, 0.4)' }, // Orange
          ];
          const colorIndex = index % pastelHues.length;
          const colors = pastelHues[colorIndex];
          fillColor = isSelected ? colors.fill.replace('0.8', '0.95') : isHovered ? colors.fill.replace('0.8', '0.9') : colors.fill;
          strokeColor = colors.stroke;
          shadowColor = colors.shadow;
      }
    } else {
      // Colores pasteles por defecto para lotes sin estado
      const pastelHues = [
        { fill: 'rgba(196, 181, 253, 0.8)', stroke: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.4)' },
        { fill: 'rgba(165, 243, 252, 0.8)', stroke: '#06b6d4', shadow: 'rgba(6, 182, 212, 0.4)' },
        { fill: 'rgba(254, 205, 211, 0.8)', stroke: '#ec4899', shadow: 'rgba(236, 72, 153, 0.4)' },
        { fill: 'rgba(196, 253, 186, 0.8)', stroke: '#22c55e', shadow: 'rgba(34, 197, 94, 0.4)' },
        { fill: 'rgba(255, 237, 213, 0.8)', stroke: '#f97316', shadow: 'rgba(249, 115, 22, 0.4)' },
      ];
      const colorIndex = index % pastelHues.length;
      const colors = pastelHues[colorIndex];
      fillColor = isSelected ? colors.fill.replace('0.8', '0.95') : isHovered ? colors.fill.replace('0.8', '0.9') : colors.fill;
      strokeColor = colors.stroke;
      shadowColor = colors.shadow;
    }
    
    let strokeWidth = 2;
    if (isSelected) {
      strokeWidth = 5;
    } else if (isHovered) {
      strokeWidth = 3;
    }
    
    ctx.save();
    
    // Efecto de elevación - dibujar sombra primero con colores pasteles
    if (elevation > 0 && viewConfig.showShadows) {
      ctx.save();
      ctx.translate(elevation * 0.4, elevation * 0.4);
      ctx.globalAlpha = 0.25;
      
      ctx.beginPath();
      vector.forEach((point, i) => {
        const canvasPoint = imageToCanvas(point[0], point[1]);
        if (i === 0) {
          ctx.moveTo(canvasPoint.x, canvasPoint.y);
        } else {
          ctx.lineTo(canvasPoint.x, canvasPoint.y);
        }
      });
      ctx.closePath();
      
      ctx.fillStyle = shadowColor;
      ctx.fill();
      ctx.restore();
    }
    
    // Dibujar el lote principal con elevación
    ctx.translate(-elevation * 0.3, -elevation * 0.3);
    
    ctx.beginPath();
    vector.forEach((point, i) => {
      const canvasPoint = imageToCanvas(point[0], point[1]);
      if (i === 0) {
        ctx.moveTo(canvasPoint.x, canvasPoint.y);
      } else {
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      }
    });
    ctx.closePath();
    
    // Gradiente uniforme para efecto 3D suave - sin círculo central
    const centerX = vector.reduce((sum, p) => sum + p[0], 0) / vector.length;
    const centerY = vector.reduce((sum, p) => sum + p[1], 0) / vector.length;
    const center = imageToCanvas(centerX, centerY);
    
    // Crear gradiente lineal más suave en lugar de radial
    const gradient = ctx.createLinearGradient(
      center.x - 30, center.y - 30,
      center.x + 30, center.y + 30
    );
    
    // Usar el color base consistente sin variaciones drásticas
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(0.5, fillColor);
    gradient.addColorStop(1, fillColor.replace(/rgba?\(([^)]+)\)/, (match, inner) => {
      // Hacer el borde ligeramente más oscuro manteniendo consistencia
      const values = inner.split(',').map(v => v.trim());
      if (values.length >= 3) {
        const r = Math.max(0, parseInt(values[0]) - 15);
        const g = Math.max(0, parseInt(values[1]) - 15);
        const b = Math.max(0, parseInt(values[2]) - 15);
        const a = values[3] || '1';
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      return fillColor;
    }));
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Sombra interior para profundidad
    if (elevation > 0) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    ctx.fill();
    ctx.stroke();
    
    // Etiqueta del lote con estilo mejorado
    if (lote || isHovered || isSelected) {
      const text = lote?.numero || `L${index + 1}`;
      const fontSize = 15 + (elevation * 0.15);
      
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Fondo de la etiqueta con colores pasteles
      const metrics = ctx.measureText(text);
      const padding = 10;
      
      // Gradiente para el fondo de la etiqueta
      const labelGradient = ctx.createLinearGradient(
        center.x - metrics.width/2 - padding,
        center.y - fontSize/2 - padding,
        center.x + metrics.width/2 + padding,
        center.y + fontSize/2 + padding
      );
      labelGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      labelGradient.addColorStop(1, 'rgba(248, 250, 252, 0.95)');
      
      ctx.fillStyle = labelGradient;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      
      // Bordes redondeados para la etiqueta
      const labelX = center.x - metrics.width/2 - padding;
      const labelY = center.y - fontSize/2 - padding;
      const labelWidth = metrics.width + padding * 2;
      const labelHeight = fontSize + padding * 2;
      const radius = 8;
      
      ctx.beginPath();
      ctx.moveTo(labelX + radius, labelY);
      ctx.lineTo(labelX + labelWidth - radius, labelY);
      ctx.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + radius);
      ctx.lineTo(labelX + labelWidth, labelY + labelHeight - radius);
      ctx.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - radius, labelY + labelHeight);
      ctx.lineTo(labelX + radius, labelY + labelHeight);
      ctx.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - radius);
      ctx.lineTo(labelX, labelY + radius);
      ctx.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();
      
      // Texto de la etiqueta
      ctx.fillStyle = strokeColor;
      ctx.fillText(text, center.x, center.y);
    }
    
    ctx.restore();
  };

  // Función para convertir coordenadas del mouse a coordenadas del mundo
  const screenToWorld = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    // Aplicar transformaciones inversas
    const worldX = (canvasX - transform.translateX) / transform.scale;
    const worldY = (canvasY - transform.translateY) / transform.scale;
    
    return { x: worldX, y: worldY };
  }, [transform]);

  // Detectar hover en sublotes (con transformaciones)
  const handleCanvasMouseMove = (e) => {
    if (!plano?.sublotes) return;
    
    const worldCoord = screenToWorld(e.clientX, e.clientY);
    
    let found = null;
    for (let i = 0; i < plano.sublotes.length; i++) {
      const vector = plano.sublotes[i];
      if (isPointInPolygon([worldCoord.x, worldCoord.y], vector)) {
        found = i;
        break;
      }
    }
    
    if (found !== hoveredLote) {
      // Si cambiamos de lote hovereado, remover el anterior de elevatedLotes
      // excepto si está seleccionado (para mantener la selección elevada)
      if (hoveredLote !== null && hoveredLote !== selectedLote) {
        setElevatedLotes(prev => {
          const newSet = new Set([...prev]);
          newSet.delete(hoveredLote);
          return newSet;
        });
      }
      
      setHoveredLote(found);
      
      // Actualizar lotes elevados - solo agregar el nuevo
      if (found !== null) {
        setElevatedLotes(prev => new Set([...prev, found]));
        
        // Programar una re-renderización para animar suavemente
        requestAnimationFrame(scheduleRender);
      }
      
      scheduleRender();
    }
  };

  // Función para limpiar hover cuando el mouse sale del canvas
  const handleCanvasMouseLeave = useCallback(() => {
    if (hoveredLote !== null) {
      // Al salir del canvas, remover el lote hovereado de elevatedLotes
      // pero solo si no está seleccionado
      if (hoveredLote !== selectedLote) {
        setElevatedLotes(prev => {
          const newSet = new Set([...prev]);
          newSet.delete(hoveredLote);
          return newSet;
        });
      }
      
      setHoveredLote(null);
      scheduleRender();
    }
  }, [hoveredLote, selectedLote, scheduleRender]);

  // Detectar clic para mostrar panel de propiedades (con transformaciones)
  const handleCanvasClick = (e) => {
    // No manejar clics si se está arrastrando para hacer pan
    if (isDragging) return;
    
    if (!plano?.sublotes) return;
    
    const worldCoord = screenToWorld(e.clientX, e.clientY);
    
    for (let i = 0; i < plano.sublotes.length; i++) {
      const vector = plano.sublotes[i];
      if (isPointInPolygon([worldCoord.x, worldCoord.y], vector)) {
        setSelectedLote(i);
        
        // Agregar inmediatamente a lotes elevados para que se eleve con un solo clic
        setElevatedLotes(prev => new Set([...prev, i]));
        
        // Encontrar o crear lote
        let lote = lotes.find(l => l.vertices && 
          JSON.stringify(l.vertices) === JSON.stringify(vector)
        );
        
        if (!lote) {
          // Generar número de lote basado en el índice + 1
          lote = {
            id: null,
            numero: `L${i + 1}`,
            area: '',
            precio: '',
            estado: 'disponible',
            descripcion: '',
            plano: planoId,
            vertices: vector
          };
        }
        
        setCurrentLote(lote);
        setFormData({
          numero: lote.numero || `L${i + 1}`,
          area: lote.area || '',
          precio: lote.precio || '',
          estado: lote.estado || 'disponible',
          descripcion: lote.descripcion || ''
        });
        setShowLotePanel(true);
        
        // Iniciar animación suave con requestAnimationFrame
        requestAnimationFrame(scheduleRender);
        return;
      }
    }
    
    setSelectedLote(null);
    setShowLotePanel(false);
    scheduleRender();
  };

  // Función para detectar punto en polígono
  const isPointInPolygon = (point, polygon) => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.numero.trim()) {
      newErrors.numero = 'El número del lote es requerido';
    }

    if (formData.area && isNaN(parseFloat(formData.area))) {
      newErrors.area = 'El área debe ser un número válido';
    }

    if (formData.precio && isNaN(parseFloat(formData.precio))) {
      newErrors.precio = 'El precio debe ser un número válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Guardar cambios de lote
  const handleSaveLote = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const loteData = {
        ...currentLote,
        ...formData,
        area: formData.area ? parseFloat(formData.area) : null,
        precio: formData.precio ? parseFloat(formData.precio) : null
      };

      if (loteData.id) {
        // Actualizar lote existente
        await lotesService.actualizarLote(loteData.id, loteData);
      } else {
        // Crear nuevo lote
        await lotesService.crearLote(loteData);
      }
      
      // Recargar solo los datos necesarios sin resetear el zoom
      try {
        const lotesData = await lotesService.obtenerLotesPorPlano(planoId);
        setLotes(lotesData || []);
      } catch (error) {
        console.warn('No se pudieron recargar los lotes:', error);
      }
      
      // Cerrar panel y limpiar selección
      setShowLotePanel(false);
      setCurrentLote(null);
      setSelectedLote(null);
      
      // Programar un render sin actualizar el transform
      requestAnimationFrame(scheduleRender);
      
    } catch (error) {
      console.error('Error al guardar lote:', error);
      setErrors({ general: 'Error al guardar. Intenta nuevamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Redimensionar cuando cambie el contenedor
  useEffect(() => {
    const handleResize = () => {
      if (plano) {
        scheduleRender();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [plano, scheduleRender]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-900">Cargando plano digitalizado...</div>
          <div className="text-gray-600">Preparando vista 3D interactiva</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <Settings className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error de Carga</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/planos')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver a Planos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/planos')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {plano?.nombre || 'Plano Digitalizado'}
              </h1>
              <p className="text-sm text-gray-600">
                Vista de lotes digitalizados • {plano?.sublotes?.length || 0} lotes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          // Añadir estos atributos para mejorar la captura de eventos
          tabIndex="-1"
          onFocus={() => {
            if (canvasRef.current) canvasRef.current.focus();
          }}
        >
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            tabIndex="0"  // Hacer el canvas focusable
          />
          
          {/* Controles de Zoom */}
          <ZoomControls
            onZoomIn={() => {
              zoomIn();
              if (canvasRef.current) canvasRef.current.focus();
            }}
            onZoomOut={() => {
              zoomOut();
              if (canvasRef.current) canvasRef.current.focus();
            }}
            onResetView={() => {
              resetTransform();
              setTimeout(() => {
                fitToContainer();
                if (canvasRef.current) canvasRef.current.focus();
              }, 50);
            }}
            className="absolute top-4 left-4"
          />
          
          {/* Instrucciones flotantes */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Clic:</strong> Seleccionar lote para editar</div>
              <div><strong>Hover:</strong> Ver información del lote</div>
              <div><strong>Arrastrar:</strong> Mover vista del plano</div>
              <div><strong>Ctrl + Scroll:</strong> Zoom in/out</div>
            </div>
          </div>
          
          {/* Información del lote en hover */}
          {hoveredLote !== null && plano?.sublotes && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">
                Lote {lotes.find(l => l.vertices && 
                  JSON.stringify(l.vertices) === JSON.stringify(plano.sublotes[hoveredLote])
                )?.numero || `L${hoveredLote + 1}`}
              </h3>
              <p className="text-sm text-gray-600">
                Clic para editar propiedades
              </p>
            </div>
          )}
          
          {/* Botón para ir a editar cuando no hay elementos */}
          {plano && (!plano.bordes_externos || plano.bordes_externos.length === 0) && 
           (!plano.sublotes || plano.sublotes.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-lg p-8 shadow-xl border pointer-events-auto max-w-md">
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <Settings className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Plano sin digitalizar
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Este plano aún no tiene elementos digitalizados. Ve a la página de edición para digitalizar bordes y lotes.
                  </p>
                  <button
                    onClick={() => navigate(`/planos/editar/${planoId}`)}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Ir a Editar Plano</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel lateral de propiedades del lote */}
        {showLotePanel && currentLote && (
          <LotePropertiesPanel
            lote={currentLote}
            formData={formData}
            errors={errors}
            isSaving={isSaving}
            onFormChange={handleFormChange}
            onSave={handleSaveLote}
            onClose={() => {
              setShowLotePanel(false);
              setCurrentLote(null);
              setSelectedLote(null);
              setErrors({});
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Panel lateral para editar propiedades de lotes
 */
function LotePropertiesPanel({ lote, formData, errors, isSaving, onFormChange, onSave, onClose }) {
  // Opciones de estado
  const estadoOptions = [
    { value: 'disponible', label: 'Disponible', color: 'bg-green-100 text-green-800' },
    { value: 'reservado', label: 'Reservado', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'vendido', label: 'Vendido', color: 'bg-red-100 text-red-800' }
  ];

  return (
    <div className="w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col">
      {/* Header del panel */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {/* icono de editar lote */}
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lote?.id ? 'Editar Lote' : 'Nuevo Lote'}
              </h2>
              <p className="text-sm text-gray-600">
                Propiedades del lote seleccionado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colores"
          >
            ×
          </button>
        </div>
      </div>

      {/* Contenido del panel */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Error general */}
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Número del lote */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {/* icono numeral */}
            <Hash className="w-4 h-4 inline mr-1" />
            Número del Lote *
          </label>
          <input
            type="text"
            value={formData.numero}
            onChange={(e) => onFormChange('numero', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.numero ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ej: L001, A-1, Lote 1"
          />
          {errors.numero && (
            <p className="mt-1 text-sm text-red-600">{errors.numero}</p>
          )}
        </div>

        {/* Área - Campo deshabilitado con nota */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Square className="w-4 h-4 inline mr-1" />
            Área (m²)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.area}
            onChange={(e) => onFormChange('area', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.area ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ingresa el área real del lote"
          />
          <p className="mt-1 text-xs text-gray-500">
            El área debe ser ingresada manualmente para describir el lote real
          </p>
          {errors.area && (
            <p className="mt-1 text-sm text-red-600">{errors.area}</p>
          )}
        </div>

        {/* Precio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Precio
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.precio}
            onChange={(e) => onFormChange('precio', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.precio ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ej: 250000.00"
          />
          {errors.precio && (
            <p className="mt-1 text-sm text-red-600">{errors.precio}</p>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado del Lote
          </label>
          <div className="space-y-2">
            {estadoOptions.map((estado) => (
              <button
                key={estado.value}
                onClick={() => onFormChange('estado', estado.value)}
                className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                  formData.estado === estado.value
                    ? `${estado.color} border-current`
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {estado.label}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-1" />
            Descripción
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => onFormChange('descripcion', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Descripción adicional del lote..."
          />
        </div>
      </div>

      {/* Footer del panel */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlanoDigitalPageNew;
