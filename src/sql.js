"use strict";

const fs = require("fs");
const path = require("path");

const NOMBRE_BD_VALIDO = /^dbgestor_ci_\w{1,40}$/;

/** Devuelve los .sql de un directorio en orden de ejecución (por nombre: 01_, 02_, ...). */
function listarScripts(directorio) {
  return fs
    .readdirSync(directorio)
    .filter((archivo) => archivo.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b))
    .map((archivo) => path.join(directorio, archivo));
}

/**
 * Divide un script en sentencias: separa por ';' fuera de cadenas y descarta comentarios "--" y vacíos.
 * Las comillas simples se escapan duplicándolas ('') o con barra invertida.
 */
function dividirSentencias(texto) {
  const sentencias = [];
  let actual = "";
  let enCadena = false;
  let i = 0;

  while (i < texto.length) {
    const c = texto[i];
    const siguiente = texto[i + 1];

    if (enCadena) {
      actual += c;
      if (c === "\\" && siguiente !== undefined) {
        actual += siguiente;
        i += 2;
        continue;
      }
      if (c === "'") {
        if (siguiente === "'") {
          actual += siguiente;
          i += 2;
          continue;
        }
        enCadena = false;
      }
      i++;
      continue;
    }

    if (c === "-" && siguiente === "-") {
      const finDeLinea = texto.indexOf("\n", i);
      i = finDeLinea === -1 ? texto.length : finDeLinea;
      continue;
    }
    if (c === "'") {
      enCadena = true;
    }
    if (c === ";") {
      agregarSentencia(sentencias, actual);
      actual = "";
    } else {
      actual += c;
    }
    i++;
  }

  if (enCadena) {
    throw new Error("Cadena sin cerrar en el script SQL");
  }
  agregarSentencia(sentencias, actual);
  return sentencias;
}

function agregarSentencia(sentencias, texto) {
  const limpia = texto.trim();
  if (limpia.length > 0) {
    sentencias.push(limpia);
  }
}

/** Lee y divide un archivo SQL. */
function leerSentencias(archivo) {
  return dividirSentencias(fs.readFileSync(archivo, "utf8"));
}

/** El nombre de la BD temporal se usa como identificador, así que solo se aceptan nombres seguros. */
function validarNombreBd(nombre) {
  if (!NOMBRE_BD_VALIDO.test(nombre)) {
    throw new Error(`Nombre de base de datos temporal no permitido: ${nombre}`);
  }
  return nombre;
}

/** Ejecuta en orden todas las sentencias de los archivos indicados; devuelve cuántas se ejecutaron. */
async function ejecutarScripts(conexion, archivos) {
  let total = 0;
  for (const archivo of archivos) {
    for (const sentencia of leerSentencias(archivo)) {
      await conexion.query(sentencia);
      total++;
    }
  }
  return total;
}

async function crearBdTemporal(conexion, nombre) {
  validarNombreBd(nombre);
  await conexion.query(`DROP DATABASE IF EXISTS \`${nombre}\``);
  await conexion.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conexion.query(`USE \`${nombre}\``);
}

async function eliminarBdTemporal(conexion, nombre) {
  validarNombreBd(nombre);
  await conexion.query(`DROP DATABASE IF EXISTS \`${nombre}\``);
}

module.exports = {
  listarScripts,
  dividirSentencias,
  leerSentencias,
  validarNombreBd,
  ejecutarScripts,
  crearBdTemporal,
  eliminarBdTemporal,
};
