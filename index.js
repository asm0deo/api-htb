// Importaciones requeridas
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// Configuración de Google Sheets
const SHEET_ID = "1dzvaGlT_0xnT-PGO27Z_4prHgA8PHIpErmoWdlUrSoA";
const API_KEY = "AIzaSyDzztAdQMG0a98HG4hgDAh0RXK7tBCW5Cg";
const URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/HackTheBox?key=${API_KEY}`;

/**
 * Obtiene los datos de la hoja de Google Sheets
 */
async function getSheetData() {
  try {
    const response = await axios.get(URL);
    return response.data;
  } catch (error) {
    return { error: `Error al obtener datos: ${error.response?.status || error.message}` };
  }
}

/**
 * Formatea los datos comenzando desde la fila 5 en formato JSON
 */
function formatDataJson(data) {
  const formattedData = [];
  
  if ("values" in data) {
    // Comenzar desde la fila 5 (índice 4 en la lista)
    const rows = data.values.slice(4);
    
    for (const row of rows) {
      // Asegurarse de que haya suficientes columnas
      if (row.length >= 7) {
        // Procesar cada columna y reemplazar saltos de línea por comas
        const nombre = row[0];
        const ip = row[1];
        const os = row[2];
        const dificultad = row[3];
        
        // Reemplazar saltos de línea por comas
        const tecnicas = row[4].includes("\n") ? row[4].replace(/\n/g, ", ") : row[4];
        const certificaciones = row[5].includes("\n") ? row[5].replace(/\n/g, ", ") : row[5];
        const writeup = row[6].includes("\n") ? row[6].replace(/\n/g, ", ") : row[6];
        
        const boxData = {
          nombre,
          IP: ip,
          OS: os,
          Dificultad: dificultad,
          tecnicas,
          certificaciones,
          writeup
        };
        
        formattedData.push(boxData);
      }
    }
  }
  
  return formattedData;
}

// Endpoint para obtener todos los boxes
app.get('/api/boxes', async (req, res) => {
  const data = await getSheetData();
  const formattedData = formatDataJson(data);
  res.json(formattedData);
});

// Endpoint para obtener un box específico por nombre
app.get('/api/box/:nombre', async (req, res) => {
  const nombre = req.params.nombre;
  const data = await getSheetData();
  const formattedData = formatDataJson(data);
  
  for (const box of formattedData) {
    if (box.nombre.toLowerCase() === nombre.toLowerCase()) {
      return res.json(box);
    }
  }
  
  return res.status(404).json({ error: "Box no encontrado" });
});

// Página de inicio con información básica sobre la API
app.get('/', (req, res) => {
  res.send(`
    <h1>API de HackTheBox</h1>
    <p>Endpoints disponibles:</p>
    <ul>
      <li>/api/boxes - Obtener todos los boxes</li>
      <li>/api/box/&lt;nombre&gt; - Obtener un box específico por nombre</li>
    </ul>
  `);
});

// Iniciar el servidor en el puerto 80
const PORT = 80;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
