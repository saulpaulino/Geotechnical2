// ============================================================
// GEOTECHNICAL MARKET INTEL — Google Apps Script Web App
// ============================================================
// INSTRUCCIONES DE INSTALACIÓN:
// 1. Abre tu Google Sheet
// 2. Menú: Extensiones → Apps Script
// 3. Borra todo el contenido y pega ESTE código completo
// 4. Cambia SHEET_ID por el ID de tu Google Sheet (el número/letra en la URL)
// 5. Haz clic en "Implementar" → "Nueva implementación"
//    - Tipo: Aplicación web
//    - Ejecutar como: Yo (tu cuenta)
//    - Quién tiene acceso: Cualquier usuario (anyone)
// 6. Copia la URL que aparece → pégala en el campo "Apps Script URL" del app
// ============================================================

const SHEET_ID = '1j4DGQ714-02DBAVaH2AvMTlQDd2wxzqfdMhxOjWIwKA';

// Columnas de la pestaña Pipeline
const PIPELINE_HEADERS = [
  'ID', 'Titulo', 'Fuente', 'Tipo', 'Region', 'Provincia',
  'Valor Estimado', 'Prob. Voladura (%)', 'Fecha Deteccion', 'Inicio Estimado',
  'Status', 'Descripcion', 'Señales', 'Competidores', 'AI Insight',
  'Prioridad', 'Contacto', 'URL Fuente', 'Ultima Actualizacion'
];

// ─── Manejador principal POST ─────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // ── Guardar proyectos al Pipeline ──────────────────────
    if (payload.action === 'appendPipeline') {
      const projects = payload.projects || [];
      if (!projects.length) {
        return jsonResponse({ success: true, added: 0 });
      }

      let sheet = ss.getSheetByName('Pipeline');
      if (!sheet) {
        sheet = ss.insertSheet('Pipeline');
        sheet.appendRow(PIPELINE_HEADERS);
        sheet.getRange(1, 1, 1, PIPELINE_HEADERS.length)
          .setBackground('#A63D40')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      // IDs existentes para evitar duplicados
      const data = sheet.getDataRange().getValues();
      const existingIds = data.slice(1).map(r => String(r[0])).filter(Boolean);

      let added = 0;
      projects.forEach(p => {
        const pid = String(p.id || '');
        if (pid && existingIds.includes(pid)) return; // skip duplicado

        sheet.appendRow([
          p.id            || '',
          p.title         || '',
          p.source        || 'Scanner AI',
          p.type          || '',
          p.region        || '',
          p.province      || '',
          p.estimatedValue      || 0,
          p.blastingProbability || 0,
          p.detectedDate  || new Date().toISOString().split('T')[0],
          p.estimatedStart || '',
          p.status        || 'detectado',
          p.description   || '',
          Array.isArray(p.signals)     ? p.signals.join('; ')     : (p.signals     || ''),
          Array.isArray(p.competitors) ? p.competitors.join('; ') : (p.competitors || ''),
          p.aiInsight     || '',
          p.priority      || 'medium',
          p.contactLead   || '',
          p.url_fuente    || '',
          new Date().toISOString()
        ]);
        added++;
      });

      // Formato condicional por prioridad (color fila)
      if (added > 0) applyPriorityFormatting(sheet);

      return jsonResponse({ success: true, added, total: projects.length });
    }

    return jsonResponse({ success: false, error: 'Unknown action' });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ─── GET: leer Pipeline (para Make.com si lo necesita) ─────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Pipeline');
    if (!sheet) return jsonResponse({ success: true, projects: [] });

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return jsonResponse({ success: true, projects: [] });

    const projects = data.slice(1)
      .filter(r => r[1]) // tiene título
      .map(r => ({
        id:                   String(r[0] || ''),
        title:                String(r[1] || ''),
        source:               String(r[2] || ''),
        type:                 String(r[3] || ''),
        region:               String(r[4] || ''),
        province:             String(r[5] || ''),
        estimatedValue:       parseFloat(r[6])  || 0,
        blastingProbability:  parseInt(r[7])    || 0,
        detectedDate:         String(r[8] || ''),
        estimatedStart:       String(r[9] || ''),
        status:               String(r[10] || 'detectado'),
        description:          String(r[11] || ''),
        signals:     r[12] ? String(r[12]).split(';').map(s => s.trim()).filter(Boolean) : [],
        competitors: r[13] ? String(r[13]).split(';').map(s => s.trim()).filter(Boolean) : [],
        aiInsight:            String(r[14] || ''),
        priority:             String(r[15] || 'medium'),
        contactLead:          String(r[16] || ''),
        url_fuente:           String(r[17] || '')
      }));

    return jsonResponse({ success: true, projects });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ─── Formato de color por prioridad ────────────────────────
function applyPriorityFormatting(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const priorityCol = 16; // columna P = índice 15
    const colors = { critical: '#FFF0F0', high: '#FFF8EE', medium: '#F0F8FF', low: '#F8F8F8' };
    for (let i = 1; i < data.length; i++) {
      const prio = String(data[i][priorityCol - 1] || '').toLowerCase();
      const color = colors[prio] || '#FFFFFF';
      sheet.getRange(i + 1, 1, 1, PIPELINE_HEADERS.length).setBackground(color);
    }
  } catch (e) { /* ignore formatting errors */ }
}

// ─── Helper: respuesta JSON ─────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
