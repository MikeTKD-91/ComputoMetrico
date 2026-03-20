import { useState, useCallback, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/AppContext';
import { UNITA_MISURA_FORMULE } from '@/types';
import type { VocePrezzario, UnitàMisura } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { salvaPrezzarioDB } from '@/store/db';

const UNITA_OPTIONS = Object.keys(UNITA_MISURA_FORMULE) as UnitàMisura[];

// ---- MAPPATURA UNITÀ DI MISURA ----
function normalizzaUM(raw: string): UnitàMisura | null {
  const v = raw.toLowerCase().trim();
  const map: Record<string, UnitàMisura> = {
    // superfici
    mq: 'mq', 'm2': 'mq', 'm²': 'mq', 'mq/cm': 'mq', 'mq∕cm': 'mq',
    'mq/30gg': 'mq', 'mq/30 gg': 'mq', mqxm: 'mq', mqxmesi: 'mq',
    'mq di base': 'mq', mxm: 'mq', ha: 'mq', 'ha ragguagl': 'mq',
    // metro lineare
    ml: 'ml', 'm': 'ml', 'ml.': 'ml', cm: 'ml', 'cm.': 'ml',
    'm/30gg': 'ml', 'm/30 gg': 'ml', mlxgg: 'ml',
    // volumi
    mc: 'mc', 'm3': 'mc', 'm³': 'mc', dm3: 'mc', dmc: 'mc',
    'mc/30gg': 'mc', 'mc/km': 'mc', 'mc/miglia': 'mc',
    'mc/ 5km': 'mc', 'mc/ 50m': 'mc',
    // peso
    kg: 'kg', 'chilogrammi': 'kg', 'g': 'kg', 'gr': 'kg', 'grammi': 'kg', '100 kg': 'kg',
    q: 'q', 'quintali': 'q', ql: 'q', 'quintale': 'q', 'q.li': 'q', 'q.': 'q',
    t: 't', 'ton': 't', 'tonnellate': 't', txkm: 't',
    // tempo
    hh: 'hh', 'ore': 'hh', 'h': 'hh', 'ora': 'hh',
    // numero / cadauno
    nr: 'nr', 'n': 'nr', 'num': 'nr', 'pz': 'nr',
    'cad': 'nr', 'cad.': 'nr', 'cadauno': 'nr',
    'cad/30gg': 'nr', 'cad/gg': 'nr',
    'cp': 'nr', 'capo': 'nr', 'coppia': 'nr',
    'a corpo': 'nr', 'corpo': 'nr', 'ac': 'nr', 'a c': 'nr', 'a buca': 'nr',
    'cs': 'nr', 'gg': 'nr', 'gnt/30gg': 'nr', 'file/100m': 'nr', 'kn': 'nr',
    // liquidi -> nr
    'l': 'nr', 'lt': 'nr', 'litri': 'nr', 'litro': 'nr',
    // varie
    '%': 'nr', 'percentuale': 'nr',
  };
  return map[v] || null;
}

function parsePrezzo(raw: string): number {
  if (!raw || raw.trim() === '') return 0;
  
  // Rimuovi valute e spazi
  let cleaned = raw.replace(/[€$£\s]/g, '').trim();
  
  // Gestisci formati: 1.000,50 (italiano) vs 1,000.50 (anglo)
  // Se ha sia virgola che punto, è formato con separatori di migliaia
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // Entrambi presenti: usa l'ultimo come decimale
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato italiano: 1.000,50
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato anglo: 1,000.50
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Solo virgola: potrebbe essere decimale italiano o separatore
    // Se dopo virgola ci sono esattamente 2-3 cifre, è decimale
    const parts = cleaned.split(',');
    if (parts[1]?.length === 2 || parts[1]?.length === 3) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // Altrimenti è separatore di migliaia
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // Se solo punto: potrebbe essere sia separatore che decimale, lo lasceremo così
  
  const n = parseFloat(cleaned);
  return isNaN(n) || n < 0 ? 0 : n;
}

// ---- PARSER CSV - supporta separatore \n\r (Prezzario-Articolo-2026) ----
async function parseCSV(file: File): Promise<{ voci: VocePrezzario[]; errori: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ voci: [], errori: ['Errore di lettura file'] });
    };
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        if (!raw) { resolve({ voci: [], errori: ['File vuoto'] }); return; }

        // Leggi come ArrayBuffer per gestire correttamente \n\r (sequenza invertita)
        const text = (typeof raw === 'string' ? raw : new TextDecoder('utf-8').decode(raw as ArrayBuffer)).replace(/^\uFEFF/, '');

        // Il file Prezzario-Articolo-2026 usa \n\r come terminatore di riga (invertito!)
        // Quindi splittiamo su \n\r; fallback su \r\n o \n
        let lines: string[];
        if (text.includes('\n\r')) {
          lines = text.split('\n\r').map(l => l.trim()).filter(l => l.length > 0);
        } else {
          lines = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(l => l.length > 0);
        }

        if (lines.length < 2) { resolve({ voci: [], errori: ['File vuoto o non valido'] }); return; }

        // Rileva separatore (| o ; o ,)
        const pipeCount = (lines[0].match(/\|/g) || []).length;
        const semiCount = (lines[0].match(/;/g) || []).length;
        const commaCount = (lines[0].match(/,/g) || []).length;
        const sep = pipeCount > semiCount && pipeCount > commaCount ? '|' : semiCount > commaCount ? ';' : ',';

      // Parse header (prima riga, senza quotes)
      const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

      // Trova indici colonne con matching più robusto
      const iCodice      = headers.findIndex(h => h === 'codice' || h === 'code' || h.startsWith('cod'));
      const iUM          = headers.findIndex(h => 
        h === 'um' || h === 'u.m.' || h.includes('unit') || h.includes('misura') || h === 'uom' || h === 'unità di misura'
      );
      
      // Prezzo: ricerca la colonna finale totale
      // Priorità: "prezzo" (senza qualificativi) > "prezzo totale" > altre varianti
      let iPrezzo = -1;
      // Primo: cerca "prezzo" esatto (deve essere l'ultimo possibile, non "prezzo senza s.g.")
      for (let i = headers.length - 1; i >= 0; i--) {
        const h = headers[i];
        if (h === 'prezzo' || h === 'price') {
          iPrezzo = i;
          break;
        }
      }
      // Se non trovato, cerca varianti
      if (iPrezzo < 0) {
        iPrezzo = headers.findIndex(h => 
          h.includes('prezzo totale') || h.includes('totale prezzo') || 
          (h.includes('prezzo') && !h.includes('senza')) || 
          h === 'importo' || h === 'costo'
        );
      }
      
      // Ricerca colonne A, B, C per il calcolo del totale
      // A = prezzo base (senza S.G.)
      // B = utili / margine
      // C = spese generali
      const iA           = headers.findIndex(h => 
        h.includes('prezzo senza') || h.includes('voce a') || h.includes('comp. a') || h.includes('base')
      );
      const iB           = headers.findIndex(h => 
        h.includes('utili') || h.includes('voce b') || h.includes('comp. b') || h.includes('margine')
      );
      const iC           = headers.findIndex(h => 
        h.includes('spese generali') || h.includes('voce c') || h.includes('comp. c')
      );
      
      const iArticolo    = headers.findIndex(h => 
        h === 'articolo' || h === 'description' || h === 'descrizione' || h.includes('articolo')
      );
      const iVoce        = headers.findIndex(h => 
        h === 'voce' || h === 'name' || h === 'title' || h.includes('voce')
      );
      const iTipologia   = headers.findIndex(h => 
        h.includes('tipologia') || h.includes('famiglia') || h.includes('category') || h.includes('categoria')
      );
      const iCapitolo    = headers.findIndex(h => 
        h === 'capitolo' || h === 'chapter' || h.includes('capitolo')
      );

      // Debug: verifica se sono state trovate le colonne critiche
      if (iCodice < 0 || iUM < 0) {
        const erroriHeader = [];
        if (iCodice < 0) erroriHeader.push('Colonna "codice" non trovata');
        if (iUM < 0) erroriHeader.push('Colonna "unit. misura" non trovata');
        // Prezzo può essere: colonna diretta oppure somma di A+B+C
        if (iPrezzo < 0 && (iA < 0 || iB < 0 || iC < 0)) {
          erroriHeader.push('Colonna "prezzo" non trovata, e nemmeno A+B+C');
        }
        erroriHeader.push(`Header trovato: ${headers.join(' | ')}`);
        resolve({ voci: [], errori: erroriHeader });
        return;
      }

      // Funzione per fare il split CSV rispettando le virgolette
      function splitCSVLine(line: string, delimiter: string): string[] {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let ci = 0; ci < line.length; ci++) {
          const ch = line[ci];
          if (ch === '"') {
            if (inQuotes && line[ci + 1] === '"') { current += '"'; ci++; }
            else { inQuotes = !inQuotes; }
          } else if (ch === delimiter && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        cells.push(current.trim());
        return cells;
      }

      const errori: string[] = [];
      const voci: VocePrezzario[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = splitCSVLine(line, sep);
        const get = (idx: number) => idx >= 0 && idx < cells.length ? cells[idx].replace(/^"|"$/g, '').trim() : '';

        const codice = get(iCodice);
        if (!codice) continue;

        // Descrizione completa = Articolo (testo tecnico completo)
        let descrizione = iArticolo >= 0 ? get(iArticolo) : '';
        if (!descrizione) descrizione = iVoce >= 0 ? get(iVoce) : '';
        if (!descrizione) descrizione = iTipologia >= 0 ? get(iTipologia) : '';
        if (!descrizione) { errori.push(`Riga ${i + 1}: descrizione mancante`); continue; }

        // Voce breve (titolo sintetico)
        const voceBreve = iVoce >= 0 ? get(iVoce) : '';

        // Categoria = Tipologia / Famiglia
        const categoria = iTipologia >= 0 ? get(iTipologia) : undefined;

        // Sotto-categoria = Capitolo
        const sottoCategoria = iCapitolo >= 0 ? get(iCapitolo) : undefined;

        // Unità di misura
        const umRaw = iUM >= 0 ? get(iUM) : '';
        const unitaMisura = normalizzaUM(umRaw);
        if (!unitaMisura) { 
          errori.push(`Riga ${i + 1}: UM "${umRaw}" non riconosciuta (valori validi: mq, ml, mc, kg, q, t, nr, hh)`); 
          continue; 
        }

        // Prezzo: preferibilmente prezzo diretto, altrimenti somma A+B+C
        let prezzoUnitario = 0;
        
        if (iPrezzo >= 0) {
          // Se esiste colonna prezzo, usala
          const prezzoRaw = get(iPrezzo);
          prezzoUnitario = parsePrezzo(prezzoRaw);
        }
        
        // Se prezzo è 0 (o non trovato) e abbiamo A, B, C: sommali
        if (prezzoUnitario <= 0 && iA >= 0 && iB >= 0 && iC >= 0) {
          const a = parsePrezzo(get(iA));
          const b = parsePrezzo(get(iB));
          const c = parsePrezzo(get(iC));
          prezzoUnitario = a + b + c;
        }
        
        if (prezzoUnitario <= 0) { 
          const prezzoRaw = iPrezzo >= 0 ? get(iPrezzo) : '(nessun valore)';
          if (iA >= 0 && iB >= 0 && iC >= 0) {
            const a = get(iA);
            const b = get(iB);
            const c = get(iC);
            errori.push(`Riga ${i + 1}: prezzo non valido - Prezzo: "${prezzoRaw}", A: "${a}", B: "${b}", C: "${c}"`);
          } else {
            errori.push(`Riga ${i + 1}: prezzo non valido "${prezzoRaw}" (ricevuto: ${prezzoUnitario})`);
          }
          continue; 
        }

        voci.push({
          id: uuidv4(),
          codice,
          descrizione,
          voceBreve,
          unitaMisura,
          prezzoUnitario,
          categoria: categoria || undefined,
          sottoCategoria: sottoCategoria || undefined,
        });
      }

      resolve({ voci, errori });
      } catch (err) {
        resolve({ voci: [], errori: [`Errore parsing: ${err instanceof Error ? err.message : String(err)}`] });
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}

// ---- FORM AGGIUNTA/MODIFICA VOCE ----
function VoceForm({ voce, onSave, onCancel }: { voce: Partial<VocePrezzario>; onSave: (v: VocePrezzario) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    codice: voce.codice ?? '',
    voceBreve: voce.voceBreve ?? '',
    descrizione: voce.descrizione ?? '',
    unitaMisura: voce.unitaMisura ?? ('mq' as UnitàMisura),
    prezzoUnitario: voce.prezzoUnitario ?? 0,
    categoria: voce.categoria ?? '',
    sottoCategoria: voce.sottoCategoria ?? '',
  });
  const valid = form.codice.trim() && form.descrizione.trim() && form.prezzoUnitario > 0;

  return (
    <div className="border rounded-lg p-4 bg-blue-50 space-y-3 mb-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Codice *</label>
          <Input value={form.codice} onChange={e => setForm(f => ({ ...f, codice: e.target.value }))} placeholder="es: DEM.001" className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Voce (titolo breve)</label>
          <Input value={form.voceBreve} onChange={e => setForm(f => ({ ...f, voceBreve: e.target.value }))} placeholder="es: Demolizione muratura" className="h-8 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Descrizione completa (Articolo) *</label>
        <textarea
          value={form.descrizione}
          onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
          placeholder="Descrizione tecnica completa della lavorazione..."
          className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Categoria (Tipologia)</label>
          <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="es: Demolizioni" className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Sotto-categoria (Capitolo)</label>
          <Input value={form.sottoCategoria} onChange={e => setForm(f => ({ ...f, sottoCategoria: e.target.value }))} placeholder="es: Demolizione strutture" className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Unità di misura *</label>
          <select value={form.unitaMisura} onChange={e => setForm(f => ({ ...f, unitaMisura: e.target.value as UnitàMisura }))} className="w-full h-8 px-2 text-sm border rounded bg-white">
            {UNITA_OPTIONS.map(u => <option key={u} value={u}>{u} — {UNITA_MISURA_FORMULE[u].descrizione}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Prezzo unitario (€) *</label>
          <Input type="number" value={form.prezzoUnitario || ''} onChange={e => setForm(f => ({ ...f, prezzoUnitario: parseFloat(e.target.value) || 0 }))} placeholder="0.00" className="h-8 text-sm" step="0.01" min="0" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X className="h-3 w-3 mr-1" />Annulla</Button>
        <Button size="sm" onClick={() => valid && onSave({
          id: voce.id ?? uuidv4(),
          codice: form.codice.trim(),
          voceBreve: form.voceBreve.trim(),
          descrizione: form.descrizione.trim(),
          unitaMisura: form.unitaMisura,
          prezzoUnitario: form.prezzoUnitario,
          categoria: form.categoria.trim() || undefined,
          sottoCategoria: form.sottoCategoria.trim() || undefined,
        })} disabled={!valid}><Check className="h-3 w-3 mr-1" />Salva</Button>
      </div>
    </div>
  );
}

// ---- COMPONENTE PRINCIPALE ----
export function ImportaPrezzario() {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ vociImportate: number; errori: string[] } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 15;

  const voci = state.prezzario;

  const filtered = useCallback(() => {
    if (!searchTerm.trim()) return voci;
    const s = searchTerm.toLowerCase();
    return voci.filter(v =>
      v.codice.toLowerCase().includes(s) ||
      v.descrizione.toLowerCase().includes(s) ||
      (v.voceBreve ?? '').toLowerCase().includes(s) ||
      (v.categoria ?? '').toLowerCase().includes(s) ||
      (v.sottoCategoria ?? '').toLowerCase().includes(s)
    );
  }, [voci, searchTerm])();

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const persist = (updated: VocePrezzario[]) => {
    dispatch({ type: 'SET_PREZZARIO', payload: updated });
    salvaPrezzarioDB(updated).catch(console.error);
  };

  const handleAdd = (v: VocePrezzario) => { persist([...voci, v]); setShowAddForm(false); };
  const handleEdit = (v: VocePrezzario) => { persist(voci.map(p => p.id === v.id ? v : p)); setEditingId(null); };
  const handleDelete = (id: string) => { if (confirm('Eliminare questa voce?')) persist(voci.filter(p => p.id !== id)); };
  const handleClearAll = () => { if (confirm('Eliminare TUTTO il prezzario?')) persist([]); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { voci: nuove, errori } = await parseCSV(file);
      if (nuove.length > 0) {
        const merged = [...voci, ...nuove];
        persist(merged);
      }
      setImportResult({ vociImportate: nuove.length, errori });
    } catch (err) {
      setImportResult({ vociImportate: 0, errori: ['Errore durante il parsing del file: ' + (err instanceof Error ? err.message : String(err))] });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">Prezzario</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{voci.length} voci</Badge>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                Importa CSV
              </Button>
              {voci.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearAll} className="text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-3 w-3 mr-1" />Svuota
                </Button>
              )}
              <Button size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); }}>
                <Plus className="h-3 w-3 mr-1" />Aggiungi voce
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {importResult && (
            <div className={`mb-4 p-3 rounded-lg border text-sm ${importResult.vociImportate > 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="font-medium mb-1">
                {importResult.vociImportate > 0 ? `✓ ${importResult.vociImportate} voci importate con successo` : '✗ Nessuna voce importata'}
              </div>
              {importResult.errori.length > 0 && (
                <div className="text-xs mt-1 space-y-0.5 max-h-24 overflow-auto">
                  {importResult.errori.slice(0, 10).map((e, i) => <div key={i} className="flex gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />{e}</div>)}
                  {importResult.errori.length > 10 && <div>...e altri {importResult.errori.length - 10} errori</div>}
                </div>
              )}
              <button onClick={() => setImportResult(null)} className="mt-1 text-xs underline opacity-70 hover:opacity-100">Chiudi</button>
            </div>
          )}

          {showAddForm && <VoceForm voce={{}} onSave={handleAdd} onCancel={() => setShowAddForm(false)} />}

          {voci.length === 0 && !showAddForm ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">Prezzario vuoto</p>
              <p className="text-sm mt-1">Importa un file CSV o aggiungi voci manualmente.</p>
              <p className="text-xs mt-2 text-gray-400">Formato supportato: Prezzario-Articolo-2026.csv (separatore |)</p>
            </div>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Cerca per codice, voce, descrizione, categoria..." className="pl-9 h-9 text-sm" />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-36">Codice</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Voce / Descrizione</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-40 hidden lg:table-cell">Categoria / Capitolo</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-14">U.M.</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Prezzo €</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nessun risultato per "{searchTerm}"</td></tr>
                    ) : paginated.map(voce => (
                      editingId === voce.id ? (
                        <tr key={voce.id}><td colSpan={6} className="px-3 py-2"><VoceForm voce={voce} onSave={handleEdit} onCancel={() => setEditingId(null)} /></td></tr>
                      ) : (
                        <>
                          <tr
                            key={voce.id}
                            className="border-t hover:bg-gray-50 cursor-pointer"
                            onClick={() => setExpandedId(expandedId === voce.id ? null : voce.id)}
                          >
                            <td className="px-3 py-2 font-mono text-blue-600 text-xs align-top">{voce.codice}</td>
                            <td className="px-3 py-2 align-top">
                              <div className="font-medium text-xs text-gray-800">{voce.voceBreve || voce.descrizione.slice(0, 80)}</div>
                              {expandedId === voce.id && (
                                <div className="mt-1 text-xs text-gray-600 bg-blue-50 rounded p-2 leading-relaxed">
                                  {voce.descrizione}
                                </div>
                              )}
                              {!expandedId || expandedId !== voce.id ? (
                                <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{voce.descrizione.slice(0, 100)}…</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 align-top hidden lg:table-cell">
                              {voce.categoria && <div className="text-xs text-gray-700 font-medium">{voce.categoria}</div>}
                              {voce.sottoCategoria && <div className="text-xs text-gray-500 mt-0.5">{voce.sottoCategoria}</div>}
                            </td>
                            <td className="px-3 py-2 text-center align-top"><Badge variant="outline" className="text-xs">{voce.unitaMisura}</Badge></td>
                            <td className="px-3 py-2 text-right font-medium align-top text-sm">€ {voce.prezzoUnitario.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center align-top">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={e => { e.stopPropagation(); setEditingId(voce.id); setShowAddForm(false); }} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={e => { e.stopPropagation(); handleDelete(voce.id); }} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        </>
                      )
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                  <span>{filtered.length} voci{searchTerm ? ` (filtrate su ${voci.length})` : ''}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <span>Pag. {currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
