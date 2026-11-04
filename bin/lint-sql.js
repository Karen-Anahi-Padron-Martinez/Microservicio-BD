#!/usr/bin/env node
"use strict";

/* Etapa "Lint SQL" del pipeline: revisa todos los scripts de sql/ sin necesidad de una BD. */
const path = require("path");
const { listarScripts, leerSentencias } = require("../src/sql");
const { revisarSentencias } = require("../src/lint");

function main(directorio = path.resolve(__dirname, "..", "sql")) {
  const archivos = listarScripts(directorio);
  let total = 0;
  const hallazgos = [];

  for (const archivo of archivos) {
    const sentencias = leerSentencias(archivo);
    total += sentencias.length;
    hallazgos.push(...revisarSentencias(path.basename(archivo), sentencias));
  }

  hallazgos.forEach((h) => console.error(`${h.archivo} #${h.sentencia}: ${h.problema}`));
  console.log(`Lint SQL: ${archivos.length} archivos, ${total} sentencias, ${hallazgos.length} problemas`);
  return hallazgos.length === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { main };
