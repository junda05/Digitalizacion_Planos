import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook personalizado para manejar el renderizado del canvas del plano 3D
 * Optimiza el rendimiento y maneja casos edge
 */
export const useCanvasRenderer = (plano, lotes, transform, uiStates, drawFunctions) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Función de renderizado optimizada
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || !drawFunctions) return;
    
    const ctx = canvas.getContext('2d');
    
    // Ajustar tamaño del canvas
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight - 80;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    ctx.scale(dpr, dpr);
    
    // Limpiar canvas
    const gradient = ctx.createLinearGradient(0, 0, displayWidth, displayHeight);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // Función para convertir coordenadas
    const imageToCanvas = (x, y) => ({
      x: (x * transform.scale) + transform.translateX,
      y: (y * transform.scale) + transform.translateY
    });
    
    try {
      // Dibujar bordes externos
      if (plano?.bordes_externos && Array.isArray(plano.bordes_externos)) {
        plano.bordes_externos.forEach(vector => {
          if (vector && Array.isArray(vector) && vector.length > 0) {
            drawFunctions.drawVector3D(ctx, vector, 'border', imageToCanvas);
          }
        });
      }
      
      // Dibujar sublotes
      if (plano?.sublotes && Array.isArray(plano.sublotes)) {
        plano.sublotes.forEach((vector, index) => {
          if (vector && Array.isArray(vector) && vector.length > 0) {
            const lote = lotes.find(l => l.vertices && 
              JSON.stringify(l.vertices) === JSON.stringify(vector)
            );
            
            drawFunctions.drawLote3D(ctx, vector, lote, index, {
              ...uiStates,
              imageToCanvas
            });
          }
        });
      }
      
      // Mensaje si no hay elementos
      if ((!plano?.bordes_externos || plano.bordes_externos.length === 0) && 
          (!plano?.sublotes || plano.sublotes.length === 0)) {
        drawFunctions.drawEmptyMessage(ctx, { width: displayWidth, height: displayHeight });
      }
    } catch (error) {
      console.error('Error en renderizado del canvas:', error);
    }
  }, [plano, lotes, transform, uiStates, drawFunctions]);
  
  // Renderizado con requestAnimationFrame para mejor performance
  const scheduleRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(render);
  }, [render]);
  
  // Effect para re-renderizar cuando cambien las dependencias
  useEffect(() => {
    scheduleRender();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleRender]);
  
  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return {
    canvasRef,
    containerRef,
    forceRender: scheduleRender
  };
};

export default useCanvasRenderer;
