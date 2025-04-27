const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// Configuración de Google Sheets
const SHEET_ID = "1dzvaGlT_0xnT-PGO27Z_4prHgA8PHIpErmoWdlUrSoA";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY;
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
    const rows = data.values.slice(4);
    
    for (const row of rows) {
      if (row.length >= 7) {
        const nombre = row[0] || '';
        const ip = row[1] || '';
        const os = row[2] || '';
        const dificultad = row[3] || '';
        const tecnicas = row[4]?.includes("\n") ? row[4].replace(/\n/g, ", ") : row[4] || '';
        const certificaciones = row[5]?.includes("\n") ? row[5].replace(/\n/g, ", ") : row[5] || '';
        const writeup = row[6]?.includes("\n") ? row[6].replace(/\n/g, ", ") : row[6] || '';
        
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

// Mapeo de dificultades en español e inglés
const dificultadMap = {
  fácil: 'easy',
  easy: 'easy',
  medio: 'medium',
  media: 'medium',
  medium: 'medium',
  difícil: 'hard',
  dificil: 'hard',
  hard: 'hard',
  insano: 'insane',
  insane: 'insane'
};

/**
 * Normaliza el término de dificultad a un valor estándar
 */
function normalizeDificultad(dificultad) {
  return dificultadMap[dificultad.toLowerCase()] || dificultad.toLowerCase();
}

// Configurar rutas
app.get('/api/boxes', async (req, res) => {
  const data = await getSheetData();
  if (data.error) {
    return res.status(500).json(data);
  }
  const formattedData = formatDataJson(data);
  res.json(formattedData);
});

app.get('/api/box/:nombre', async (req, res) => {
  const nombre = req.params.nombre;
  const data = await getSheetData();
  if (data.error) {
    return res.status(500).json(data);
  }
  const formattedData = formatDataJson(data);
  
  const box = formattedData.find(box => box.nombre.toLowerCase() === nombre.toLowerCase());
  if (box) {
    return res.json(box);
  }
  return res.status(404).json({ error: "Box no encontrado" });
});

app.get('/api/certs/:certificacion', async (req, res) => {
  const certificacion = req.params.certificacion;
  const data = await getSheetData();
  if (data.error) {
    return res.status(500).json(data);
  }
  const formattedData = formatDataJson(data);
  
  const matchingBoxes = formattedData.filter(box => 
    box.certificaciones.toLowerCase().includes(certificacion.toLowerCase())
  );
  
  if (matchingBoxes.length > 0) {
    return res.json(matchingBoxes);
  }
  return res.status(404).json({ error: `No se encontraron boxes con la certificación "${certificacion}"` });
});

// Nuevo endpoint: Filtrar boxes por dificultad
app.get('/api/dificultad/:dificultad', async (req, res) => {
  const dificultad = req.params.dificultad;
  const normalizedDificultad = normalizeDificultad(dificultad);
  const data = await getSheetData();
  if (data.error) {
    return res.status(500).json(data);
  }
  const formattedData = formatDataJson(data);
  
  // Filtrar boxes cuya dificultad normalizada coincida
  const matchingBoxes = formattedData.filter(box => 
    normalizeDificultad(box.Dificultad) === normalizedDificultad
  );
  
  if (matchingBoxes.length > 0) {
    return res.json(matchingBoxes);
  }
  return res.status(404).json({ error: `No se encontraron boxes con la dificultad "${dificultad}"` });
});

app.get('/', (req, res) => {
  res.send(`
    <h1>API de HackTheBox</h1>
    <p>Endpoints disponibles:</p>
    <ul>
      <li>/api/boxes - Obtener todos los boxes</li>
      <li>/api/box/<nombre> - Obtener un box específico por nombre</li>
      <li>/api/certs/<certificacion> - Obtener todos los boxes con una certificación específica (ej. OSCP)</li>
      <li>/api/dificultad/<dificultad> - Obtener todos los boxes con una dificultad específica (ej. Fácil, Easy, Media, Medium, Difícil, Hard)</li>
    </ul>
  `);
});

// Exportar la app de Express para Vercel
module.exports = app;

// Solo para desarrollo local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  });
}
