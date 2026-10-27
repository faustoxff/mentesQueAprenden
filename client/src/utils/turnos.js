// Datos de presentación de los turnos que comparten la agenda y el historial.

export const COLORES_ESTADO = {
  programado: '#6366f1',
  confirmado: '#10b981',
  cancelado: '#ef4444',
  ausente: '#f59e0b',
  realizado: '#6b7280'
};

export const ESTADO_LABEL = {
  programado: 'Programado',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  ausente: 'Ausente',
  realizado: 'Realizado'
};

export const TIPO_OPTIONS = [
  { value: 'tratamiento', label: 'Tratamiento' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'reunion_interdisciplinaria', label: 'Reunión interdisciplinaria' }
];

// Link a "Nueva sesión" con los datos del turno: con turno_id, la sesión queda vinculada
// a ese turno (ver SesionService.crear).
export function urlRegistrarSesion(turno) {
  return `/sesiones/nueva?${new URLSearchParams({
    paciente_id: turno.paciente_id,
    turno_id: turno.id,
    fecha: turno.fecha_inicio,
    tipo: turno.tipo || 'tratamiento',
    consultorio: String(turno.consultorio || 1),
    duracion: String(Math.round((new Date(turno.fecha_fin) - new Date(turno.fecha_inicio)) / 60000))
  })}`;
}
