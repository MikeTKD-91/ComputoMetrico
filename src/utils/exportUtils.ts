import * as XLSX from 'xlsx';
import type { Computo, VocePrezzario } from '@/types';
import { UNITA_MISURA_FORMULE } from '@/types';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Inizializza pdfmake con i font
const pdfMakeAny = pdfMake as any;
pdfMakeAny.vfs = pdfFonts;

// ============================================
// ESPORTAZIONE EXCEL
// ============================================
interface ExcelRow {
  'N.': number;
  'Codice': string;
  'Descrizione': string;
  'U.M.': string;
  'Lunghezza (m)': string;
  'Larghezza (m)': string;
  'Altezza (m)': string;
  'Quantità': number;
  'Prezzo unitario (€)': number;
  'Importo (€)': number;
  'Note': string;
}

export function esportaComputoExcel(computo: Computo): void {
  const wb = XLSX.utils.book_new();

  // === FOGLIO 1: Intestazione ===
  const intestazioneData = [
    ['COMPUTO METRICO ESTIMATIVO'],
    [],
    ['Cliente:', computo.intestazione.cliente],
    ['Indirizzo:', computo.intestazione.indirizzo],
    ['Oggetto:', computo.intestazione.oggetto],
    ['Data:', new Date(computo.intestazione.data).toLocaleDateString('it-IT')],
    ['Numero:', computo.intestazione.numero || '-'],
    [],
  ];

  const wsIntestazione = XLSX.utils.aoa_to_sheet(intestazioneData);
  XLSX.utils.book_append_sheet(wb, wsIntestazione, 'Intestazione');

  // === FOGLIO 2: Computo completo ===
  const excelRows: ExcelRow[] = [];

  // Raggruppa categorie per padre/figlio
  const categoriePadre = computo.categorie.filter(c => !c.parentId);
  const categorieFiglie = computo.categorie.filter(c => c.parentId);

  categoriePadre.forEach(categoria => {
    // Aggiungi riga categoria principale
    excelRows.push({
      'N.': 0,
      'Codice': '',
      'Descrizione': `CATEGORIA: ${categoria.nome.toUpperCase()}`,
      'U.M.': '',
      'Lunghezza (m)': '',
      'Larghezza (m)': '',
      'Altezza (m)': '',
      'Quantità': 0,
      'Prezzo unitario (€)': 0,
      'Importo (€)': 0,
      'Note': '',
    });

    // Aggiungi righe della categoria principale
    const righeCategoria = computo.righe.filter(r => r.categoriaId === categoria.id);
    righeCategoria.forEach(riga => {
      excelRows.push({
        'N.': riga.numero,
        'Codice': riga.codice,
        'Descrizione': riga.descrizione,
        'U.M.': riga.unitaMisura,
        'Lunghezza (m)': riga.misurazioni.length > 0 ? riga.misurazioni.map(m => m.lunghezza ?? '').join(', ') : '',
        'Larghezza (m)': riga.misurazioni.length > 0 ? riga.misurazioni.map(m => m.larghezza ?? '').join(', ') : '',
        'Altezza (m)': riga.misurazioni.length > 0 ? riga.misurazioni.map(m => m.altezza ?? '').join(', ') : '',
        'Quantità': riga.quantita,
        'Prezzo unitario (€)': riga.prezzoUnitario,
        'Importo (€)': riga.importo,
        'Note': riga.note || '',
      });
    });

    // Sottocategorie
    const sottocategorie = categorieFiglie.filter(s => s.parentId === categoria.id);
    sottocategorie.forEach(sottoCat => {
      // Riga sottocategoria
      excelRows.push({
        'N.': 0,
        'Codice': '',
        'Descrizione': `  └─ ${sottoCat.nome.toUpperCase()}`,
        'U.M.': '',
        'Lunghezza (m)': '',
        'Larghezza (m)': '',
        'Altezza (m)': '',
        'Quantità': 0,
        'Prezzo unitario (€)': 0,
        'Importo (€)': 0,
        'Note': '',
      });

      // Righe della sottocategoria
      const righeSottoCat = computo.righe.filter(r => r.categoriaId === sottoCat.id);
      righeSottoCat.forEach(riga => {
        excelRows.push({
          'N.': riga.numero,
          'Codice': riga.codice,
          'Descrizione': `    ${riga.descrizione}`,
          'U.M.': riga.unitaMisura,
          'Lunghezza (m)': riga.misurazioni.length > 0 ? riga.misurazioni.map(m => m.lunghezza ?? '').join(', ') : '',
          'Larghezza (m)': riga.misurazioni.length > 0 ? riga.misurazioni.map(m => m.larghezza ?? '').join(', ') : '',
          'Altezza (m)': riga.misurazioni.length > 0 ? riga.misurazioni.map(m => m.altezza ?? '').join(', ') : '',
          'Quantità': riga.quantita,
          'Prezzo unitario (€)': riga.prezzoUnitario,
          'Importo (€)': riga.importo,
          'Note': riga.note || '',
        });
      });

      // Totale sottocategoria
      const totaleSottoCat = righeSottoCat.reduce((sum, r) => sum + r.importo, 0);
      if (totaleSottoCat > 0) {
        excelRows.push({
          'N.': 0,
          'Codice': '',
          'Descrizione': `  TOTALE ${sottoCat.nome}`,
          'U.M.': '',
          'Lunghezza (m)': '',
          'Larghezza (m)': '',
          'Altezza (m)': '',
          'Quantità': 0,
          'Prezzo unitario (€)': 0,
          'Importo (€)': totaleSottoCat,
          'Note': '',
        });
      }
    });

    // Aggiungi totale categoria (inclusi sottototali)
    const righeSotto = sottocategorie.flatMap(sotto => computo.righe.filter(r => r.categoriaId === sotto.id));
    const totaleCategoria = righeCategoria.reduce((sum, r) => sum + r.importo, 0) + righeSotto.reduce((sum, r) => sum + r.importo, 0);
    excelRows.push({
      'N.': 0,
      'Codice': '',
      'Descrizione': `TOTALE ${categoria.nome}`,
      'U.M.': '',
      'Lunghezza (m)': '',
      'Larghezza (m)': '',
      'Altezza (m)': '',
      'Quantità': 0,
      'Prezzo unitario (€)': 0,
      'Importo (€)': totaleCategoria,
      'Note': '',
    });

    // Riga vuota
    excelRows.push({
      'N.': 0,
      'Codice': '',
      'Descrizione': '',
      'U.M.': '',
      'Lunghezza (m)': '',
      'Larghezza (m)': '',
      'Altezza (m)': '',
      'Quantità': 0,
      'Prezzo unitario (€)': 0,
      'Importo (€)': 0,
      'Note': '',
    });
  });

  // Aggiungi totale generale
  const totaleGenerale = computo.righe.reduce((sum, r) => sum + r.importo, 0);
  excelRows.push({
    'N.': 0,
    'Codice': '',
    'Descrizione': 'TOTALE GENERALE',
    'U.M.': '',
    'Lunghezza (m)': '',
    'Larghezza (m)': '',
    'Altezza (m)': '',
    'Quantità': 0,
    'Prezzo unitario (€)': 0,
    'Importo (€)': totaleGenerale,
    'Note': '',
  });

  const wsComputo = XLSX.utils.json_to_sheet(excelRows);
  
  // Formatta colonne
  const colWidths = [
    { wch: 5 },  // N.
    { wch: 12 }, // Codice
    { wch: 50 }, // Descrizione
    { wch: 8 },  // U.M.
    { wch: 12 }, // Lunghezza
    { wch: 12 }, // Larghezza
    { wch: 12 }, // Altezza
    { wch: 12 }, // Quantità
    { wch: 15 }, // Prezzo
    { wch: 15 }, // Importo
    { wch: 30 }, // Note
  ];
  wsComputo['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsComputo, 'Computo');

  // === FOGLIO 3: Riepilogo Categorie ===
  const riepilogoData = computo.categorie.map(cat => {
    const righeCat = computo.righe.filter(r => r.categoriaId === cat.id);
    const totale = righeCat.reduce((sum, r) => sum + r.importo, 0);
    return {
      'Categoria': cat.nome,
      'N. righe': righeCat.length,
      'Totale (€)': totale,
    };
  });

  riepilogoData.push({
    'Categoria': 'TOTALE',
    'N. righe': computo.righe.length,
    'Totale (€)': totaleGenerale,
  });

  const wsRiepilogo = XLSX.utils.json_to_sheet(riepilogoData);
  XLSX.utils.book_append_sheet(wb, wsRiepilogo, 'Riepilogo');

  // Salva file
  XLSX.writeFile(wb, `Computo_${computo.nome.replace(/\s+/g, '_')}.xlsx`);
}

export function esportaPrezzarioExcel(prezzario: VocePrezzario[]): void {
  const wb = XLSX.utils.book_new();
  const data = prezzario.map(v => ({
    'Codice': v.codice,
    'Descrizione': v.descrizione,
    'Unità di misura': v.unitaMisura,
    'Prezzo unitario (€)': v.prezzoUnitario,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 50 },
    { wch: 12 },
    { wch: 15 },
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Prezzario');
  XLSX.writeFile(wb, 'Prezzario.xlsx');
}

// ============================================
// ESPORTAZIONE PDF (stile PriMus migliorato)
// ============================================
export function esportaComputoPDF(computo: Computo): void {
  const contenuto: any[] = [];

  // === HEADER ===
  contenuto.push({
    table: {
      widths: ['*', '*'],
      body: [
        [{ text: 'COMPUTO METRICO ESTIMATIVO', bold: true, fontSize: 14, colSpan: 2, alignment: 'center', fillColor: '#1e3a5f', color: 'white' }, {}],
        ['Cliente: ' + (computo.intestazione.cliente || '-'), 'N° ' + (computo.intestazione.numero || '-')],
        ['Oggetto: ' + (computo.intestazione.oggetto || '-'), 'Data: ' + new Date(computo.intestazione.data).toLocaleDateString('it-IT')],
        [{ text: 'Indirizzo: ' + (computo.intestazione.indirizzo || '-'), colSpan: 2 }, {}],
      ]
    },
    margin: [0, 0, 0, 20]
  });

  let totaleGenerale = 0;

  // Raggruppa categorie per padre/figlio
  const categoriePadre = computo.categorie.filter(c => !c.parentId);
  const categorieFiglie = computo.categorie.filter(c => c.parentId);

  categoriePadre.forEach(categoria => {
    const righe = computo.righe.filter(r => r.categoriaId === categoria.id);
    const sottocategorie = categorieFiglie.filter(s => s.parentId === categoria.id);
    const righeSotto = sottocategorie.flatMap(sotto => computo.righe.filter(r => r.categoriaId === sotto.id));
    
    if (righe.length === 0 && righeSotto.length === 0) return;

    // Header categoria principale
    contenuto.push({
      text: categoria.nome.toUpperCase(),
      bold: true,
      fontSize: 10,
      fillColor: '#e8f0fe',
      color: '#1e3a5f',
      margin: [0, 10, 0, 2]
    });

    const tableBody: any[][] = [[
      { text: 'N.', bold: true, fillColor: '#f3f4f6', alignment: 'center' },
      { text: 'Codice', bold: true, fillColor: '#f3f4f6' },
      { text: 'Descrizione', bold: true, fillColor: '#f3f4f6' },
      { text: 'U.M.', bold: true, fillColor: '#f3f4f6', alignment: 'center' },
      { text: 'Quantità', bold: true, fillColor: '#f3f4f6', alignment: 'right' },
      { text: 'Prezzo €', bold: true, fillColor: '#f3f4f6', alignment: 'right' },
      { text: 'Importo €', bold: true, fillColor: '#f3f4f6', alignment: 'right' },
    ]];

    // Righe categoria principale
    righe.forEach((riga, i) => {
      // Riga principale voce
      tableBody.push([
        { text: String(riga.numero), alignment: 'center', fillColor: i % 2 ? '#f9fafb' : 'white' },
        { text: riga.codice, fontSize: 7, fillColor: i % 2 ? '#f9fafb' : 'white' },
        { text: riga.descrizione, fillColor: i % 2 ? '#f9fafb' : 'white' },
        { text: riga.unitaMisura, alignment: 'center', fillColor: i % 2 ? '#f9fafb' : 'white' },
        { text: riga.quantita.toFixed(2), alignment: 'right', fillColor: i % 2 ? '#f9fafb' : 'white' },
        { text: riga.prezzoUnitario.toFixed(2), alignment: 'right', fillColor: i % 2 ? '#f9fafb' : 'white' },
        { text: riga.importo.toFixed(2), alignment: 'right', bold: true, fillColor: i % 2 ? '#f9fafb' : 'white' },
      ]);

      // Righe misurazioni (sotto-righe)
      riga.misurazioni.forEach(mis => {
        const segno = mis.segno === -1 ? '−' : '+';
        tableBody.push([
          { text: segno, alignment: 'center', fontSize: 7, color: mis.segno === -1 ? 'red' : 'green', fillColor: '#fafafa' },
          { text: '', fillColor: '#fafafa' },
          { text: mis.descrizione || '', fontSize: 7, italics: true, fillColor: '#fafafa' },
          { text: '', fillColor: '#fafafa' },
          { text: mis.quantitaParziale !== 0 ? `${Math.abs(mis.quantitaParziale).toFixed(2)}` : '', fontSize: 7, alignment: 'right', fillColor: '#fafafa' },
          { text: '', fillColor: '#fafafa' },
          { text: '', fillColor: '#fafafa' },
        ]);
      });
    });

    // Sottocategorie
    sottocategorie.forEach(sottoCat => {
      const righeSottoCat = computo.righe.filter(r => r.categoriaId === sottoCat.id);
      if (righeSottoCat.length === 0) return;

      // Header sottocategoria
      tableBody.push([
        { text: '', fillColor: '#f0f9ff' },
        { text: '', fillColor: '#f0f9ff' },
        { text: `└─ ${sottoCat.nome}`, bold: true, fontSize: 8, fillColor: '#f0f9ff', color: '#0369a1' },
        { text: '', fillColor: '#f0f9ff' },
        { text: '', fillColor: '#f0f9ff' },
        { text: '', fillColor: '#f0f9ff' },
        { text: '', fillColor: '#f0f9ff' },
      ]);

      righeSottoCat.forEach((riga) => {
        // Riga principale voce sottocategoria
        tableBody.push([
          { text: String(riga.numero), alignment: 'center', fillColor: '#f0f9ff' },
          { text: riga.codice, fontSize: 7, fillColor: '#f0f9ff' },
          { text: `  ${riga.descrizione}`, fontSize: 8, fillColor: '#f0f9ff' },
          { text: riga.unitaMisura, alignment: 'center', fillColor: '#f0f9ff' },
          { text: riga.quantita.toFixed(2), alignment: 'right', fillColor: '#f0f9ff' },
          { text: riga.prezzoUnitario.toFixed(2), alignment: 'right', fillColor: '#f0f9ff' },
          { text: riga.importo.toFixed(2), alignment: 'right', bold: true, fillColor: '#f0f9ff' },
        ]);

        // Righe misurazioni (sotto-righe)
        riga.misurazioni.forEach(mis => {
          const segno = mis.segno === -1 ? '−' : '+';
          tableBody.push([
            { text: segno, alignment: 'center', fontSize: 7, color: mis.segno === -1 ? 'red' : 'green', fillColor: '#f0f9ff' },
            { text: '', fillColor: '#f0f9ff' },
            { text: `  ${mis.descrizione || ''}`, fontSize: 7, italics: true, fillColor: '#f0f9ff' },
            { text: '', fillColor: '#f0f9ff' },
            { text: mis.quantitaParziale !== 0 ? `${Math.abs(mis.quantitaParziale).toFixed(2)}` : '', fontSize: 7, alignment: 'right', fillColor: '#f0f9ff' },
            { text: '', fillColor: '#f0f9ff' },
            { text: '', fillColor: '#f0f9ff' },
          ]);
        });
      });

      // Totale sottocategoria
      const totSotto = righeSottoCat.reduce((s, r) => s + r.importo, 0);
      tableBody.push([
        { text: '', fillColor: '#dbeafe' },
        { text: '', fillColor: '#dbeafe' },
        { text: `Totale ${sottoCat.nome}`, bold: true, fontSize: 8, fillColor: '#dbeafe' },
        { text: '', fillColor: '#dbeafe' },
        { text: '', fillColor: '#dbeafe' },
        { text: '', fillColor: '#dbeafe' },
        { text: totSotto.toFixed(2) + ' €', bold: true, alignment: 'right', fillColor: '#dbeafe' },
      ]);
    });

    const totCat = righe.reduce((s, r) => s + r.importo, 0) + righeSotto.reduce((s, r) => s + r.importo, 0);
    totaleGenerale += totCat;

    // Totale categoria
    tableBody.push([
      { text: '', fillColor: '#dbeafe' },
      { text: '', fillColor: '#dbeafe' },
      { text: `Totale ${categoria.nome}`, bold: true, fillColor: '#dbeafe' },
      { text: '', fillColor: '#dbeafe' },
      { text: '', fillColor: '#dbeafe' },
      { text: '', fillColor: '#dbeafe' },
      { text: totCat.toFixed(2) + ' €', bold: true, alignment: 'right', fillColor: '#dbeafe' },
    ]);

    contenuto.push({
      table: {
        headerRows: 1,
        widths: ['5%', '12%', '*', '7%', '10%', '11%', '13%'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#d1d5db',
        vLineColor: () => '#d1d5db',
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
      margin: [0, 0, 0, 10]
    });
  });

  // TOTALE GENERALE
  contenuto.push({
    table: {
      widths: ['*', 'auto'],
      body: [[
        { text: 'TOTALE GENERALE', bold: true, fontSize: 12, fillColor: '#1e3a5f', color: 'white' },
        { text: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(totaleGenerale), bold: true, fontSize: 12, alignment: 'right', fillColor: '#1e3a5f', color: 'white' },
      ]]
    },
    margin: [0, 10, 0, 0]
  });

  const docDefinition = {
    content: contenuto,
    styles: {
      header: { fontSize: 18, bold: true, alignment: 'center' },
    },
    defaultStyle: { fontSize: 8 },
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [25, 25, 25, 25],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Pagina ${currentPage} di ${pageCount}`,
      alignment: 'right', fontSize: 7, color: '#9ca3af', margin: [25, 10]
    })
  };

  pdfMakeAny.createPdf(docDefinition).download(`Computo_${computo.nome.replace(/\s+/g, '_')}.pdf`);
}

// ============================================
// UTILITY DI FORMATTAZIONE
// ============================================
export function formattaImporto(valore: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valore);
}

export function formattaNumero(valore: number, decimali: number = 2): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
  }).format(valore);
}

export function getDescrizioneUnitaMisura(um: string): string {
  return UNITA_MISURA_FORMULE[um as keyof typeof UNITA_MISURA_FORMULE]?.descrizione || um;
}
