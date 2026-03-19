import Papa from 'papaparse';
import type { VocePrezzario, UnitàMisura, ParsingResult } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mappa le possibili intestazioni CSV alle nostre chiavi
 */
const HEADER_MAPPINGS: Record<string, string> = {
  // Codice
  'codice': 'codice',
  'code': 'codice',
  'cod': 'codice',
  'id': 'codice',
  'n.': 'codice',
  'numero': 'codice',
  'cam': 'cam',
  'capitolo': 'capitolo',
  'voce': 'voceNumero',
  'articolo': 'articolo',
  
  // Descrizione
  'descrizione': 'descrizione',
  'description': 'descrizione',
  'desc': 'descrizione',
  'lavorazione': 'descrizione',
  'tipologia / famiglia': 'tipologiaFamiglia',
  'tipologia/famiglia': 'tipologiaFamiglia',
  'tipologia': 'tipologiaFamiglia',
  'famiglia': 'tipologiaFamiglia',
  
  // Unità di misura
  'unita': 'unitaMisura',
  'unità': 'unitaMisura',
  'um': 'unitaMisura',
  'u.m.': 'unitaMisura',
  'unita_misura': 'unitaMisura',
  'unità_misura': 'unitaMisura',
  'unit': 'unitaMisura',
  'unità di misura': 'unitaMisura',
  
  // Prezzo
  'prezzo': 'prezzoUnitario',
  'prezzo_unitario': 'prezzoUnitario',
  'price': 'prezzoUnitario',
  'costo': 'prezzoUnitario',
  'tariffa': 'prezzoUnitario',
  'importo': 'prezzoUnitario',
  'eur': 'prezzoUnitario',
  '€': 'prezzoUnitario',
};

/**
 * Normalizza l'unità di misura
 */
function normalizzaUnitaMisura(valore: string): UnitàMisura | null {
  const normalizzato = valore.toLowerCase().trim();
  
  const mappature: Record<string, UnitàMisura> = {
    // Metri quadrati
    'mq': 'mq',
    'm2': 'mq',
    'm²': 'mq',
    'mc2': 'mq',
    'metri_quadrati': 'mq',
    'metri quadrati': 'mq',
    'sqm': 'mq',
    
    // Metri lineari
    'ml': 'ml',
    'm': 'ml',
    'metri': 'ml',
    'metri_lineari': 'ml',
    'metri lineari': 'ml',
    'linear_meter': 'ml',
    
    // Metri cubi
    'mc': 'mc',
    'm3': 'mc',
    'm³': 'mc',
    'mc3': 'mc',
    'metri_cubi': 'mc',
    'metri cubi': 'mc',
    'cubic_meter': 'mc',
    
    // Chilogrammi
    'kg': 'kg',
    'chilogrammi': 'kg',
    'chilogrammo': 'kg',
    
    // Quintali
    'q': 'q',
    'quintali': 'q',
    'quintale': 'q',
    
    // Tonnellate
    't': 't',
    'ton': 't',
    'tonnellate': 't',
    'tonnellata': 't',
    
    // Numero
    'nr': 'nr',
    'n': 'nr',
    'numero': 'nr',
    'num': 'nr',
    'pz': 'nr',
    'pezzi': 'nr',
    'cad': 'nr',
    'cad.': 'nr',
    'each': 'nr',
    
    // Ore uomo
    'hh': 'hh',
    'ore': 'hh',
    'ora': 'hh',
    'h': 'hh',
    'hour': 'hh',
    'man_hour': 'hh',
    'ore_uomo': 'hh',
    'ore uomo': 'hh',
  };
  
  return mappature[normalizzato] || null;
}

/**
 * Parsa il prezzo da stringa
 */
function parsePrezzo(valore: string): number {
  // Rimuovi simboli di valuta e spazi
  const pulito = valore
    .replace(/[€$£]/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '') // Rimuovi separatori migliaia
    .replace(/,/g, '.'); // Converti decimale
  
  const numero = parseFloat(pulito);
  return isNaN(numero) ? 0 : numero;
}

/**
 * Rileva il separatore del CSV analizzando la prima riga
 */
function rilevaSeparatore(contenuto: string): string {
  const primaRiga = contenuto.split('\n')[0] || '';
  
  // Conta occorrenze dei possibili separatori
  const pipeCount = (primaRiga.match(/\|/g) || []).length;
  const semicolonCount = (primaRiga.match(/;/g) || []).length;
  const commaCount = (primaRiga.match(/,/g) || []).length;
  const tabCount = (primaRiga.match(/\t/g) || []).length;
  
  // Restituisci il separatore più frequente (se ce ne sono almeno 2)
  const counts = [
    { sep: '|', count: pipeCount },
    { sep: ';', count: semicolonCount },
    { sep: ',', count: commaCount },
    { sep: '\t', count: tabCount },
  ];
  
  const best = counts.sort((a, b) => b.count - a.count)[0];
  return best.count >= 2 ? best.sep : ';'; // Default a ; se non rilevato
}

/**
 * Costruisce il codice completo dal formato gerarchico
 */
function costruisciCodice(row: any, headerMap: Record<string, string>, headers: string[]): string {
  // Cerca i componenti del codice
  const camHeader = headers.find(h => headerMap[h] === 'cam');
  const tipologiaHeader = headers.find(h => headerMap[h] === 'tipologiaFamiglia');
  const capitoloHeader = headers.find(h => headerMap[h] === 'capitolo');
  const voceHeader = headers.find(h => headerMap[h] === 'voceNumero');
  const articoloHeader = headers.find(h => headerMap[h] === 'articolo');
  const codiceHeader = headers.find(h => headerMap[h] === 'codice');
  
  // Se c'è un codice esplicito, usalo
  if (codiceHeader) {
    const codice = String(row[codiceHeader] || '').trim();
    if (codice) return codice;
  }
  
  // Altrimenti costruisci dai componenti
  const parti: string[] = [];
  
  if (camHeader) {
    const cam = String(row[camHeader] || '').trim();
    if (cam) parti.push(cam);
  }
  
  if (tipologiaHeader) {
    const tipologia = String(row[tipologiaHeader] || '').trim();
    if (tipologia) parti.push(tipologia);
  }
  
  if (capitoloHeader) {
    const capitolo = String(row[capitoloHeader] || '').trim();
    if (capitolo) parti.push(capitolo);
  }
  
  if (voceHeader) {
    const voce = String(row[voceHeader] || '').trim();
    if (voce) parti.push(voce);
  }
  
  if (articoloHeader) {
    const articolo = String(row[articoloHeader] || '').trim();
    if (articolo) parti.push(articolo);
  }
  
  return parti.join('.');
}

/**
 * Estrae la descrizione dalle varie colonne possibili
 */
function estraiDescrizione(row: any, headerMap: Record<string, string>, headers: string[]): string {
  // Prima cerca una colonna descrizione esplicita
  const descrizioneHeader = headers.find(h => headerMap[h] === 'descrizione');
  if (descrizioneHeader) {
    const desc = String(row[descrizioneHeader] || '').trim();
    if (desc) return desc;
  }
  
  // Altrimenti usa Tipologia / Famiglia
  const tipologiaHeader = headers.find(h => headerMap[h] === 'tipologiaFamiglia');
  if (tipologiaHeader) {
    const tipologia = String(row[tipologiaHeader] || '').trim();
    if (tipologia) return tipologia;
  }
  
  // Ultima risorsa: Voce
  const voceHeader = headers.find(h => headerMap[h] === 'voceNumero');
  if (voceHeader) {
    const voce = String(row[voceHeader] || '').trim();
    if (voce) return voce;
  }
  
  return '';
}

/**
 * Tipo per il callback di progresso
 */
export type ProgressCallback = (progress: {
  righeTotali: number;
  righeProcessate: number;
  percentuale: number;
  vociValide: number;
}) => void;

/**
 * Importa prezzario da CSV con supporto per file grandi e callback di progresso
 */
export async function importaPrezzarioCSV(
  file: File,
  onProgress?: ProgressCallback
): Promise<{
  result: ParsingResult;
  voci: VocePrezzario[];
}> {
  return new Promise((resolve) => {
    const errori: string[] = [];
    
    // Leggi il file per rilevare il separatore
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenuto = String(e.target?.result || '');
      const separatore = rilevaSeparatore(contenuto);
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: separatore,
        quoteChar: '"',
        encoding: 'UTF-8',
        // Usa chunk per file grandi
        chunkSize: 1024 * 1024, // 1MB per chunk
        step: undefined, // Processa tutto in una volta per semplicità
        complete: (results) => {
          if (results.data.length === 0) {
            resolve({
              result: { success: false, vociImportate: 0, errori: ['File CSV vuoto'] },
              voci: [],
            });
            return;
          }
          
          // Mappa le intestazioni (normalizzate in lowercase)
          const headers = results.meta.fields || [];
          const headerMap: Record<string, string> = {};
          
          headers.forEach(header => {
            const normalizzato = header.toLowerCase().trim();
            if (HEADER_MAPPINGS[normalizzato]) {
              headerMap[header] = HEADER_MAPPINGS[normalizzato];
            }
          });
          
          // Verifica campi obbligatori (con maggiore flessibilità)
          const campiTrovati = new Set(Object.values(headerMap));
          const haCodice = campiTrovati.has('codice') || campiTrovati.has('cam') || campiTrovati.has('capitolo');
          const haDescrizione = campiTrovati.has('descrizione') || campiTrovati.has('tipologiaFamiglia');
          const haUnitaMisura = campiTrovati.has('unitaMisura');
          const haPrezzo = campiTrovati.has('prezzoUnitario');
          
          if (!haCodice) {
            errori.push('Colonna codice (o CAM/Capitolo) non trovata nel CSV');
          }
          if (!haDescrizione) {
            errori.push('Colonna descrizione (o Tipologia/Famiglia) non trovata nel CSV');
          }
          if (!haUnitaMisura) {
            errori.push('Colonna "unità di misura" non trovata nel CSV');
          }
          if (!haPrezzo) {
            errori.push('Colonna "prezzo" non trovata nel CSV');
          }
          
          if (errori.length > 0 && !haCodice && !haDescrizione) {
            resolve({
              result: { success: false, vociImportate: 0, errori },
              voci: [],
            });
            return;
          }
          
          // Parsa le righe in batch per non bloccare la UI
          const voci: VocePrezzario[] = [];
          const data = results.data as any[];
          const batchSize = 1000; // Processa 1000 righe alla volta
          let currentIndex = 0;
          
          const processBatch = () => {
            const endIndex = Math.min(currentIndex + batchSize, data.length);
            
            for (let i = currentIndex; i < endIndex; i++) {
              const row = data[i];
              const rigaNumero = i + 2; // +2 perché header è riga 1
              
              // Estrai i valori
              const codice = costruisciCodice(row, headerMap, headers);
              const descrizione = estraiDescrizione(row, headerMap, headers);
              
              const unitaHeader = headers.find(h => headerMap[h] === 'unitaMisura');
              const unitaRaw = unitaHeader ? String(row[unitaHeader] || '').trim() : '';
              
              const prezzoHeader = headers.find(h => headerMap[h] === 'prezzoUnitario');
              const prezzoRaw = prezzoHeader ? String(row[prezzoHeader] || '').trim() : '';
              
              // Validazione
              if (!codice) {
                errori.push(`Riga ${rigaNumero}: codice mancante`);
                continue;
              }
              
              if (!descrizione) {
                errori.push(`Riga ${rigaNumero}: descrizione mancante`);
                continue;
              }
              
              const unitaMisura = normalizzaUnitaMisura(unitaRaw);
              if (!unitaMisura) {
                errori.push(`Riga ${rigaNumero}: unità di misura "${unitaRaw}" non riconosciuta`);
                continue;
              }
              
              const prezzoUnitario = parsePrezzo(prezzoRaw);
              if (prezzoUnitario <= 0) {
                errori.push(`Riga ${rigaNumero}: prezzo non valido "${prezzoRaw}"`);
                continue;
              }
              
              const voceHdr = headers.find(h => headerMap[h] === 'voceNumero');
              const voceBreve = voceHdr ? String(row[voceHdr] || '').trim() : '';

              const capitoloHdr = headers.find(h => headerMap[h] === 'capitolo');
              const sottoCategoria = capitoloHdr ? String(row[capitoloHdr] || '').trim() || undefined : undefined;

              const tipologiaHdr = headers.find(h => headerMap[h] === 'tipologiaFamiglia');
              const categoria = tipologiaHdr ? String(row[tipologiaHdr] || '').trim() || undefined : undefined;

              voci.push({
                id: uuidv4(),
                codice,
                descrizione,
                voceBreve,
                unitaMisura,
                prezzoUnitario,
                categoria,
                sottoCategoria,
              });
            }
            
            currentIndex = endIndex;
            
            // Notifica progresso
            if (onProgress) {
              onProgress({
                righeTotali: data.length,
                righeProcessate: currentIndex,
                percentuale: Math.round((currentIndex / data.length) * 100),
                vociValide: voci.length,
              });
            }
            
            // Continua con il prossimo batch o termina
            if (currentIndex < data.length) {
              // Usa setTimeout per dare respiro alla UI
              setTimeout(processBatch, 0);
            } else {
              // Completato
              resolve({
                result: {
                  success: voci.length > 0,
                  vociImportate: voci.length,
                  errori,
                },
                voci,
              });
            }
          };
          
          // Avvia il processing
          processBatch();
        },
        error: (error) => {
          resolve({
            result: {
              success: false,
              vociImportate: 0,
              errori: [`Errore parsing CSV: ${error.message}`],
            },
            voci: [],
          });
        },
      });
    };
    
    reader.readAsText(file);
  });
}

/**
 * Esporta prezzario in CSV
 */
export function esportaPrezzarioCSV(voci: VocePrezzario[]): string {
  const data = voci.map(v => ({
    Codice: v.codice,
    Descrizione: v.descrizione,
    'Unità di misura': v.unitaMisura,
    'Prezzo unitario (€)': v.prezzoUnitario.toFixed(2),
  }));
  
  return Papa.unparse(data, {
    delimiter: ';',
    header: true,
  });
}

/**
 * Salva prezzario nel localStorage
 */
export function salvaPrezzario(voci: VocePrezzario[]): void {
  localStorage.setItem('prezzario', JSON.stringify(voci));
}

/**
 * Carica prezzario dal localStorage
 */
export function caricaPrezzario(): VocePrezzario[] {
  try {
    const data = localStorage.getItem('prezzario');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}