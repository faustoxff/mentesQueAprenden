// Script de un solo uso: deja solo a Marisa + un admin nuevo, reasignando los datos.
// Correr desde server/:  node limpiar-usuarios.js
// Guarda un respaldo en server/respaldo-usuarios.json antes de tocar nada.
require('dotenv').config();
const fs = require('fs');
const { supabaseAdmin: c } = require('./src/config/supabase');

const MANTENER = 'marijulian@gmail.com';
const ADMIN = { email: 'adminuser@gmail.com', password: 'pepito1234' };

const cols = {
  pacientes: ['profesional_principal_id', 'created_by'],
  sesiones: ['profesional_id', 'created_by'],
  derivaciones: ['profesional_origen_id', 'profesional_destino_id'],
  turnos: ['profesional_id', 'created_by'],
  archivos_adjuntos: ['subido_por'],
  pagos: ['profesional_id', 'registrado_por'],
  logs_acceso: ['profesional_id'],
  evaluaciones: ['profesional_id', 'created_by'],
  versiones_notas: ['modificado_por']
};

(async () => {
  const { data: profs } = await c.from('profesionales').select('*');
  const viejos = profs.filter((p) => p.email !== MANTENER);
  const ids = viejos.map((p) => p.id);
  console.log('Se van:', viejos.map((p) => p.email).join(', '));

  const backup = { profesionales: viejos, filas: {} };
  for (const [t, cs] of Object.entries(cols)) {
    for (const col of cs) {
      const { data } = await c.from(t).select('*').in(col, ids);
      backup.filas[`${t}.${col}`] = data;
    }
  }
  // Si ya existe, es el de la primera corrida (antes de tocar nada): no se pisa.
  if (!fs.existsSync('respaldo-usuarios.json')) {
    fs.writeFileSync('respaldo-usuarios.json', JSON.stringify(backup, null, 2));
    console.log('Respaldo guardado en respaldo-usuarios.json');
  } else {
    console.log('Se mantiene el respaldo existente (respaldo-usuarios.json)');
  }

  // Reutiliza el admin si una corrida anterior ya lo creó.
  let nuevo;
  const { data: existente } = await c.from('profesionales').select('id').eq('email', ADMIN.email).maybeSingle();
  if (existente) {
    nuevo = existente.id;
    console.log('Admin ya existe, se reutiliza:', ADMIN.email);
  } else {
    const { data: u, error: e1 } = await c.auth.admin.createUser({
      email: ADMIN.email, password: ADMIN.password, email_confirm: true
    });
    if (e1) throw new Error('createUser: ' + e1.message);
    nuevo = u.user.id;
    const { error: e2 } = await c.from('profesionales').insert({
      id: nuevo, nombre: 'Admin', apellido: 'User', email: ADMIN.email,
      especialidad: 'otro', rol: 'admin', activo: true
    });
    if (e2) { await c.auth.admin.deleteUser(nuevo); throw new Error('insert profesional: ' + e2.message); }
    console.log('Admin creado:', ADMIN.email);
  }

  // Derivaciones entre dos cuentas que se van: al unificarlas serían de admin a admin
  // (prohibido por derivacion_distinta) y ya no tienen sentido. Quedan en el respaldo.
  const lista = ids.concat(nuevo).join(',');
  const { error: eDel, count: borradas } = await c.from('derivaciones')
    .delete({ count: 'exact' })
    .or(`and(profesional_origen_id.in.(${lista}),profesional_destino_id.in.(${ids.join(',')})),and(profesional_origen_id.in.(${ids.join(',')}),profesional_destino_id.eq.${nuevo})`);
  if (eDel) throw new Error('borrar derivaciones entre cuentas viejas: ' + eDel.message);
  console.log('derivaciones entre cuentas que se van, borradas:', borradas);

  for (const [t, cs] of Object.entries(cols)) {
    for (const col of cs) {
      const { error, count } = await c.from(t).update({ [col]: nuevo }, { count: 'exact' }).in(col, ids);
      if (error) throw new Error(`reasignar ${t}.${col}: ${error.message} (no se borró ninguna cuenta)`);
      console.log(`reasignado ${t}.${col}: ${count}`);
    }
  }

  for (const p of viejos) {
    const { error } = await c.auth.admin.deleteUser(p.id);
    console.log('borrar', p.email, error ? 'ERROR ' + error.message : 'ok');
  }

  const { data: fin } = await c.from('profesionales').select('email,rol');
  console.table(fin);
})().catch((e) => { console.error('FALLÓ:', e.message); process.exit(1); });
