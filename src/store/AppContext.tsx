import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { 
  AppState, 
  Computo, 
  RigaComputo, 
  Misurazione,
  Categoria, 
  VocePrezzario,
  IntestazioneComputo,
  UnitàMisura,
  TotaleCategoria
} from '@/types';
import { UNITA_MISURA_FORMULE } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// STATO INIZIALE
// ============================================

const initialState: AppState = {
  prezzario: [],
  computi: [],
  computoCorrente: null,
  ui: {
    sidebarOpen: true,
    activeTab: 'computo',
    modalAperto: null,
  },
};

// ============================================
// AZIONI
// ============================================

type Action =
  // Prezzario
  | { type: 'SET_PREZZARIO'; payload: VocePrezzario[] }
  | { type: 'ADD_VOCE_PREZZARIO'; payload: VocePrezzario }
  | { type: 'REMOVE_VOCE_PREZZARIO'; payload: string }
  
  // Computi
  | { type: 'SET_COMPUTI'; payload: Computo[] }
  | { type: 'CREATE_COMPUTO'; payload: { nome: string; intestazione: IntestazioneComputo } }
  | { type: 'OPEN_COMPUTO'; payload: string }
  | { type: 'CLOSE_COMPUTO' }
  | { type: 'DELETE_COMPUTO'; payload: string }
  | { type: 'UPDATE_COMPUTO'; payload: { id: string; updates: Partial<Computo> } }
  | { type: 'SAVE_COMPUTO' }
  
  // Categorie
  | { type: 'ADD_CATEGORIA'; payload: { nome: string; descrizione?: string; parentId?: string } }
  | { type: 'UPDATE_CATEGORIA'; payload: { id: string; updates: Partial<Categoria> } }
  | { type: 'DELETE_CATEGORIA'; payload: string }
  | { type: 'REORDER_CATEGORIE'; payload: Categoria[] }
  
  // Righe
  | { type: 'ADD_RIGA'; payload: { categoriaId: string; vocePrezzario?: VocePrezzario } }
  | { type: 'UPDATE_RIGA'; payload: { id: string; updates: Partial<RigaComputo> } }
  | { type: 'DELETE_RIGA'; payload: string }
  | { type: 'DUPLICATE_RIGA'; payload: string }
  | { type: 'REORDER_RIGHE'; payload: RigaComputo[] }
  
  // Misurazioni
  | { type: 'ADD_MISURAZIONE'; payload: { rigaId: string } }
  | { type: 'UPDATE_MISURAZIONE'; payload: { rigaId: string; misurazioneId: string; updates: Partial<Misurazione> } }
  | { type: 'DELETE_MISURAZIONE'; payload: { rigaId: string; misurazioneId: string } }
  | { type: 'MOVE_RIGA'; payload: { id: string; direction: 'up' | 'down'; categoriaId: string } }
  | { type: 'PASTE_MISURAZIONI'; payload: { rigaId: string; misurazioni: Misurazione[] } }
  
  // UI
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_ACTIVE_TAB'; payload: 'computo' | 'prezzario' | 'impostazioni' }
  | { type: 'OPEN_MODAL'; payload: string }
  | { type: 'CLOSE_MODAL' }
  
  // Storage
  | { type: 'LOAD_FROM_STORAGE' }
  | { type: 'CLEAR_ALL' };

// ============================================
// REDUCER
// ============================================

function calculateQuantitaMisurazione(
  unitaMisura: UnitàMisura,
  misurazione: Misurazione
): number {
  const formula = UNITA_MISURA_FORMULE[unitaMisura];
  const partiUguali = misurazione.partiUguali ?? 1;

  // Unità con formule dimensioni (mq, mc, ml, ecc.)
  if (formula.richiedeLunghezza || formula.richiedeLarghezza || formula.richiedeAltezza) {
    const l = misurazione.lunghezza ?? 0;
    const la = misurazione.larghezza ?? 0;
    const a = misurazione.altezza ?? 0;
    if (formula.richiedeLunghezza && l === 0) return 0;
    if (formula.richiedeLarghezza && la === 0) return 0;
    if (formula.richiedeAltezza && a === 0) return 0;
    return formula.formula(l, la, a) * partiUguali;
  }

  // Unità manuali: la quantità viene inserita direttamente dall'utente
  return misurazione.quantitaParziale ?? 0;
}

function calculateQuantitaTotale(unitaMisura: UnitàMisura, misurazioni: Misurazione[]): number {
  if (misurazioni.length === 0) return 0;
  const formula = UNITA_MISURA_FORMULE[unitaMisura];
  if (!formula.richiedeLunghezza && !formula.richiedeLarghezza && !formula.richiedeAltezza) {
    // Unità manuali: somma delle quantità parziali con segno
    return misurazioni.reduce((sum, m) => sum + (m.quantitaParziale * m.segno), 0);
  }
  return misurazioni.reduce((sum, m) => {
    const q = calculateQuantitaMisurazione(unitaMisura, m);
    return sum + (q * m.segno);
  }, 0);
}

function createEmptyMisurazione(): Misurazione {
  return {
    id: uuidv4(),
    descrizione: '',
    segno: 1,
    partiUguali: 1,
    lunghezza: null,
    larghezza: null,
    altezza: null,
    quantitaParziale: 0,
  };
}



function createEmptyRiga(categoriaId: string, numero: number): RigaComputo {
  return {
    id: uuidv4(),
    numero,
    codice: '',
    descrizione: '',
    unitaMisura: 'mq',
    misurazioni: [createEmptyMisurazione()],
    quantita: 0,
    prezzoUnitario: 0,
    importo: 0,
    note: '',
    categoriaId,
  };
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // ==========================================
    // PREZZARIO
    // ==========================================
    case 'SET_PREZZARIO':
      return { ...state, prezzario: action.payload };
      
    case 'ADD_VOCE_PREZZARIO':
      return { 
        ...state, 
        prezzario: [...state.prezzario, action.payload] 
      };
      
    case 'REMOVE_VOCE_PREZZARIO':
      return { 
        ...state, 
        prezzario: state.prezzario.filter(v => v.id !== action.payload) 
      };

    // ==========================================
    // COMPUTI
    // ==========================================
    case 'SET_COMPUTI':
      return { ...state, computi: action.payload };
      
    case 'CREATE_COMPUTO': {
      const nuovoComputo: Computo = {
        id: uuidv4(),
        nome: action.payload.nome,
        intestazione: action.payload.intestazione,
        categorie: [
          { id: uuidv4(), nome: 'Generale', descrizione: 'Lavorazioni generali', ordine: 0 }
        ],
        righe: [],
        dataCreazione: new Date().toISOString(),
        dataModifica: new Date().toISOString(),
      };
      
      const newState = {
        ...state,
        computi: [...state.computi, nuovoComputo],
        computoCorrente: nuovoComputo,
      };
      
      // Salva nel localStorage
      localStorage.setItem('computi', JSON.stringify(newState.computi));
      
      return newState;
    }
    
    case 'OPEN_COMPUTO': {
      const computo = state.computi.find(c => c.id === action.payload);
      return { ...state, computoCorrente: computo || null };
    }
    
    case 'CLOSE_COMPUTO':
      return { ...state, computoCorrente: null };
      
    case 'DELETE_COMPUTO': {
      const newState = {
        ...state,
        computi: state.computi.filter(c => c.id !== action.payload),
        computoCorrente: state.computoCorrente?.id === action.payload ? null : state.computoCorrente,
      };
      localStorage.setItem('computi', JSON.stringify(newState.computi));
      return newState;
    }
    
    case 'UPDATE_COMPUTO': {
      const computiAggiornati = state.computi.map(c =>
        c.id === action.payload.id
          ? { ...c, ...action.payload.updates, dataModifica: new Date().toISOString() }
          : c
      );
      
      const newState = {
        ...state,
        computi: computiAggiornati,
        computoCorrente: state.computoCorrente?.id === action.payload.id
          ? { ...state.computoCorrente, ...action.payload.updates, dataModifica: new Date().toISOString() }
          : state.computoCorrente,
      };
      
      localStorage.setItem('computi', JSON.stringify(newState.computi));
      return newState;
    }
    
    case 'SAVE_COMPUTO': {
      if (!state.computoCorrente) return state;
      
      localStorage.setItem('computi', JSON.stringify(state.computi));
      return state;
    }

    // ==========================================
    // CATEGORIE
    // ==========================================
    case 'ADD_CATEGORIA': {
      if (!state.computoCorrente) return state;
      
      const nuovaCategoria: Categoria = {
        id: uuidv4(),
        nome: action.payload.nome,
        descrizione: action.payload.descrizione,
        ordine: state.computoCorrente.categorie.length,
        parentId: action.payload.parentId,
      };
      
      const computoAggiornato = {
        ...state.computoCorrente,
        categorie: [...state.computoCorrente.categorie, nuovaCategoria],
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }
    
    case 'UPDATE_CATEGORIA': {
      if (!state.computoCorrente) return state;
      
      const computoAggiornato = {
        ...state.computoCorrente,
        categorie: state.computoCorrente.categorie.map(cat =>
          cat.id === action.payload.id ? { ...cat, ...action.payload.updates } : cat
        ),
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }
    
    case 'DELETE_CATEGORIA': {
      if (!state.computoCorrente) return state;
      
      // Sposta tutte le righe nella categoria di default
      const categoriaDefault = state.computoCorrente.categorie[0];
      
      const computoAggiornato = {
        ...state.computoCorrente,
        categorie: state.computoCorrente.categorie.filter(cat => cat.id !== action.payload),
        righe: state.computoCorrente.righe.map(r =>
          r.categoriaId === action.payload ? { ...r, categoriaId: categoriaDefault.id } : r
        ),
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }
    
    case 'REORDER_CATEGORIE': {
      if (!state.computoCorrente) return state;
      
      const computoAggiornato = {
        ...state.computoCorrente,
        categorie: action.payload.map((cat, idx) => ({ ...cat, ordine: idx })),
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }

    // ==========================================
    // RIGHE
    // ==========================================
    case 'ADD_RIGA': {
      if (!state.computoCorrente) return state;
      
      const numeroRiga = state.computoCorrente.righe.length + 1;
      let nuovaRiga = createEmptyRiga(action.payload.categoriaId, numeroRiga);
      
      // Se è stata selezionata una voce dal prezzario
      if (action.payload.vocePrezzario) {
        const voce = action.payload.vocePrezzario;
        nuovaRiga = {
          ...nuovaRiga,
          codice: voce.codice,
          descrizione: voce.descrizione,
          unitaMisura: voce.unitaMisura,
          prezzoUnitario: voce.prezzoUnitario,
          misurazioni: [createEmptyMisurazione()],
        };
      }
      
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: [...state.computoCorrente.righe, nuovaRiga],
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }
    
    case 'UPDATE_RIGA': {
      if (!state.computoCorrente) return state;
      
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: state.computoCorrente.righe.map(r => {
          if (r.id !== action.payload.id) return r;
          
          const updates = { ...action.payload.updates };
          
          // Se cambia l'unità di misura, ricalcola tutte le quantità parziali e il totale
          if (updates.unitaMisura !== undefined) {
            const unitaMisura = updates.unitaMisura;
            const misurazioni = (updates.misurazioni ?? r.misurazioni).map(m => ({
              ...m,
              quantitaParziale: calculateQuantitaMisurazione(unitaMisura, m),
            } as Misurazione));
            updates.misurazioni = misurazioni;
            updates.quantita = calculateQuantitaTotale(unitaMisura, misurazioni);
          }
          
          // Se cambia la lista misurazioni, ricalcola quantità totale
          if (updates.misurazioni !== undefined && updates.unitaMisura === undefined) {
            const unitaMisura = r.unitaMisura;
            updates.quantita = calculateQuantitaTotale(unitaMisura, updates.misurazioni);
          }
          
          // Se cambia quantità o prezzo, ricalcola importo
          if (updates.quantita !== undefined || updates.prezzoUnitario !== undefined) {
            const quantita = updates.quantita ?? r.quantita;
            const prezzo = updates.prezzoUnitario ?? r.prezzoUnitario;
            updates.importo = quantita * prezzo;
          }
          
          return { ...r, ...updates };
        }),
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }
    
    case 'DELETE_RIGA': {
      if (!state.computoCorrente) return state;
      
      const righeFiltrate = state.computoCorrente.righe.filter(r => r.id !== action.payload);
      
      // Rinumera le righe
      const righeRinumerate = righeFiltrate.map((r, idx) => ({
        ...r,
        numero: idx + 1,
      }));
      
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: righeRinumerate,
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }
    
    case 'DUPLICATE_RIGA': {
      if (!state.computoCorrente) return state;
      
      const rigaOriginale = state.computoCorrente.righe.find(r => r.id === action.payload);
      if (!rigaOriginale) return state;
      
      const nuovaRiga: RigaComputo = {
        ...rigaOriginale,
        id: uuidv4(),
        numero: state.computoCorrente.righe.length + 1,
      };
      
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: [...state.computoCorrente.righe, nuovaRiga],
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }
    
    case 'ADD_MISURAZIONE': {
      if (!state.computoCorrente) return state;
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: state.computoCorrente.righe.map(r => {
          if (r.id !== action.payload.rigaId) return r;
          const misurazioni = [...r.misurazioni, createEmptyMisurazione()];
          const quantita = calculateQuantitaTotale(r.unitaMisura, misurazioni);
          return { ...r, misurazioni, quantita, importo: quantita * r.prezzoUnitario };
        }),
        dataModifica: new Date().toISOString(),
      };
      const computiAggiornati = state.computi.map(c => c.id === computoAggiornato.id ? computoAggiornato : c);
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      return { ...state, computi: computiAggiornati, computoCorrente: computoAggiornato };
    }

    case 'UPDATE_MISURAZIONE': {
      if (!state.computoCorrente) return state;
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: state.computoCorrente.righe.map(r => {
          if (r.id !== action.payload.rigaId) return r;
          const misurazioni = r.misurazioni.map(m => {
            if (m.id !== action.payload.misurazioneId) return m;
            const updated: Misurazione = { ...m, ...action.payload.updates };
            updated.quantitaParziale = calculateQuantitaMisurazione(r.unitaMisura, updated);
            return updated;
          });
          const quantita = calculateQuantitaTotale(r.unitaMisura, misurazioni);
          return { ...r, misurazioni, quantita, importo: quantita * r.prezzoUnitario };
        }),
        dataModifica: new Date().toISOString(),
      };
      const computiAggiornati = state.computi.map(c => c.id === computoAggiornato.id ? computoAggiornato : c);
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      return { ...state, computi: computiAggiornati, computoCorrente: computoAggiornato };
    }

    case 'DELETE_MISURAZIONE': {
      if (!state.computoCorrente) return state;
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: state.computoCorrente.righe.map(r => {
          if (r.id !== action.payload.rigaId) return r;
          const misurazioni = r.misurazioni.filter(m => m.id !== action.payload.misurazioneId);
          const quantita = calculateQuantitaTotale(r.unitaMisura, misurazioni);
          return { ...r, misurazioni, quantita, importo: quantita * r.prezzoUnitario };
        }),
        dataModifica: new Date().toISOString(),
      };
      const computiAggiornati = state.computi.map(c => c.id === computoAggiornato.id ? computoAggiornato : c);
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      return { ...state, computi: computiAggiornati, computoCorrente: computoAggiornato };
    }

    case 'REORDER_RIGHE': {
      if (!state.computoCorrente) return state;
      
      const righeRinumerate = action.payload.map((r, idx) => ({
        ...r,
        numero: idx + 1,
      }));
      
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: righeRinumerate,
        dataModifica: new Date().toISOString(),
      };
      
      const computiAggiornati = state.computi.map(c =>
        c.id === computoAggiornato.id ? computoAggiornato : c
      );
      
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      
      return {
        ...state,
        computi: computiAggiornati,
        computoCorrente: computoAggiornato,
      };
    }

    // ==========================================
    // UI
    // ==========================================
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
      };
      
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        ui: { ...state.ui, activeTab: action.payload },
      };
      
    case 'OPEN_MODAL':
      return {
        ...state,
        ui: { ...state.ui, modalAperto: action.payload },
      };
      
    case 'CLOSE_MODAL':
      return {
        ...state,
        ui: { ...state.ui, modalAperto: null },
      };

    // ==========================================
    // STORAGE
    // ==========================================
    case 'LOAD_FROM_STORAGE': {
      try {
        const computiSalvati = localStorage.getItem('computi');
        return {
          ...state,
          computi: computiSalvati ? JSON.parse(computiSalvati) : [],
        };
      } catch (e) {
        console.error('Errore nel caricamento dal localStorage:', e);
        return state;
      }
    }
    
    case 'CLEAR_ALL':
      localStorage.removeItem('computi');
      localStorage.removeItem('prezzario');
      return initialState;

    case 'MOVE_RIGA': {
      if (!state.computoCorrente) return state;
      const { id, direction, categoriaId } = action.payload;
      const tutteRighe = [...state.computoCorrente.righe];
      const righecat = tutteRighe.filter(r => r.categoriaId === categoriaId);
      const idx = righecat.findIndex(r => r.id === id);
      if (idx < 0) return state;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= righecat.length) return state;
      const ai = tutteRighe.indexOf(righecat[idx]);
      const bi = tutteRighe.indexOf(righecat[newIdx]);
      [tutteRighe[ai], tutteRighe[bi]] = [tutteRighe[bi], tutteRighe[ai]];
      const computoAggiornato = { ...state.computoCorrente, righe: tutteRighe, dataModifica: new Date().toISOString() };
      const computiAggiornati = state.computi.map(c => c.id === computoAggiornato.id ? computoAggiornato : c);
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      return { ...state, computi: computiAggiornati, computoCorrente: computoAggiornato };
    }
    case 'PASTE_MISURAZIONI': {
      if (!state.computoCorrente) return state;
      const { rigaId, misurazioni } = action.payload;
      const computoAggiornato = {
        ...state.computoCorrente,
        righe: state.computoCorrente.righe.map(r =>
          r.id === rigaId ? { ...r, misurazioni: [...r.misurazioni, ...misurazioni] } : r
        ),
        dataModifica: new Date().toISOString(),
      };
      const computiAggiornati = state.computi.map(c => c.id === computoAggiornato.id ? computoAggiornato : c);
      localStorage.setItem('computi', JSON.stringify(computiAggiornati));
      return { ...state, computi: computiAggiornati, computoCorrente: computoAggiornato };
    }
    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  
  // Computed values
  totaleGenerale: number;
  totaliPerCategoria: TotaleCategoria[];
  
  // Helpers
  getRighePerCategoria: (categoriaId: string) => RigaComputo[];
  validaRiga: (riga: RigaComputo) => { valida: boolean; errori: string[] };
  exportComputo: (id: string) => void;
  importComputo: (file: File) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Carica dati dal localStorage all'avvio
  React.useEffect(() => {
    dispatch({ type: 'LOAD_FROM_STORAGE' });
    import('@/store/db').then(({ caricaPrezzarioDB }) => {
      caricaPrezzarioDB().then(voci => {
        if (voci.length > 0) dispatch({ type: 'SET_PREZZARIO', payload: voci });
      });
    });
  }, []);

  // Computed values
  const totaleGenerale = useMemo(() => {
    if (!state.computoCorrente) return 0;
    return state.computoCorrente.righe.reduce((sum, r) => sum + r.importo, 0);
  }, [state.computoCorrente?.righe]);

  const totaliPerCategoria = useMemo(() => {
    if (!state.computoCorrente) return [];
    
    return state.computoCorrente.categorie.map(cat => {
      const righeCat = state.computoCorrente!.righe.filter(r => r.categoriaId === cat.id);
      return {
        categoriaId: cat.id,
        categoriaNome: cat.nome,
        totale: righeCat.reduce((sum, r) => sum + r.importo, 0),
        numeroRighe: righeCat.length,
      };
    });
  }, [state.computoCorrente?.categorie, state.computoCorrente?.righe]);

  const getRighePerCategoria = useCallback((categoriaId: string) => {
    if (!state.computoCorrente) return [];
    return state.computoCorrente.righe.filter(r => r.categoriaId === categoriaId);
  }, [state.computoCorrente]);

  const validaRiga = useCallback((riga: RigaComputo) => {
    const errori: string[] = [];
    
    if (!riga.codice.trim()) {
      errori.push('Codice mancante');
    }
    
    if (!riga.descrizione.trim()) {
      errori.push('Descrizione mancante');
    }
    
    if (riga.misurazioni.length === 0) {
      errori.push('Nessuna misurazione');
    }
    
    if (riga.quantita === 0) {
      errori.push('Quantità zero');
    }
    
    if (riga.prezzoUnitario <= 0) {
      errori.push('Prezzo non valido');
    }
    
    return { valida: errori.length === 0, errori };
  }, []);

  const exportComputo = useCallback((id: string) => {
    const computo = state.computi.find(c => c.id === id);
    const blob = new Blob([JSON.stringify(computo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (computo!.nome || 'computo').replace(/\s+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state.computi]);

  const importComputo = useCallback(async (file: File) => {
    const testo = await file.text();
    const computo: Computo = JSON.parse(testo);
    const nuovoComputo = { ...computo, id: uuidv4(), nome: computo.nome + ' (importato)' };
    const nuoviComputi = [...state.computi, nuovoComputo];
    localStorage.setItem('computi', JSON.stringify(nuoviComputi));
    dispatch({ type: 'SET_COMPUTI', payload: nuoviComputi });
  }, [state.computi]);

  const value: AppContextValue = {
    state,
    dispatch,
    totaleGenerale,
    totaliPerCategoria,
    getRighePerCategoria,
    validaRiga,
    exportComputo,
    importComputo,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve essere usato dentro AppProvider');
  }
  return context;
}
