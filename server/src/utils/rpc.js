// PostgREST responde PGRST202 (o Postgres 42883) cuando la función no existe: pasa si el
// backend se despliega antes de aplicar la migración 008. En ese caso se usa el camino
// anterior en vez de romper el calendario.
const funcionNoExiste = (error) => error?.code === 'PGRST202' || error?.code === '42883';

module.exports = { funcionNoExiste };
