import { useCallback } from 'react';

/**
 * Hook personalizado para manejar todas las transformaciones de coordenadas del canvas
 * Centraliza la lógica de conversión entre diferentes sistemas de coordenadas
 */
function useCanvasCoordinates(transform, imageDimensions, canvasRef, containerRef) {
  
  // Convierte coordenadas de pantalla (mouse) a coordenadas del canvas sin transformaciones
  const screenToCanvas = useCallback((clientX, clientY) => {
    if (!canvasRef.current || !containerRef.current) {
      return { x: 0, y: 0 };
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    return { x, y };
  }, [canvasRef, containerRef]);

  // Convierte coordenadas del canvas a coordenadas del mundo (aplicando transformaciones inversas)
  const canvasToWorld = useCallback((canvasX, canvasY) => {
    const worldX = (canvasX - transform.translateX) / transform.scale;
    const worldY = (canvasY - transform.translateY) / transform.scale;
    
    return { x: worldX, y: worldY };
  }, [transform]);

  // Convierte coordenadas del mundo a coordenadas del canvas (aplicando transformaciones)
  const worldToCanvas = useCallback((worldX, worldY) => {
    const canvasX = worldX * transform.scale + transform.translateX;
    const canvasY = worldY * transform.scale + transform.translateY;
    
    return { x: canvasX, y: canvasY };
  }, [transform]);

  // Convierte coordenadas del canvas a coordenadas de imagen (normalized 0-1)
  const canvasToImage = useCallback((canvasX, canvasY) => {
    if (!imageDimensions.width || !imageDimensions.height || !canvasRef.current) {
      return { x: 0, y: 0 };
    }

    const canvas = canvasRef.current;
    
    // Calcular el área donde se dibuja la imagen (centrada y escalada)
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = imageDimensions.width / imageDimensions.height;
    
    let imageWidth, imageHeight, imageX, imageY;
    
    if (imageAspect > canvasAspect) {
      // La imagen es más ancha que el canvas
      imageWidth = canvas.width;
      imageHeight = canvas.width / imageAspect;
      imageX = 0;
      imageY = (canvas.height - imageHeight) / 2;
    } else {
      // La imagen es más alta que el canvas
      imageWidth = canvas.height * imageAspect;
      imageHeight = canvas.height;
      imageX = (canvas.width - imageWidth) / 2;
      imageY = 0;
    }
    
    // Convertir coordenadas del canvas a coordenadas relativas de la imagen
    const relativeX = (canvasX - imageX) / imageWidth;
    const relativeY = (canvasY - imageY) / imageHeight;
    
    // Convertir a coordenadas absolutas de imagen
    const imageCoordX = relativeX * imageDimensions.width;
    const imageCoordY = relativeY * imageDimensions.height;
    
    return { 
      x: Math.max(0, Math.min(imageDimensions.width, imageCoordX)),
      y: Math.max(0, Math.min(imageDimensions.height, imageCoordY))
    };
  }, [imageDimensions, canvasRef]);

  // Convierte coordenadas de imagen a coordenadas del canvas
  const imageToCanvas = useCallback((imageX, imageY) => {
    if (!imageDimensions.width || !imageDimensions.height || !canvasRef.current) {
      return { x: 0, y: 0 };
    }

    const canvas = canvasRef.current;
    
    // Calcular el área donde se dibuja la imagen
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = imageDimensions.width / imageDimensions.height;
    
    let imageWidth, imageHeight, imageOffsetX, imageOffsetY;
    
    if (imageAspect > canvasAspect) {
      imageWidth = canvas.width;
      imageHeight = canvas.width / imageAspect;
      imageOffsetX = 0;
      imageOffsetY = (canvas.height - imageHeight) / 2;
    } else {
      imageWidth = canvas.height * imageAspect;
      imageHeight = canvas.height;
      imageOffsetX = (canvas.width - imageWidth) / 2;
      imageOffsetY = 0;
    }
    
    // Convertir coordenadas de imagen a coordenadas del canvas
    const canvasX = imageOffsetX + (imageX / imageDimensions.width) * imageWidth;
    const canvasY = imageOffsetY + (imageY / imageDimensions.height) * imageHeight;
    
    return { x: canvasX, y: canvasY };
  }, [imageDimensions, canvasRef]);

  // Obtener el rectángulo donde se dibuja la imagen en el canvas
  const getImageBounds = useCallback(() => {
    if (!imageDimensions.width || !imageDimensions.height || !canvasRef.current) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const canvas = canvasRef.current;
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = imageDimensions.width / imageDimensions.height;
    
    let imageWidth, imageHeight, imageX, imageY;
    
    if (imageAspect > canvasAspect) {
      imageWidth = canvas.width;
      imageHeight = canvas.width / imageAspect;
      imageX = 0;
      imageY = (canvas.height - imageHeight) / 2;
    } else {
      imageWidth = canvas.height * imageAspect;
      imageHeight = canvas.height;
      imageX = (canvas.width - imageWidth) / 2;
      imageY = 0;
    }
    
    return { x: imageX, y: imageY, width: imageWidth, height: imageHeight };
  }, [imageDimensions, canvasRef]);

  // Función combinada: de pantalla directamente a coordenadas de imagen 
  const screenToImageCoordinates = useCallback((clientX, clientY) => {
    if (!canvasRef.current || !containerRef.current || !imageDimensions.width || !imageDimensions.height) {
      return { x: 0, y: 0 };
    }
    
    try {
      // 1. Convertir coordenadas de pantalla a canvas
      const canvasPoint = screenToCanvas(clientX, clientY);
      
      // 2. Convertir coordenadas del canvas a mundo (quitar zoom y pan)
      const worldPoint = canvasToWorld(canvasPoint.x, canvasPoint.y);
      
      // 3. Obtener los límites de la imagen en el canvas
      const imageBounds = getImageBounds();
      
      // 4. Calcular coordenadas relativas dentro de la imagen (0-1)
      const relativeX = (worldPoint.x - imageBounds.x) / imageBounds.width;
      const relativeY = (worldPoint.y - imageBounds.y) / imageBounds.height;
      
      // 5. Convertir a coordenadas absolutas de la imagen
      const imageX = Math.round(relativeX * imageDimensions.width);
      const imageY = Math.round(relativeY * imageDimensions.height);
      
      // 6. Permitir un pequeño margen fuera de la imagen
      const margin = 50; // píxeles de margen
      return {
        x: Math.max(-margin, Math.min(imageDimensions.width + margin, imageX)),
        y: Math.max(-margin, Math.min(imageDimensions.height + margin, imageY))
      };
    } catch (error) {
      console.error('Error en screenToImageCoordinates:', error);
      return { x: 0, y: 0 };
    }
  }, [canvasRef, containerRef, transform, imageDimensions, getImageBounds]);

  return {
    screenToCanvas,
    canvasToWorld,
    worldToCanvas,
    canvasToImage,
    imageToCanvas,
    screenToImageCoordinates,
    getImageBounds
  };
}

export default useCanvasCoordinates;
