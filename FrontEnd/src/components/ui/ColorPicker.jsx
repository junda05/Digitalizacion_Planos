import React, { useState } from 'react';
import { Palette, RotateCcw } from 'lucide-react';

// Paleta de colores predefinida para sublotes
const DEFAULT_COLORS = [
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
  '#F59E0B', // yellow-500
];

const ColorPicker = ({ 
  selectedColor,
  onColorChange,
  onRandomColor,
  onResetColors,
  usedColors = [],
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Obtener próximo color disponible evitando colores similares
  const getNextAvailableColor = () => {
    for (const color of DEFAULT_COLORS) {
      const isUsed = usedColors.some(usedColor => 
        Math.abs(parseInt(color.slice(1), 16) - parseInt(usedColor.slice(1), 16)) < 0x333333
      );
      if (!isUsed) return color;
    }
    // Si todos están usados, generar color aleatorio
    return generateRandomColor();
  };

  // Generar color aleatorio evitando similares
  const generateRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 40); // 60-100%
    const lightness = 45 + Math.floor(Math.random() * 20); // 45-65%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const handleColorSelect = (color) => {
    onColorChange(color);
    setIsOpen(false);
  };

  const handleRandomColor = () => {
    const randomColor = generateRandomColor();
    onColorChange(randomColor);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">Color de Sublotes</div>
      
      <div className="flex items-center space-x-2">
        {/* Color actual */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors shadow-sm"
          style={{ backgroundColor: selectedColor }}
          title="Seleccionar color"
        />
        
        {/* Color inteligente */}
        <button
          onClick={() => handleColorSelect(getNextAvailableColor())}
          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          title="Próximo color disponible"
        >
          <Palette className="w-4 h-4" />
        </button>
        
        {/* Color aleatorio */}
        <button
          onClick={handleRandomColor}
          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          title="Color aleatorio"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown de colores */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {DEFAULT_COLORS.map((color, index) => {
              const isUsed = usedColors.includes(color);
              const isSelected = selectedColor === color;
              
              return (
                <button
                  key={index}
                  onClick={() => handleColorSelect(color)}
                  className={`
                    w-8 h-8 rounded-lg border-2 transition-all duration-200
                    ${isSelected 
                      ? 'border-gray-900 scale-110' 
                      : isUsed 
                        ? 'border-gray-300 opacity-50'
                        : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={isUsed ? 'Color en uso' : 'Seleccionar color'}
                />
              );
            })}
          </div>
          
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <button
              onClick={handleRandomColor}
              className="w-full text-sm py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Generar Color Aleatorio
            </button>
            
            {usedColors.length > 0 && (
              <button
                onClick={() => {
                  onResetColors();
                  setIsOpen(false);
                }}
                className="w-full text-sm py-2 px-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Resetear Todos los Colores
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info de colores usados */}
      {usedColors.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {usedColors.length} color{usedColors.length !== 1 ? 'es' : ''} en uso
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
