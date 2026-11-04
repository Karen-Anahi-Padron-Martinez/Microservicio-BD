"use strict";

/*
 * Pruebas sobre una BD temporal real (MariaDB). Se ejecutan cuando existen DB_HOST/DB_USER/DB_PASSWORD;
 * en el pipeline REQUIERE_BD=1 hace que su ausencia sea un error en lugar de omitirlas.
 * Crea dbgestor_ci_<id>, carga sql/*.sql, valida esquema y datos, prueba restricciones y la borra al final.
 */
const path = require("path");
const mariadb = require("mariadb");
const bcrypt = require("bcryptjs");
const sql = require("../src/sql");
const { ejecutarValidaciones } = require("../src/validaciones");

const HAY_BD = Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD);
const NOMBRE_BD = `dbgestor_ci_${(process.env.BUILD_NUMBER || String(process.pid)).replace(/\W/g, "")}`;
const CONTRASENA_DEMO = "Demo2026!";

if (!HAY_BD && process.env.REQUIERE_BD === "1") {
  throw new Error("REQUIERE_BD=1 pero faltan DB_HOST/DB_USER/DB_PASSWORD");
}

(HAY_BD ? describe : describe.skip)("BD temporal MariaDB", () => {
  let conexion;

  beforeAll(async () => {
    conexion = await mariadb.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    await sql.crearBdTemporal(conexion, NOMBRE_BD);
    await sql.ejecutarScripts(conexion, sql.listarScripts(path.resolve(__dirname, "..", "sql")));
  }, 60000);

  afterAll(async () => {
    if (conexion) {
      await sql.eliminarBdTemporal(conexion, NOMBRE_BD);
      await conexion.end();
    }
  });

  test("el esquema y los datos cumplen todas las validaciones", async () => {
    expect(await ejecutarValidaciones(conexion)).toEqual([]);
  });

  test("se cargaron los datos de prueba", async () => {
    const [conteo] = await conexion.query(
      "SELECT (SELECT COUNT(*) FROM usuario) u, (SELECT COUNT(*) FROM proyectos) p, (SELECT COUNT(*) FROM tareas) t, (SELECT COUNT(*) FROM comentarios) c"
    );
    expect([conteo.u, conteo.p, conteo.t, conteo.c].map(Number)).toEqual([3, 1, 1, 2]);
  });

  test("los hashes guardados corresponden a la contraseña demo y son compatibles con BCrypt de Spring", async () => {
    const usuarios = await conexion.query("SELECT contrasena FROM usuario");
    for (const { contrasena } of usuarios) {
      expect(contrasena).toMatch(/^\$2a\$10\$/);
      expect(bcrypt.compareSync(CONTRASENA_DEMO, contrasena)).toBe(true);
      expect(bcrypt.compareSync("12345", contrasena)).toBe(false);
    }
  });

  test("los acentos se guardan correctamente en utf8mb4", async () => {
    const [proyecto] = await conexion.query("SELECT descripcion FROM proyectos WHERE id_proyecto = 197");
    expect(proyecto.descripcion).toContain("Desarrollarán");
    expect(proyecto.descripcion).toContain("información");
  });

  test("no se permiten dos usuarios con el mismo correo", async () => {
    await expect(
      conexion.query("INSERT INTO usuario (nombre, correo_electronico, contrasena) VALUES ('X', 'demo1@example.com', 'x')")
    ).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });
  });

  test("no se permite una tarea de un proyecto inexistente", async () => {
    await expect(
      conexion.query("INSERT INTO tareas (nombre, lista, id_proyecto) VALUES ('X', 'pendientes', 99999)")
    ).rejects.toMatchObject({ code: "ER_NO_REFERENCED_ROW_2" });
  });

  test("la fecha de finalización no puede ser anterior a la de inicio", async () => {
    await expect(
      conexion.query("INSERT INTO proyectos (nombre, fecha_inicio, fecha_finalizacion) VALUES ('X', '2024-06-29', '2024-05-31')")
    ).rejects.toMatchObject({ code: "ER_CONSTRAINT_FAILED" });
  });

  test("al borrar un proyecto se borran en cascada sus tareas y comentarios", async () => {
    await conexion.beginTransaction();
    try {
      await conexion.query("DELETE FROM proyectos WHERE id_proyecto = 197");
      const [quedan] = await conexion.query(
        "SELECT (SELECT COUNT(*) FROM tareas WHERE id_proyecto = 197) t, (SELECT COUNT(*) FROM comentarios WHERE id_tarea = 199) c"
      );
      expect([quedan.t, quedan.c].map(Number)).toEqual([0, 0]);
    } finally {
      await conexion.rollback();
    }
  });
});
