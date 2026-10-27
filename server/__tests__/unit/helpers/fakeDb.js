// Cliente Supabase falso para tests unitarios.
// resultados: { tabla: resultado | [resultado1, resultado2, ...] }. Cada vez que el
// código hace await sobre una consulta de esa tabla se consume el siguiente resultado
// (el último se repite). `llamadas` registra [tabla, método, args] en orden.
function crearDb(resultados = {}) {
  const llamadas = [];
  const colas = Object.fromEntries(
    Object.entries(resultados).map(([t, r]) => [t, Array.isArray(r) ? [...r] : [r]])
  );
  const siguiente = (tabla) => {
    const cola = colas[tabla] || [{ data: null, error: null }];
    return cola.length > 1 ? cola.shift() : cola[0];
  };

  const db = {
    rpc(nombre, args) {
      llamadas.push(['rpc', nombre, [args]]);
      return Promise.resolve(siguiente(`rpc:${nombre}`));
    },
    from(tabla) {
      const q = {};
      ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'or', 'order', 'range', 'gte', 'lte', 'lt', 'gt', 'limit', 'not', 'match']
        .forEach((m) => { q[m] = (...args) => { llamadas.push([tabla, m, args]); return q; }; });
      q.single = () => Promise.resolve(siguiente(tabla));
      q.maybeSingle = q.single;
      q.then = (res, rej) => Promise.resolve(siguiente(tabla)).then(res, rej);
      return q;
    }
  };
  const rpcs = (nombre) => llamadas.filter(([t, m]) => t === 'rpc' && m === nombre).map(([, , a]) => a[0]);
  const enTabla = (tabla, metodo) => llamadas.filter(([t, m]) => t === tabla && m === metodo).map(([, , a]) => a);
  return { db, llamadas, enTabla, rpcs };
}

module.exports = { crearDb };
