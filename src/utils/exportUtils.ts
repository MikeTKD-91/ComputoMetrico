import * as XLSX from 'xlsx';
import type { Computo, VocePrezzario } from '@/types';
import { UNITA_MISURA_FORMULE } from '@/types';

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
  
  computo.categorie.forEach(categoria => {
    // Aggiungi riga categoria
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
    
    // Aggiungi righe della categoria
    const righeCategoria = computo.righe.filter(r => r.categoriaId === categoria.id);
    righeCategoria.forEach(riga => {
      excelRows.push({
        'N.': riga.numero,
        'Codice': riga.codice,
        'Descrizione': riga.descrizione,
        'U.M.': riga.unitaMisura,
        'Lunghezza (m)': riga.lunghezza?.toString() || '',
        'Larghezza (m)': riga.larghezza?.toString() || '',
        'Altezza (m)': riga.altezza?.toString() || '',
        'Quantità': riga.quantita,
        'Prezzo unitario (€)': riga.prezzoUnitario,
        'Importo (€)': riga.importo,
        'Note': riga.note || '',
      });
    });
    
    // Aggiungi totale categoria
    const totaleCategoria = righeCategoria.reduce((sum, r) => sum + r.importo, 0);
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
    { wch: 5 },   // N.
    { wch: 12 },  // Codice
    { wch: 50 },  // Descrizione
    { wch: 8 },   // U.M.
    { wch: 12 },  // Lunghezza
    { wch: 12 },  // Larghezza
    { wch: 12 },  // Altezza
    { wch: 12 },  // Quantità
    { wch: 15 },  // Prezzo
    { wch: 15 },  // Importo
    { wch: 30 },  // Note
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
// ESPORTAZIONE PDF
// ============================================

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Inizializza pdfmake con i font
const pdfMakeAny = pdfMake as any;
pdfMakeAny.vfs = pdfFonts;

export function esportaComputoPDF(computo: Computo): void {
  const contenuto: any[] = [];
  
  // === HEADER ===
  contenuto.push(
    { text: 'COMPUTO METRICO ESTIMATIVO', style: 'header', margin: [0, 0, 0, 20] },
    {
      table: {
        widths: ['30%', '70%'],
        body: [
          ['Cliente:', computo.intestazione.cliente || '-'],
          ['Indirizzo:', computo.intestazione.indirizzo || '-'],
          ['Oggetto:', computo.intestazione.oggetto || '-'],
          ['Data:', new Date(computo.intestazione.data).toLocaleDateString('it-IT')],
        ],
      },
      margin: [0, 0, 0, 20],
    },
    { text: '', margin: [0, 10, 0, 10] }
  );
  
  // === TABELLA COMPUTI ===
  const tableBody: any[][] = [
    [
      { text: 'N.', bold: true, fillColor: '#e5e7eb' },
      { text: 'Codice', bold: true, fillColor: '#e5e7eb' },
      { text: 'Descrizione', bold: true, fillColor: '#e5e7eb' },
      { text: 'U.M.', bold: true, fillColor: '#e5e7eb' },
      { text: 'Lung.', bold: true, fillColor: '#e5e7eb' },
      { text: 'Larg.', bold: true, fillColor: '#e5e7eb' },
      { text: 'Alt.', bold: true, fillColor: '#e5e7eb' },
      { text: 'Quant.', bold: true, fillColor: '#e5e7eb' },
      { text: 'Prezzo €', bold: true, fillColor: '#e5e7eb' },
      { text: 'Importo €', bold: true, fillColor: '#e5e7eb' },
    ],
  ];
  
  let totaleGenerale = 0;
  
  computo.categorie.forEach(categoria => {
    // Riga categoria
    tableBody.push([
      { text: '', fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
      { text: categoria.nome.toUpperCase(), bold: true, fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
      { text: '', fillColor: '#f3f4f6' },
    ]);
    
    // Righe della categoria
    const righeCategoria = computo.righe.filter(r => r.categoriaId === categoria.id);
    righeCategoria.forEach(riga => {
      tableBody.push([
        riga.numero,
        riga.codice,
        riga.descrizione,
        riga.unitaMisura,
        riga.lunghezza?.toFixed(2) || '',
        riga.larghezza?.toFixed(2) || '',
        riga.altezza?.toFixed(2) || '',
        riga.quantita.toFixed(2),
        riga.prezzoUnitario.toFixed(2),
        riga.importo.toFixed(2),
      ]);
    });
    
    // Totale categoria
    const totaleCategoria = righeCategoria.reduce((sum, r) => sum + r.importo, 0);
    totaleGenerale += totaleCategoria;
    
    tableBody.push([
      { text: '', fillColor: '#f9fafb' },
      { text: '', fillColor: '#f9fafb' },
      { text: `Totale ${categoria.nome}`, bold: true, fillColor: '#f9fafb' },
      { text: '', fillColor: '#f9fafb' },
      { text: '', fillColor: '#f9fafb' },
      { text: '', fillColor: '#f9fafb' },
      { text: '', fillColor: '#f9fafb' },
      { text: '', fillColor: '#f9fafb' },
      { text: '', fillColor: '#f9fafb' },
      { text: totaleCategoria.toFixed(2), bold: true, fillColor: '#f9fafb' },
    ]);
    
    // Riga vuota
    tableBody.push(['', '', '', '', '', '', '', '', '', '']);
  });
  
  // Totale generale
  tableBody.push([
    { text: '', fillColor: '#e5e7eb' },
    { text: '', fillColor: '#e5e7eb' },
    { text: 'TOTALE GENERALE', bold: true, fillColor: '#e5e7eb' },
    { text: '', fillColor: '#e5e7eb' },
    { text: '', fillColor: '#e5e7eb' },
    { text: '', fillColor: '#e5e7eb' },
    { text: '', fillColor: '#e5e7eb' },
    { text: '', fillColor: '#e5e7eb' },
    { text: '', fillColor: '#e5e7eb' },
    { text: totaleGenerale.toFixed(2), bold: true, fillColor: '#e5e7eb' },
  ]);
  
  contenuto.push({
    table: {
      headerRows: 1,
      widths: ['4%', '10%', '26%', '6%', '8%', '8%', '8%', '8%', '10%', '12%'],
      body: tableBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0.5,
      hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#000' : '#ccc',
      vLineColor: () => '#ccc',
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  });
  
  // === DOCUMENTO ===
  const docDefinition = {
    content: contenuto,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
      },
    },
    defaultStyle: {
      fontSize: 8,
    },
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [20, 20, 20, 20],
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
