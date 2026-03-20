// ============================================
// TIPI PER COMPUTO METRICO ESTIMATIVO
// ============================================

/**
 * Unità di misura supportate con relative formule di calcolo
 */
export type UnitàMisura = 'mq' | 'ml' | 'mc' | 'kg' | 'q' | 't' | 'nr' | 'hh';

/**
 * Mappatura delle formule di calcolo per unità di misura
 * - mq: Lunghezza × Larghezza
 * - ml: Lunghezza
 * - mc: Lunghezza × Larghezza × Altezza
 * - kg/q/t/nr/hh: Quantità manuale (non calcolabile da misure)
 */
export const UNITA_MISURA_FORMULE: Record<UnitàMisura, { 
  descrizione: string; 
  richiedeLunghezza: boolean;
  richiedeLarghezza: boolean;
  richiedeAltezza: boolean;
  formula: (l: number, la: number, a: number) => number;
}> = {
  mq: {
    descrizione: 'Metri quadrati',
    richiedeLunghezza: true,
    richiedeLarghezza: true,
    richiedeAltezza: false,
    formula: (l, la) => l * la,
  },
  ml: {
    descrizione: 'Metri lineari',
    richiedeLunghezza: true,
    richiedeLarghezza: false,
    richiedeAltezza: false,
    formula: (l) => l,
  },
  mc: {
    descrizione: 'Metri cubi',
    richiedeLunghezza: true,
    richiedeLarghezza: true,
    richiedeAltezza: true,
    formula: (l, la, a) => l * la * a,
  },
  kg: {
    descrizione: 'Chilogrammi',
    richiedeLunghezza: false,
    richiedeLarghezza: false,
    richiedeAltezza: false,
    formula: () => 0,
  },
  q: {
    descrizione: 'Quintali',
    richiedeLunghezza: false,
    richiedeLarghezza: false,
    richiedeAltezza: false,
    formula: () => 0,
  },
  t: {
    descrizione: 'Tonnellate',
    richiedeLunghezza: false,
    richiedeLarghezza: false,
    richiedeAltezza: false,
    formula: () => 0,
  },
  nr: {
    descrizione: 'Numero',
    richiedeLunghezza: false,
    richiedeLarghezza: false,
    richiedeAltezza: false,
    formula: () => 0,
  },
  hh: {
    descrizione: 'Ore uomo',
    richiedeLunghezza: false,
    richiedeLarghezza: false,
    richiedeAltezza: false,
    formula: () => 0,
  },
};

/**
 * Voce del prezzario
 */
export interface VocePrezzario {
  id: string;
  codice: string;
  descrizione: string;        // Articolo: descrizione tecnica completa
  voceBreve: string;          // Voce: titolo breve dell'articolo
  unitaMisura: UnitàMisura;
  prezzoUnitario: number;
  categoria?: string;         // Tipologia / Famiglia
  sottoCategoria?: string;    // Capitolo
}

/**
 * Singola misurazione all'interno di una voce di computo
 * Il segno determina se è positiva (addizione) o negativa (detrazione)
 */
export interface Misurazione {
  id: string;
  descrizione: string; // es: "cucina", "bagno", "detrazioni finestre"
  segno: 1 | -1;       // +1 addizione, -1 sottrazione
  partiUguali: number; // Moltiplicatore (es: 2 parti uguali = 2×)
  lunghezza: number | null;
  larghezza: number | null;
  altezza: number | null;
  quantitaParziale: number; // CALCOLATA
}

/**
 * Riga del computo metrico
 * La quantità è CALCOLATA automaticamente in base all'unità di misura
 */
export interface RigaComputo {
  id: string;
  numero: number;
  codice: string;
  descrizione: string;
  unitaMisura: UnitàMisura;
  // Misurazioni multiple (sostituiscono i singoli campi lunghezza/larghezza/altezza)
  misurazioni: Misurazione[];
  quantita: number; // CALCOLATA: somma algebrica delle quantità parziali
  prezzoUnitario: number;
  importo: number; // quantita × prezzoUnitario
  note?: string;
  categoriaId: string;
}

/**
 * Categoria di lavori nel computo
 */
export interface Categoria {
  id: string;
  nome: string;
  descrizione?: string;
  ordine: number;
}

/**
 * Intestazione del computo
 */
export interface IntestazioneComputo {
  cliente: string;
  indirizzo: string;
  oggetto: string;
  data: string;
  numero?: string;
}

/**
 * Computo completo
 */
export interface Computo {
  id: string;
  nome: string;
  intestazione: IntestazioneComputo;
  categorie: Categoria[];
  righe: RigaComputo[];
  dataCreazione: string;
  dataModifica: string;
}

/**
 * Stato dell'applicazione
 */
export interface AppState {
  // Prezzario caricato
  prezzario: VocePrezzario[];
  
  // Computi esistenti
  computi: Computo[];
  
  // Computo attualmente aperto
  computoCorrente: Computo | null;
  
  // UI State
  ui: {
    sidebarOpen: boolean;
    activeTab: 'computo' | 'prezzario' | 'impostazioni';
    modalAperto: string | null;
  };
}

/**
 * Risultato del parsing CSV
 */
export interface ParsingResult {
  success: boolean;
  vociImportate: number;
  errori: string[];
}

/**
 * Validazione riga
 */
export interface ValidazioneRiga {
  valida: boolean;
  errori: {
    campo: keyof RigaComputo | 'quantita';
    messaggio: string;
  }[];
  warnings: {
    campo: keyof RigaComputo;
    messaggio: string;
  }[];
}

/**
 * Totale per categoria
 */
export interface TotaleCategoria {
  categoriaId: string;
  categoriaNome: string;
  totale: number;
  numeroRighe: number;
}
