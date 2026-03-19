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

const UNITA_OPTIONS = Object.keys(UNITA_MISURA_FORMULE) as UnitàMisura[];

// ---- MAPPATURA UNITÀ DI MISURA ----
function normalizzaUM(raw: string): UnitàMisura | null {
  const v = raw.toLowerCase().trim();
  const map: Record<string, UnitàMisura> = {
    mq: 'mq', 'm2': 'mq', 'm²': 'mq',
    ml: 'ml', 'm': 'ml', 'ml.': 'ml',
    mc: 'mc', 'm3': 'mc', 'm³': 'mc',
    kg: 'kg', 'chilogrammi': 'kg',
    q: 'q', 'quintali': 'q',
    t: 't', 'ton': 't', 'tonnellate': 't',
    nr: 'nr', 'n': 'nr', 'num': 'nr', 'pz': 'nr', 'cad': 'nr', 'cad.': 'nr', 'cadauno': 'nr',
    hh: 'hh', 'ore': 'hh', 'h': 'hh',
  };
  return map[v] || null;
}

function parsePrezzo(raw: string): number {
  const cleaned = raw.replace(/[€$£\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ---- PARSER CSV SPECIFICO PER Prezzario-Articolo-2026 ----
async function parseCSV(file: File): Promise<{ voci: VocePrezzario[]; errori: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      const lines = text.split(/\r?\n|\r/).filter(l => l.trim());
      if (lines.length < 2) { resolve({ voci: [], errori: ['File vuoto o non valido'] }); return; }

      // Rileva separatore
      const sep = (lines[0].match(/\|/g) || []).length > (lines[0].match(/;/g) || []).length ? '|' : ';';

      // Parse header
      const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

      // Trova indici colonne
      const iCodice = headers.findIndex(h => h === 'codice');
      const iUM = headers.findIndex(h => h.includes('unit') && h.includes('misura') || h === 'um' || h === 'u.m.');
      const iPrezzo = headers.findIndex(h => h === 'prezzo' && !h.includes('senza') && !h.includes('unitario'));
      // Descrizione: priorità Articolo (descrizione specifica completa) > Descrizione > Voce (breve) > Tipologia
      const iArticolo = headers.findIndex(h => h === 'articolo');
      const iDescrizioneBase = headers.findIndex(h => h === 'descrizione');
      const iVoce = headers.findIndex(h => h === 'voce');
      const iTipologia = headers.findIndex(h => h.includes('tipologia') || h.includes('famiglia'));
      const iCapitolo = headers.findIndex(h => h === 'capitolo');

      const errori: string[] = [];
      const voci: VocePrezzario[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split rispettando le virgolette
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let ci = 0; ci < line.length; ci++) {
          const ch = line[ci];
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === sep && !inQuotes) { cells.push(current.trim()); current = ''; }
          else { current += ch; }
        }
        cells.push(current.trim());

        const get = (idx: number) => (cells[idx] || '').replace(/^"|"$/g, '').trim();

        // Codice
        const codice = iCodice >= 0 ? get(iCodice) : '';
        if (!codice) continue; // salta righe senza codice

        // Descrizione: priorità Articolo (specifica e completa) > Descrizione > Voce (breve) > Tipologia > Capitolo
        let descrizione = '';
        if (iArticolo >= 0) descrizione = get(iArticolo);
        if (!descrizione && iDescrizioneBase >= 0) descrizione = get(iDescrizioneBase);
        if (!descrizione && iVoce >= 0) descrizione = get(iVoce);
        if (!descrizione && iTipologia >= 0) descrizione = get(iTipologia);
        if (!descrizione && iCapitolo >= 0) descrizione = get(iCapitolo);
        if (!descrizione) { errori.push(`Riga ${i + 1}: descrizione mancante`); continue; }

        // Unità di misura
        const umRaw = iUM >= 0 ? get(iUM) : '';
        const unitaMisura = normalizzaUM(umRaw);
        if (!unitaMisura) { errori.push(`Riga ${i + 1}: UM "${umRaw}" non riconosciuta`); continue; }

        // Prezzo: colonna "Prezzo" (non "Prezzo senza S.G.")
        const prezzoRaw = iPrezzo >= 0 ? get(iPrezzo) : '';
        const prezzoUnitario = parsePrezzo(prezzoRaw);
        if (prezzoUnitario <= 0) { errori.push(`Riga ${i + 1}: prezzo non valido "${prezzoRaw}"`); continue; }

        // Categoria dalla tipologia
        const categoria = iTipologia >= 0 ? get(iTipologia) : undefined;

        voci.push({ id: uuidv4(), codice, descrizione, unitaMisura, prezzoUnitario, categoria: categoria || undefined });
      }

      resolve({ voci, errori });
    };
    reader.readAsText(file, 'UTF-8');
  });
}

// ---- FORM AGGIUNTA/MODIFICA VOCE ----
function VoceForm({ voce, onSave, onCancel }: { voce: Partial<VocePrezzario>; onSave: (v: VocePrezzario) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    codice: voce.codice ?? '',
    descrizione: voce.descrizione ?? '',
    unitaMisura: voce.unitaMisura ?? ('mq' as UnitàMisura),
    prezzoUnitario: voce.prezzoUnitario ?? 0,
    categoria: voce.categoria ?? '',
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
          <label className="text-xs font-medium text-gray-600 mb-1 block">Categoria</label>
          <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="es: Demolizioni" className="h-8 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Descrizione *</label>
        <Input value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Descrizione della lavorazione" className="h-8 text-sm" />
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
        <Button size="sm" onClick={() => valid && onSave({ id: voce.id ?? uuidv4(), codice: form.codice.trim(), descrizione: form.descrizione.trim(), unitaMisura: form.unitaMisura, prezzoUnitario: form.prezzoUnitario, categoria: form.categoria.trim() || undefined })} disabled={!valid}><Check className="h-3 w-3 mr-1" />Salva</Button>
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 15;

  const voci = state.prezzario;

  const filtered = useCallback(() => {
    if (!searchTerm.trim()) return voci;
    const s = searchTerm.toLowerCase();
    return voci.filter(v => v.codice.toLowerCase().includes(s) || v.descrizione.toLowerCase().includes(s) || (v.categoria ?? '').toLowerCase().includes(s));
  }, [voci, searchTerm])();

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const persist = (updated: VocePrezzario[]) => {
    dispatch({ type: 'SET_PREZZARIO', payload: updated });
    localStorage.setItem('prezzario', JSON.stringify(updated));
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
      setImportResult({ vociImportate: 0, errori: ['Errore durante il parsing del file'] });
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
              {/* Import CSV */}
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
          {/* Risultato import */}
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

          {/* Form aggiunta */}
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
                <Input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Cerca per codice, descrizione o categoria..." className="pl-9 h-9 text-sm" />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-28">Codice</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Descrizione</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-32 hidden md:table-cell">Categoria</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">U.M.</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Prezzo €</th>
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
                        <tr key={voce.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-blue-600 text-xs">{voce.codice}</td>
                          <td className="px-3 py-2 text-gray-800 text-xs">{voce.descrizione}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs hidden md:table-cell">{voce.categoria ?? '—'}</td>
                          <td className="px-3 py-2 text-center"><Badge variant="outline" className="text-xs">{voce.unitaMisura}</Badge></td>
                          <td className="px-3 py-2 text-right font-medium">€ {voce.prezzoUnitario.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => { setEditingId(voce.id); setShowAddForm(false); }} className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleDelete(voce.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
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
