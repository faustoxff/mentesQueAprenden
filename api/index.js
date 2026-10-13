// Punto de entrada de Vercel: expone la app de Express como función serverless.
// Las rutas ya están montadas bajo /api/..., Vercel conserva la URL original.
module.exports = require('../server/src/index.js');
