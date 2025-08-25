import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook personalizado para manejar funcionalidad de pan (movimiento) y zoom en canvas
 * Reutilizable para diferentes componentes que necesiten interacción con canvas
 */
function usePanZoom(canvasRef, containerRef, initialTransform = { scale: 1, translateX: 0, translateY: 0 }) {
  // Estado de transformación
  const [transform, setTransform] = useState(initialTransform);
  
  // Estado de arrastre para pan
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0
  });

  // Referencia para tracking de eventos
  const eventRef = useRef({
    isMouseDown: false,
    startTransform: null
  });

  // Handle wheel event for zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      try {
        const rect = canvas.getBoundingClientRect();
        
        // Obtener posición del mouse relativa al canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Validar posición del mouse
        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
          return; // Mouse fuera del canvas
        }
        
        // Punto del mundo antes del zoom
        const worldX = (mouseX - transform.translateX) / transform.scale;
        const worldY = (mouseY - transform.translateY) / transform.scale;
        
        // Aplicar zoom con validaciones
        const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
        const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.05), 8);
        
        // Solo aplicar si hay cambio significativo
        if (Math.abs(newScale - transform.scale) < 0.001) return;
        
        // Calcular nueva posición para mantener el punto del mouse fijo
        const newTranslateX = mouseX - worldX * newScale;
        const newTranslateY = mouseY - worldY * newScale;
        
        // Validar que los valores son finitos
        if (!isFinite(newScale) || !isFinite(newTranslateX) || !isFinite(newTranslateY)) {
          console.warn('Valores de transformación inválidos detectados');
          return;
        }
        
        setTransform({
          scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY
        });
      } catch (error) {
        console.error('Error en handleWheel:', error);
      }
    }
  }, [transform, canvasRef]);

  // Handle mouse down for pan start
  const handleMouseDown = useCallback((e) => {
    // Solo manejar click izquierdo para pan
    if (e.button !== 0) return;
    
    eventRef.current.isMouseDown = true;
    eventRef.current.startTransform = { ...transform };
    
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY
    };
    
    // Prevenir selección de texto durante el arrastre
    e.preventDefault();
  }, [transform]);

  // Handle mouse move for pan
  const handleMouseMove = useCallback((e) => {
    if (!dragStateRef.current.isDragging || !eventRef.current.isMouseDown) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - dragStateRef.current.lastX;
    const deltaY = e.clientY - dragStateRef.current.lastY;
    
    // Aplicar transformación inmediatamente para fluidez
    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      setTransform(prev => {
        // Calcular los nuevos valores de traslación
        const newTranslateX = prev.translateX + deltaX;
        const newTranslateY = prev.translateY + deltaY;
        
        // Obtener las dimensiones del canvas y la imagen
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return prev;
        
        const rect = canvas.getBoundingClientRect();
        const maxPan = Math.max(rect.width, rect.height) * 2;
        
        // Limitar la traslación
        return {
          ...prev,
          translateX: Math.max(-maxPan, Math.min(maxPan, newTranslateX)),
          translateY: Math.max(-maxPan, Math.min(maxPan, newTranslateY))
        };
      });
      
      dragStateRef.current.lastX = e.clientX;
      dragStateRef.current.lastY = e.clientY;
    }
  }, []);

  // Handle mouse up for pan end
  const handleMouseUp = useCallback((e) => {
    eventRef.current.isMouseDown = false;
    eventRef.current.startTransform = null;
    
    dragStateRef.current = {
      isDragging: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0
    };
  }, []);

  // Funciones de control programático
  const zoomIn = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    setTransform(prev => {
      const newScale = Math.min(prev.scale * 1.2, 8);
      
      // Calcular nueva posición para mantener el centro fijo
      const worldX = (centerX - prev.translateX) / prev.scale;
      const worldY = (centerY - prev.translateY) / prev.scale;
      
      const newTranslateX = centerX - worldX * newScale;
      const newTranslateY = centerY - worldY * newScale;
      
      return {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    setTransform(prev => {
      const newScale = Math.max(prev.scale * 0.8, 0.05);
      
      // Calcular nueva posición para mantener el centro fijo
      const worldX = (centerX - prev.translateX) / prev.scale;
      const worldY = (centerY - prev.translateY) / prev.scale;
      
      const newTranslateX = centerX - worldX * newScale;
      const newTranslateY = centerY - worldY * newScale;
      
      return {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY
      };
    });
  }, []);

  const resetTransform = useCallback(() => {
    setTransform(initialTransform);
  }, [initialTransform]);

  const fitToContainer = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Resetear a escala que ajuste al contenedor
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0
    });
  }, [canvasRef, containerRef]);

  // Setup event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Asegurar que el canvas está listo antes de agregar eventos
    const initializeEvents = () => {
      // Eventos de wheel
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      
      // Eventos de mouse
      canvas.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevenir context menu en click derecho
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    // Inicializar inmediatamente si el canvas está listo
    if (canvas.getBoundingClientRect().width > 0) {
      initializeEvents();
    } else {
      // Si no está listo, usar un pequeño timeout
      const timer = setTimeout(initializeEvents, 50);
      return () => {
        clearTimeout(timer);
        canvas.removeEventListener('wheel', handleWheel);
        canvas.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
      };
    }

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Solo procesar si no hay elementos input con foco
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          if (e.ctrlKey) {
            e.preventDefault();
            resetTransform();
          }
          break;
        case 'f':
          if (e.ctrlKey) {
            e.preventDefault();
            fitToContainer();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetTransform, fitToContainer]);

  return {
    // Estado
    transform,
    isDragging: dragStateRef.current.isDragging,
    
    // Controles
    zoomIn,
    zoomOut,
    resetTransform,
    fitToContainer,
    setTransform,
    
    // Handlers (para casos donde se necesiten personalizar)
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}

export default usePanZoom;
