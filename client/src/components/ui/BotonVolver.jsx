import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Flecha de volver de las pantallas que se abren desde el menú: sube un nivel
// (por defecto, al inicio), igual que en el resto de la app.
export default function BotonVolver({ a = '/' }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(a)} className="p-2 rounded-xl hover:bg-gray-100" aria-label="Volver">
      <ArrowLeft size={20} />
    </button>
  );
}
