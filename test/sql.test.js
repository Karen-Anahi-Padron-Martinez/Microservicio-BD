"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const sql = require("../src/sql");

describe("dividirSentencias", () => {
  test("separa por punto y coma e ignora comentarios y líneas vacías", () => {
    const texto = "-- encabezado\nCREATE TABLE a (id INT);\n\n-- otro\nINSERT INTO a (id) VALUES (1);\n";
    expect(sql.dividirSentencias(texto)).toEqual(["CREATE TABLE a (id INT)", "INSERT INTO a (id) VALUES (1)"]);
  });

  test("no corta dentro de cadenas con ; ni con -- y respeta comillas escapadas", () => {
    const texto = "INSERT INTO t (x) VALUES ('a;b -- no es comentario', 'O''Hara', 'c\\'d');SELECT 1";
    expect(sql.dividirSentencias(texto)).toEqual([
      "INSERT INTO t (x) VALUES ('a;b -- no es comentario', 'O''Hara', 'c\\'d')",
      "SELECT 1",
    ]);
  });

  test("conserva hashes BCrypt con $ y / dentro de las cadenas", () => {
    const hash = "$2a$10$ZmWSoT8jH50GDu/1xFqo3eVV/nFrpvtlzUY2pdCnYbhaSrD0EuRMu";
    expect(sql.dividirSentencias(`INSERT INTO u (c) VALUES ('${hash}');`)[0]).toContain(hash);
  });

  test("un comentario al final del archivo sin salto de línea no deja sentencias vacías", () => {
    expect(sql.dividirSentencias("SELECT 1; -- fin")).toEqual(["SELECT 1"]);
  });

  test("texto vacío devuelve lista vacía", () => {
    expect(sql.dividirSentencias("  \n -- solo comentario\n")).toEqual([]);
  });

  test("una cadena sin cerrar es un error", () => {
    expect(() => sql.dividirSentencias("INSERT INTO t VALUES ('abc);")).toThrow("Cadena sin cerrar");
  });
});

describe("archivos de scripts", () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sqltest-"));
    fs.writeFileSync(path.join(dir, "02_datos.sql"), "INSERT INTO a (id) VALUES (1);");
    fs.writeFileSync(path.join(dir, "01_esquema.SQL"), "CREATE TABLE a (id INT);");
    fs.writeFileSync(path.join(dir, "notas.txt"), "no es sql");
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  test("listarScripts devuelve solo .sql ordenados por nombre", () => {
    expect(sql.listarScripts(dir).map((f) => path.basename(f))).toEqual(["01_esquema.SQL", "02_datos.sql"]);
  });

  test("ejecutarScripts manda cada sentencia en orden y devuelve el total", async () => {
    const conexion = { query: jest.fn().mockResolvedValue([]) };

    const total = await sql.ejecutarScripts(conexion, sql.listarScripts(dir));

    expect(total).toBe(2);
    expect(conexion.query.mock.calls.map((c) => c[0])).toEqual(["CREATE TABLE a (id INT)", "INSERT INTO a (id) VALUES (1)"]);
  });

  test("ejecutarScripts propaga el error de la BD", async () => {
    const conexion = { query: jest.fn().mockRejectedValue(new Error("sintaxis")) };
    await expect(sql.ejecutarScripts(conexion, sql.listarScripts(dir))).rejects.toThrow("sintaxis");
  });

  test("los scripts reales del repositorio se leen sin errores", () => {
    const archivos = sql.listarScripts(path.resolve(__dirname, "..", "sql"));
    expect(archivos.map((f) => path.basename(f))).toEqual(["01_esquema.sql", "02_datos_prueba.sql"]);
    expect(archivos.flatMap(sql.leerSentencias).length).toBeGreaterThan(10);
  });
});

describe("BD temporal", () => {
  test("validarNombreBd acepta solo nombres dbgestor_ci_*", () => {
    expect(sql.validarNombreBd("dbgestor_ci_42")).toBe("dbgestor_ci_42");
    expect(() => sql.validarNombreBd("dbgestor")).toThrow("no permitido");
    expect(() => sql.validarNombreBd("dbgestor_ci_x`; DROP DATABASE mysql; --")).toThrow("no permitido");
    expect(() => sql.validarNombreBd("dbgestor_ci_")).toThrow("no permitido");
  });

  test("crearBdTemporal recrea la BD con utf8mb4 y la selecciona", async () => {
    const conexion = { query: jest.fn().mockResolvedValue([]) };

    await sql.crearBdTemporal(conexion, "dbgestor_ci_7");

    expect(conexion.query.mock.calls.map((c) => c[0])).toEqual([
      "DROP DATABASE IF EXISTS `dbgestor_ci_7`",
      "CREATE DATABASE `dbgestor_ci_7` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
      "USE `dbgestor_ci_7`",
    ]);
  });

  test("eliminarBdTemporal borra la BD y no acepta otros nombres", async () => {
    const conexion = { query: jest.fn().mockResolvedValue([]) };

    await sql.eliminarBdTemporal(conexion, "dbgestor_ci_7");
    expect(conexion.query).toHaveBeenCalledWith("DROP DATABASE IF EXISTS `dbgestor_ci_7`");

    await expect(sql.eliminarBdTemporal(conexion, "mysql")).rejects.toThrow("no permitido");
    expect(conexion.query).toHaveBeenCalledTimes(1);
  });
});
