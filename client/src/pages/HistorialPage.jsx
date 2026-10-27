import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { History } from 'lucide-react';
import api from '../services/api';
import { getErrorMessage } from '../utils/errores';
import { COLORES_ESTADO, ESTADO_LABEL, TIPO_OPTIONS, urlRegistrarSesion } from '../utils/turnos';

// Turnos y sesiones ya pasados del profesional. Los turnos con fecha pasada se permiten
// (sirven para registrar sesiones ya hechas) y acá se consultan.

const PERIODOS = [
  { meses: 1, label: 'Último mes' },
  { meses: 3, label: 'Últimos 3 meses' },
  { meses: 6, label: 'Últimos 6 meses' },
  { meses: 12, label: 'Últimos 12 meses' }
];

const ESTADOS = [
  { value: 'todos', label: 'Todos' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'sin_cerrar', label: 'Sin cerrar (programado o confirmado)' }
];

const SIN_CERRAR = ['programado', 'confirmado'];

// Botones y campos de al menos 44 px de alto para tocar cómodo en el celular (DEF-M03, DEF-M04).
const CAMPO = 'w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';
const ACCION = 'inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl text-sm font-medium';

const sinTildes = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Turnos y sesiones sin turno traen la sesión con la misma forma: { sesion: { id } }.
const sesionDe = (t) => t.sesion?.id || null;

function filtrar(items, { estado, tipo, busqueda, soloSinSesion }) {
  const termino = sinTildes(busqueda.trim());
  return items.filter((t) => {
    if (estado === 'sin_cerrar' ? !SIN_CERRAR.includes(t.estado) : estado !== 'todos' && t.estado !== estado) return false;
    if (tipo && t.tipo !== tipo) return false;
    if (soloSinSesion && sesionDe(t)) return false;
    if (termino && !sinTildes(`${t.paciente?.nombre} ${t.paciente?.apellido}`).includes(termino)) return false;
    return true;
  });
}

function agruparPorMes(items) {
  const grupos = [];
  items.forEach((t) => {
    const mes = format(new Date(t.fecha_inicio), 'MMMM yyyy', { locale: es });
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.mes === mes) ultimo.items.push(t);
    else grupos.push({ mes, items: [t] });
  });
  return grupos;
}

function Accion({ turno }) {
  const sesionId = sesionDe(turno);
  if (sesionId) {
    return (
      <Link to={`/sesiones/${sesionId}`} className={`${ACCION} border border-primary-200 text-primary-700 hover:bg-primary-50`}>
        Ver sesión
      </Link>
    );
  }
  if (!turno.es_sesion && turno.estado !== 'cancelado' && turno.paciente_id) {
    return (
      <Link to={urlRegistrarSesion(turno)} className={`${ACCION} bg-primary-600 hover:bg-primary-700 text-white`}>
        Registrar sesión
      </Link>
    );
  }
  return null;
}

function ItemHistorial({ turno }) {
  const fecha = new Date(turno.fecha_inicio);
  const tipo = TIPO_OPTIONS.find((o) => o.value === turno.tipo)?.label || 'Sin tipo';
  const paciente = turno.paciente ? `${turno.paciente.apellido}, ${turno.paciente.nombre}` : 'Sin paciente';

  return (
    <li className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-gray-500 capitalize">
          <time dateTime={turno.fecha_inicio}>{format(fecha, "EEEE d 'de' MMMM, HH:mm", { locale: es })}</time>
        </p>
        <p className="font-medium text-gray-900 break-words">
          {turno.paciente_id
            ? <Link to={`/pacientes/${turno.paciente_id}`} className="hover:underline text-primary-700">{paciente}</Link>
            : paciente}
        </p>
        <p className="text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{tipo}</span>
          <span>{turno.consultorio ? `Consultorio ${turno.consultorio}` : 'Sin consultorio'}</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORES_ESTADO[turno.estado] }} />
            {ESTADO_LABEL[turno.estado] || turno.estado}
          </span>
        </p>
      </div>
      <div className="flex-shrink-0">
        <Accion turno={turno} />
      </div>
    </li>
  );
}

export default function HistorialPage() {
  const uid = useId();
  const [meses, setMeses] = useState(1);
  const [estado, setEstado] = useState('todos');
  const [tipo, setTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloSinSesion, setSoloSinSesion] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['historial-turnos', meses],
    queryFn: () => {
      const ahora = new Date();
      return api.get('/turnos', {
        params: { fecha_inicio: subMonths(ahora, meses).toISOString(), fecha_fin: ahora.toISOString(), incluir_cancelados: 'true' }
      }).then((r) => r.data);
    }
  });

  const grupos = useMemo(() => {
    // Solo lo propio: la ocupación de otros profesionales (ocupado) no es historial de nadie acá.
    const propios = (data || []).filter((t) => !t.ocupado);
    const ordenados = [...propios].sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
    return agruparPorMes(filtrar(ordenados, { estado, tipo, busqueda, soloSinSesion }));
  }, [data, estado, tipo, busqueda, soloSinSesion]);

  const hayFiltros = estado !== 'todos' || tipo || busqueda.trim() || soloSinSesion;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History size={24} className="text-primary-600" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900">Historial de turnos</h1>
      </div>

      <section aria-label="Filtros" className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor={`${uid}-periodo`} className="block text-sm font-medium text-gray-700 mb-1">Período</label>
          <select id={`${uid}-periodo`} value={meses} onChange={(e) => setMeses(Number(e.target.value))} className={CAMPO}>
            {PERIODOS.map((p) => <option key={p.meses} value={p.meses}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-estado`} className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select id={`${uid}-estado`} value={estado} onChange={(e) => setEstado(e.target.value)} className={CAMPO}>
            {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-tipo`} className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select id={`${uid}-tipo`} value={tipo} onChange={(e) => setTipo(e.target.value)} className={CAMPO}>
            <option value="">Todos</option>
            {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-busqueda`} className="block text-sm font-medium text-gray-700 mb-1">Buscar paciente</label>
          <input id={`${uid}-busqueda`} type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o apellido" className={CAMPO} />
        </div>
        <label htmlFor={`${uid}-sin-sesion`} className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 sm:col-span-2 lg:col-span-4">
          <input id={`${uid}-sin-sesion`} type="checkbox" checked={soloSinSesion} onChange={(e) => setSoloSinSesion(e.target.checked)} className="w-5 h-5 rounded" />
          Solo sin sesión registrada
        </label>
      </section>

      {isLoading && (
        <div role="status" aria-label="Cargando historial" className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {getErrorMessage(error, 'No se pudo cargar el historial')}
        </div>
      )}

      {!isLoading && !error && grupos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="font-medium">No hay turnos en este período</p>
          {hayFiltros && <p className="text-sm mt-1">Probá con otros filtros o un período más largo.</p>}
        </div>
      )}

      {grupos.map(({ mes, items }, i) => (
        <section key={mes} aria-labelledby={`${uid}-mes-${i}`} className="mb-6">
          <h2 id={`${uid}-mes-${i}`} className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{mes}</h2>
          <ul className="space-y-2">
            {items.map((t) => <ItemHistorial key={t.id} turno={t} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
