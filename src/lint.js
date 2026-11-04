"use strict";

const { Parser } = require("node-sql-parser");

const parser = new Parser();
const OPCIONES = { database: "MariaDB" };

// Sentencias de sesión (SET ...) que el parser no necesita validar
const SENTENCIA_DE_SESION = /^SET\s+(NAMES|FOREIGN_KEY_CHECKS)\b/i;
const PROHIBIDAS = /^(DROP\s+DATABASE|GRANT|REVOKE|CREATE\s+USER|ALTER\s+USER|TRUNCATE)\b/i;

/**
 * Reglas del proyecto para cada sentencia. Devuelve una lista de problemas (vacía si es correcta).
 *  - Sintaxis válida para MariaDB.
 *  - Sin sentencias administrativas o destructivas (DROP DATABASE, GRANT, ...).
 *  - CREATE TABLE con PRIMARY KEY, motor InnoDB y juego de caracteres utf8mb4.
 *  - INSERT con lista explícita de columnas (no depende del orden de las columnas).
 */
function revisarSentencia(sentencia) {
  const problemas = [];
  if (SENTENCIA_DE_SESION.test(sentencia)) {
    return problemas;
  }
  if (PROHIBIDAS.test(sentencia)) {
    problemas.push("sentencia administrativa o destructiva no permitida en los scripts");
    return problemas;
  }

  let ast;
  try {
    ast = parser.astify(sentencia, OPCIONES);
  } catch (e) {
    problemas.push(`error de sintaxis: ${e.message.split("\n")[0]}`);
    return problemas;
  }

  const nodo = Array.isArray(ast) ? ast[0] : ast;
  if (!nodo) {
    // Sentencia formada solo por comentarios (p. ej. /*!40101 ... */ de mysqldump): no hay nada que revisar
    return problemas;
  }
  if (nodo.type === "create" && nodo.keyword === "table") {
    if (!/PRIMARY\s+KEY/i.test(sentencia)) {
      problemas.push("la tabla no define PRIMARY KEY");
    }
    if (!/ENGINE\s*=\s*InnoDB/i.test(sentencia)) {
      problemas.push("la tabla no usa ENGINE=InnoDB");
    }
    if (!/CHARSET\s*=\s*utf8mb4/i.test(sentencia)) {
      problemas.push("la tabla no usa CHARSET=utf8mb4");
    }
  }
  if (nodo.type === "insert" && (!nodo.columns || nodo.columns.length === 0)) {
    problemas.push("INSERT sin lista explícita de columnas");
  }
  return problemas;
}

/** Revisa todas las sentencias de un archivo; cada problema indica el archivo y el número de sentencia. */
function revisarSentencias(archivo, sentencias) {
  const hallazgos = [];
  sentencias.forEach((sentencia, indice) => {
    revisarSentencia(sentencia).forEach((problema) => {
      hallazgos.push({ archivo, sentencia: indice + 1, problema });
    });
  });
  return hallazgos;
}

module.exports = { revisarSentencia, revisarSentencias };
