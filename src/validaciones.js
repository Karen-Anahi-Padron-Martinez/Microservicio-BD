"use strict";

/*
 * Validaciones del esquema y de los datos que se ejecutan contra la BD temporal del pipeline.
 * Cada validación es una consulta cuyo resultado debe cumplir la condición "esperado".
 */
const TABLAS = ["asignaciones", "comentarios", "proyectos", "tareas", "usuario"];

const VALIDACIONES = [
  {
    nombre: "existen las 5 tablas del modelo",
    sql: "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name",
    esperado: (filas) => JSON.stringify(filas.map((f) => f.t)) === JSON.stringify(TABLAS),
  },
  {
    nombre: "todas las tablas usan InnoDB y utf8mb4",
    sql: "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND (engine <> 'InnoDB' OR table_collation NOT LIKE 'utf8mb4%')",
    esperado: (filas) => Number(filas[0].n) === 0,
  },
  {
    nombre: "las 4 llaves foráneas existen",
    sql: "SELECT COUNT(*) AS n FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()",
    esperado: (filas) => Number(filas[0].n) === 4,
  },
  {
    nombre: "el correo de usuario es único",
    sql: "SELECT COUNT(*) AS n FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'usuario' AND constraint_type = 'UNIQUE'",
    esperado: (filas) => Number(filas[0].n) === 1,
  },
  {
    nombre: "ninguna contraseña está en texto plano (todas son hash BCrypt)",
    sql: "SELECT COUNT(*) AS n FROM usuario WHERE contrasena NOT REGEXP '^\\\\$2[aby]\\\\$[0-9]{2}\\\\$[./A-Za-z0-9]{53}$'",
    esperado: (filas) => Number(filas[0].n) === 0,
  },
  {
    nombre: "los datos de prueba no contienen correos reales",
    sql: "SELECT COUNT(*) AS n FROM usuario WHERE correo_electronico NOT LIKE '%@example.com'",
    esperado: (filas) => Number(filas[0].n) === 0,
  },
  {
    nombre: "no hay tareas sin proyecto ni comentarios sin tarea",
    sql: "SELECT (SELECT COUNT(*) FROM tareas t LEFT JOIN proyectos p ON p.id_proyecto = t.id_proyecto WHERE p.id_proyecto IS NULL) + (SELECT COUNT(*) FROM comentarios c LEFT JOIN tareas t ON t.id_tarea = c.id_tarea WHERE t.id_tarea IS NULL) AS n",
    esperado: (filas) => Number(filas[0].n) === 0,
  },
  {
    nombre: "las tareas solo usan las listas que conoce la vista",
    sql: "SELECT COUNT(*) AS n FROM tareas WHERE lista NOT IN ('pendientes', 'encurso', 'terminado')",
    esperado: (filas) => Number(filas[0].n) === 0,
  },
];

/** Ejecuta todas las validaciones y devuelve los nombres de las que fallaron. */
async function ejecutarValidaciones(conexion, validaciones = VALIDACIONES) {
  const fallidas = [];
  for (const validacion of validaciones) {
    const filas = await conexion.query(validacion.sql);
    if (!validacion.esperado(filas)) {
      fallidas.push(validacion.nombre);
    }
  }
  return fallidas;
}

module.exports = { VALIDACIONES, TABLAS, ejecutarValidaciones };
