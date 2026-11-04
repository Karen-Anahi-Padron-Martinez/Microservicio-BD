"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { revisarSentencia, revisarSentencias } = require("../src/lint");
const { main } = require("../bin/lint-sql");

const TABLA_OK = "CREATE TABLE t (id INT NOT NULL, PRIMARY KEY (id)) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4";

describe("revisarSentencia", () => {
  test("una tabla correcta no tiene problemas", () => {
    expect(revisarSentencia(TABLA_OK)).toEqual([]);
  });

  test("detecta tabla sin PRIMARY KEY, sin InnoDB y sin utf8mb4", () => {
    expect(revisarSentencia("CREATE TABLE t (id INT) ENGINE = MyISAM DEFAULT CHARSET = latin1")).toEqual([
      "la tabla no define PRIMARY KEY",
      "la tabla no usa ENGINE=InnoDB",
      "la tabla no usa CHARSET=utf8mb4",
    ]);
  });

  test("exige lista de columnas en INSERT", () => {
    expect(revisarSentencia("INSERT INTO t VALUES (1)")).toEqual(["INSERT sin lista explícita de columnas"]);
    expect(revisarSentencia("INSERT INTO t (id) VALUES (1)")).toEqual([]);
  });

  test("reporta errores de sintaxis", () => {
    const [problema] = revisarSentencia("CREAT TABLE t (id INT)");
    expect(problema).toMatch(/^error de sintaxis/);
  });

  test("prohíbe sentencias administrativas o destructivas", () => {
    for (const s of ["DROP DATABASE dbgestor", "GRANT ALL ON *.* TO x", "TRUNCATE usuario", "create user x"]) {
      expect(revisarSentencia(s)).toEqual(["sentencia administrativa o destructiva no permitida en los scripts"]);
    }
  });

  test("ignora sentencias de sesión y comentarios versionados de mysqldump", () => {
    expect(revisarSentencia("SET NAMES utf8mb4")).toEqual([]);
    expect(revisarSentencia("SET FOREIGN_KEY_CHECKS = 0")).toEqual([]);
    expect(revisarSentencia("/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE */")).toEqual([]);
  });

  test("otras sentencias válidas (DROP TABLE, SELECT) no generan problemas", () => {
    expect(revisarSentencia("DROP TABLE IF EXISTS usuario")).toEqual([]);
    expect(revisarSentencia("SELECT id FROM t")).toEqual([]);
  });
});

describe("revisarSentencias", () => {
  test("indica archivo y número de sentencia de cada problema", () => {
    expect(revisarSentencias("x.sql", [TABLA_OK, "INSERT INTO t VALUES (1)"])).toEqual([
      { archivo: "x.sql", sentencia: 2, problema: "INSERT sin lista explícita de columnas" },
    ]);
  });

  test("el dump original del proyecto no pasa el lint (latin1, INSERT sin columnas, tabla sin PK)", () => {
    const { leerSentencias } = require("../src/sql");
    const original = path.resolve(__dirname, "fixtures", "dump-original.sql");
    const problemas = revisarSentencias("dump-original.sql", leerSentencias(original)).map((h) => h.problema);

    expect(problemas.filter((p) => p === "la tabla no usa CHARSET=utf8mb4")).toHaveLength(6);
    expect(problemas.filter((p) => p === "INSERT sin lista explícita de columnas")).toHaveLength(5);
    expect(problemas).toContain("la tabla no define PRIMARY KEY");
  });
});

describe("bin/lint-sql", () => {
  let log;
  let error;

  beforeEach(() => {
    log = jest.spyOn(console, "log").mockImplementation(() => {});
    error = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test("los scripts del repositorio pasan el lint (código de salida 0)", () => {
    expect(main()).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^Lint SQL: 2 archivos, \d+ sentencias, 0 problemas$/));
    expect(error).not.toHaveBeenCalled();
  });

  test("un script con problemas devuelve código 1 y los imprime", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-"));
    fs.writeFileSync(path.join(dir, "01.sql"), "INSERT INTO t VALUES (1);");
    try {
      expect(main(dir)).toBe(1);
      expect(error).toHaveBeenCalledWith("01.sql #1: INSERT sin lista explícita de columnas");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
