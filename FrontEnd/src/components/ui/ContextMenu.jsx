import React from 'react';

function ContextMenu() {
  return (
    <div id="contextMenu" className="hidden fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm" data-action="available">Marcar como Disponible</button>
      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm" data-action="reserved">Marcar como Reservado</button>
      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm" data-action="sold">Marcar como Vendido</button>
      <hr className="my-1" />
      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-red-600" data-action="delete">Eliminar Lote</button>
    </div>
  );
}

export default ContextMenu;