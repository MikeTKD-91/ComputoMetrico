import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  AlertCircle,
  Calculator,
  ArrowUp,
  ArrowDown,
  Loader2,
  Search,
  PlusCircle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useApp } from '@/store/AppContext';
import { UNITA_MISURA_FORMULE } from '@/types';
import type { RigaComputo, Misurazione, VocePrezzario, UnitàMisura } from '@/types';
import { formattaImporto, formattaNumero } from '@/utils/exportUtils';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface AutocompletePrezzarioProps {
  value: string;
  onSelect: (voce: VocePrezzario) => void;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function AutocompletePrezzario({ value, onSelect, onChange, disabled }: AutocompletePrezzarioProps) {
  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [filteredVoci, setFilteredVoci] = useState<VocePrezzario[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(value, 150);

  const searchIndex = useMemo(() => {
    const index = new Map<string, VocePrezzario[]>();
    state.prezzario.forEach(voce => {
      const codePrefix = voce.codice.slice(0, 3).toLowerCase();
      if (!index.has(codePrefix)) index.set(codePrefix, []);
      index.get(codePrefix)!.push(voce);
      voce.descrizione.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length >= 3) {
          const prefix = word.slice(0, 3);
          if (!index.has(prefix)) index.set(prefix, []);
          if (!index.get(prefix)!.includes(voce)) index.get(prefix)!.push(voce);
        }
      });
    });
    return index;
  }, [state.prezzario]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      setIsSearching(true);
      requestAnimationFrame(() => {
        const searchTerm = debouncedSearch.toLowerCase();
        let candidates = searchIndex.get(searchTerm.slice(0, 3)) || state.prezzario;
        if (candidates.length < 50) candidates = state.prezzario;
        const filtered = candidates.filter(v => v.codice.toLowerCase().includes(searchTerm) || v.descrizione.toLowerCase().includes(searchTerm)).slice(0, 20);
        setFilteredVoci(filtered);
        setHighlightedIndex(0);
        setIsOpen(filtered.length > 0);
        setIsSearching(false);
      });
    } else { setIsOpen(false); setIsSearching(false); }
  }, [debouncedSearch, state.prezzario, searchIndex]);

  const handleSelect = useCallback((voce: VocePrezzario) => { onSelect(voce); setIsOpen(false); }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(filteredVoci.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filteredVoci[highlightedIndex]) handleSelect(filteredVoci[highlightedIndex]); }
    else if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => debouncedSearch.length >= 2 && filteredVoci.length > 0 && setIsOpen(true)} onKeyDown={handleKeyDown} placeholder="Cerca codice o descrizione..." disabled={disabled} className="w-full pr-8" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">{isSearching ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin" /> : <Search className="h-4 w-4 text-gray-400" />}</div>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-auto">
          <div className="sticky top-0 bg-gray-100 px-3 py-1 text-xs text-gray-500 border-b">{filteredVoci.length} risultati</div>
          {filteredVoci.map((voce, index) => (
            <button key={voce.id} onClick={() => handleSelect(voce)} onMouseEnter={() => setHighlightedIndex(index)} className={`w-full px-3 py-2 text-left border-b last:border-b-0 transition-colors ${index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center justify-between"><span className="font-mono text-sm text-blue-600">{voce.codice}</span><Badge variant="outline" className="text-xs">{voce.unitaMisura}</Badge></div>
              <p className="text-sm text-gray-700 truncate">{voce.descrizione}</p>
              <p className="text-xs text-gray-500">€{voce.prezzoUnitario.toFixed(2)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- RIGA MISURAZIONE ----

interface RigaMisurazioneProps {
  misurazione: Misurazione;
  unitaMisura: UnitàMisura;
  onUpdate: (updates: Partial<Misurazione>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function RigaMisurazione({ misurazione, unitaMisura, onUpdate, onDelete, canDelete }: RigaMisurazioneProps) {
  const formula = UNITA_MISURA_FORMULE[unitaMisura];
  const isManuale = !formula.richiedeLunghezza && !formula.richiedeLarghezza && !formula.richiedeAltezza;
  const isNeg = misurazione.segno === -1;

  return (
    <tr className={`text-xs border-b border-gray-100 ${isNeg ? 'bg-red-50' : 'bg-green-50'}`}>
      <td className="pl-10 pr-1 py-1 w-8">
        <button onClick={() => onUpdate({ segno: isNeg ? 1 : -1 })} title={isNeg ? 'Clicca per positivo' : 'Clicca per detrazione'}
          className={`w-6 h-6 rounded font-bold text-sm flex items-center justify-center transition-colors ${isNeg ? 'bg-red-200 text-red-700 hover:bg-red-300' : 'bg-green-200 text-green-700 hover:bg-green-300'}`}>
          {isNeg ? '−' : '+'}
        </button>
      </td>
      <td className="px-1 py-1">
        <Input value={misurazione.descrizione} onChange={(e) => onUpdate({ descrizione: e.target.value })} placeholder="es: cucina, bagno, detrazioni..." className="h-7 px-2 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-400" />
      </td>
      <td className={`px-1 py-1 w-20 ${!formula.richiedeLunghezza ? 'bg-gray-100' : ''}`}>
        {formula.richiedeLunghezza && <Input type="number" value={misurazione.lunghezza ?? ''} onChange={(e) => onUpdate({ lunghezza: e.target.value ? parseFloat(e.target.value) : null })} placeholder="m" className="h-7 px-2 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-400" step="0.01" />}
      </td>
      <td className={`px-1 py-1 w-20 ${!formula.richiedeLarghezza ? 'bg-gray-100' : ''}`}>
        {formula.richiedeLarghezza && <Input type="number" value={misurazione.larghezza ?? ''} onChange={(e) => onUpdate({ larghezza: e.target.value ? parseFloat(e.target.value) : null })} placeholder="m" className="h-7 px-2 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-400" step="0.01" />}
      </td>
      <td className={`px-1 py-1 w-20 ${!formula.richiedeAltezza ? 'bg-gray-100' : ''}`}>
        {formula.richiedeAltezza && <Input type="number" value={misurazione.altezza ?? ''} onChange={(e) => onUpdate({ altezza: e.target.value ? parseFloat(e.target.value) : null })} placeholder="m" className="h-7 px-2 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-400" step="0.01" />}
      </td>
      <td className="px-2 py-1 w-24">
        {isManuale ? (
          <Input type="number" value={misurazione.quantitaParziale || ''} onChange={(e) => onUpdate({ quantitaParziale: e.target.value ? parseFloat(e.target.value) : 0 })} placeholder="qtà" className="h-7 px-2 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-400" step="0.01" />
        ) : (
          <div className={`h-7 px-2 flex items-center justify-end text-xs font-medium ${isNeg ? 'text-red-600' : 'text-blue-600'}`}>
            {isNeg ? '−' : '+'}{formattaNumero(misurazione.quantitaParziale)}
          </div>
        )}
      </td>
      <td colSpan={2}></td>
      <td></td>
      <td className="px-1 py-1 w-10 text-center">
        {canDelete && <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1" title="Rimuovi misurazione"><Trash2 className="h-3 w-3" /></button>}
      </td>
    </tr>
  );
}

// ---- RIGA COMPUTO ----

interface RigaComputoProps {
  riga: RigaComputo;
  onUpdate: (id: string, updates: Partial<RigaComputo>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddMisurazione: (rigaId: string) => void;
  onUpdateMisurazione: (rigaId: string, misId: string, updates: Partial<Misurazione>) => void;
  onDeleteMisurazione: (rigaId: string, misId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function RigaComputoComponent({ riga, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown, onAddMisurazione, onUpdateMisurazione, onDeleteMisurazione, isFirst, isLast }: RigaComputoProps) {
  const { state, validaRiga } = useApp();
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const formula = UNITA_MISURA_FORMULE[riga.unitaMisura];
  const validazione = validaRiga(riga);
  const nMis = riga.misurazioni.length;
  const hasNeg = riga.misurazioni.some(m => m.segno === -1);

  const handleVoceSelect = (voce: VocePrezzario) => {
    onUpdate(riga.id, { codice: voce.codice, descrizione: voce.descrizione, unitaMisura: voce.unitaMisura, prezzoUnitario: voce.prezzoUnitario });
    setShowAutocomplete(false);
  };



  return (
    <>
      {/* RIGA PRINCIPALE */}
      <tr className={`border-b hover:bg-gray-50 transition-colors ${!validazione.valida ? 'bg-red-50' : ''}`}>
        <td className="px-2 py-2 text-center text-sm text-gray-500 w-10">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-medium">{riga.numero}</span>
            <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-blue-500" title={expanded ? 'Comprimi' : 'Espandi'}>
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          </div>
        </td>
        <td className="px-2 py-1 w-32">
          {showAutocomplete ? (
            <div className="relative">
              <AutocompletePrezzario value={riga.codice} onSelect={handleVoceSelect} onChange={(val) => onUpdate(riga.id, { codice: val })} />
              <button onClick={() => setShowAutocomplete(false)} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">×</button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Input value={riga.codice} onChange={(e) => onUpdate(riga.id, { codice: e.target.value })} placeholder="Codice" className="h-8 px-2 py-1 text-sm font-mono border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500" />
              {state.prezzario.length > 0 && <Button variant="ghost" size="sm" onClick={() => setShowAutocomplete(true)} className="h-6 w-6 p-0" title="Cerca nel prezzario"><Calculator className="h-3 w-3" /></Button>}
            </div>
          )}
        </td>
        <td className="px-2 py-1 min-w-[200px]">
          <Input value={riga.descrizione} onChange={(e) => onUpdate(riga.id, { descrizione: e.target.value })} placeholder="Descrizione lavorazione" className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500" />
        </td>
        <td className="px-2 py-1 w-20">
          <select value={riga.unitaMisura} onChange={(e) => onUpdate(riga.id, { unitaMisura: e.target.value as UnitàMisura })} className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 rounded">
            {Object.entries(UNITA_MISURA_FORMULE).map(([key, info]) => <option key={key} value={key}>{key} - {info.descrizione}</option>)}
          </select>
        </td>
        {/* Colonne misure - mostrano info aggregate */}
        <td className="px-2 py-1 w-24 bg-gray-50 text-center">
          <span className="text-xs text-gray-500">{nMis} mis.{hasNeg ? ' (±)' : ''}</span>
        </td>
        <td className="px-2 py-1 w-24 bg-gray-50"></td>
        <td className="px-2 py-1 w-24 bg-gray-50"></td>
        {/* Quantità calcolata */}
        <td className="px-2 py-1 w-24">
          <div className={`h-8 px-2 py-1 text-sm font-bold flex items-center justify-end ${riga.quantita === 0 ? 'text-red-500' : 'text-blue-700'}`}>
            {formattaNumero(riga.quantita)}{riga.quantita !== 0 && <Calculator className="h-3 w-3 ml-1 text-gray-400" />}
          </div>
        </td>
        <td className="px-2 py-1 w-28">
          <Input type="number" value={riga.prezzoUnitario || ''} onChange={(e) => onUpdate(riga.id, { prezzoUnitario: parseFloat(e.target.value) || 0 })} placeholder="€" className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500" step="0.01" />
        </td>
        <td className="px-2 py-1 w-28">
          <div className="h-8 px-2 py-1 text-sm font-bold text-right flex items-center justify-end">{formattaImporto(riga.importo)}</div>
        </td>
        <td className="px-2 py-1 w-32">
          <Input value={riga.note || ''} onChange={(e) => onUpdate(riga.id, { note: e.target.value })} placeholder="Note..." className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500" />
        </td>
        <td className="px-2 py-1 w-32">
          <div className="flex items-center justify-center gap-1">
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => onDuplicate(riga.id)} className="h-7 w-7 p-0"><Copy className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Duplica riga</p></TooltipContent></Tooltip></TooltipProvider>
            {!isFirst && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={onMoveUp} className="h-7 w-7 p-0"><ArrowUp className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Sposta su</p></TooltipContent></Tooltip></TooltipProvider>}
            {!isLast && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={onMoveDown} className="h-7 w-7 p-0"><ArrowDown className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Sposta giù</p></TooltipContent></Tooltip></TooltipProvider>}
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => onDelete(riga.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Elimina riga</p></TooltipContent></Tooltip></TooltipProvider>
            {!validazione.valida && <TooltipProvider><Tooltip><TooltipTrigger asChild><AlertCircle className="h-4 w-4 text-red-500" /></TooltipTrigger><TooltipContent><div className="text-xs">{validazione.errori.map((e, i) => <p key={i}>• {e}</p>)}</div></TooltipContent></Tooltip></TooltipProvider>}
          </div>
        </td>
      </tr>

      {/* MISURAZIONI ESPANSE */}
      {expanded && (
        <>
          {/* Header sub-righe */}
          <tr className="bg-gray-50 border-b border-gray-200">
            <td className="pl-10 py-1 text-xs text-gray-500 font-semibold">±</td>
            <td className="px-1 py-1 text-xs text-gray-500 font-semibold">Descrizione misurazione</td>
            <td className={`px-1 py-1 text-xs text-gray-500 font-semibold w-20 text-center ${!formula.richiedeLunghezza ? 'bg-gray-100 text-gray-300' : ''}`}>{formula.richiedeLunghezza ? 'Lung. (m)' : ''}</td>
            <td className={`px-1 py-1 text-xs text-gray-500 font-semibold w-20 text-center ${!formula.richiedeLarghezza ? 'bg-gray-100 text-gray-300' : ''}`}>{formula.richiedeLarghezza ? 'Larg. (m)' : ''}</td>
            <td className={`px-1 py-1 text-xs text-gray-500 font-semibold w-20 text-center ${!formula.richiedeAltezza ? 'bg-gray-100 text-gray-300' : ''}`}>{formula.richiedeAltezza ? 'Alt. (m)' : ''}</td>
            <td className="px-2 py-1 text-xs text-gray-500 font-semibold w-24 text-right">Parziale</td>
            <td colSpan={4}></td>
          </tr>

          {riga.misurazioni.map((mis) => (
            <RigaMisurazione
              key={mis.id}
              misurazione={mis}
              unitaMisura={riga.unitaMisura}
              onUpdate={(updates) => onUpdateMisurazione(riga.id, mis.id, updates)}
              onDelete={() => onDeleteMisurazione(riga.id, mis.id)}
              canDelete={riga.misurazioni.length > 1}
            />
          ))}

          {/* Footer misurazioni: aggiungi + totale */}
          <tr className="bg-gray-50 border-b-2 border-gray-300">
            <td colSpan={6} className="pl-10 py-1.5">
              <div className="flex items-center gap-4">
                <button onClick={() => onAddMisurazione(riga.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Aggiungi misurazione (+)
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    // Add then immediately set to negative via a custom event
                    // We dispatch ADD then the user can click − on the new row
                    onAddMisurazione(riga.id);
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium"
                  title="Aggiunge una riga, poi clicca − per renderla detrazione"
                >
                  <MinusCircle className="h-3.5 w-3.5" />
                  Aggiungi detrazione (−)
                </button>
              </div>
            </td>
            <td className="px-2 py-1.5 text-xs font-bold text-right text-blue-800 w-24 whitespace-nowrap">
              Tot: {formattaNumero(riga.quantita)} {riga.unitaMisura}
            </td>
            <td colSpan={4}></td>
          </tr>
        </>
      )}
    </>
  );
}

// ---- TABELLA PRINCIPALE ----

interface TabellaComputoProps {
  categoriaId: string;
}

export function TabellaComputo({ categoriaId }: TabellaComputoProps) {
  const { state, dispatch, getRighePerCategoria, totaliPerCategoria } = useApp();
  const righe = getRighePerCategoria(categoriaId);
  const totaleCategoria = totaliPerCategoria.find(t => t.categoriaId === categoriaId)?.totale || 0;

  const handleAddRiga = () => dispatch({ type: 'ADD_RIGA', payload: { categoriaId } });
  const handleUpdateRiga = (id: string, updates: Partial<RigaComputo>) => dispatch({ type: 'UPDATE_RIGA', payload: { id, updates } });
  const handleDeleteRiga = (id: string) => { if (confirm('Sei sicuro di voler eliminare questa riga?')) dispatch({ type: 'DELETE_RIGA', payload: id }); };
  const handleDuplicateRiga = (id: string) => dispatch({ type: 'DUPLICATE_RIGA', payload: id });
  const handleAddMisurazione = (rigaId: string) => dispatch({ type: 'ADD_MISURAZIONE', payload: { rigaId } });
  const handleUpdateMisurazione = (rigaId: string, misurazioneId: string, updates: Partial<Misurazione>) =>
    dispatch({ type: 'UPDATE_MISURAZIONE', payload: { rigaId, misurazioneId, updates } });
  const handleDeleteMisurazione = (rigaId: string, misurazioneId: string) =>
    dispatch({ type: 'DELETE_MISURAZIONE', payload: { rigaId, misurazioneId } });

  const handleMoveRiga = (index: number, direction: 'up' | 'down') => {
    if (!state.computoCorrente) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= righe.length) return;
    const allRighe = [...state.computoCorrente.righe];
    const indices = allRighe.map((r, i) => ({ r, i })).filter(({ r }) => r.categoriaId === categoriaId).map(({ i }) => i);
    const idx1 = indices[index], idx2 = indices[newIndex];
    [allRighe[idx1], allRighe[idx2]] = [allRighe[idx2], allRighe[idx1]];
    dispatch({ type: 'REORDER_RIGHE', payload: allRighe });
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-10">N.</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-left w-32">Codice</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-left min-w-[200px]">Descrizione</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-left w-20">U.M.</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-24">Lung. (m)</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-24">Larg. (m)</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-24">Alt. (m)</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-24">Quant.</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-28">Prezzo €</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-28">Importo €</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-left w-32">Note</th>
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center w-32">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {righe.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-500">Nessuna riga. <Button variant="link" onClick={handleAddRiga} className="ml-2">Aggiungi la prima voce</Button></td></tr>
              ) : (
                righe.map((riga, index) => (
                  <RigaComputoComponent
                    key={riga.id}
                    riga={riga}
                    onUpdate={handleUpdateRiga}
                    onDelete={handleDeleteRiga}
                    onDuplicate={handleDuplicateRiga}
                    onMoveUp={() => handleMoveRiga(index, 'up')}
                    onMoveDown={() => handleMoveRiga(index, 'down')}
                    onAddMisurazione={handleAddMisurazione}
                    onUpdateMisurazione={handleUpdateMisurazione}
                    onDeleteMisurazione={handleDeleteMisurazione}
                    isFirst={index === 0}
                    isLast={index === righe.length - 1}
                  />
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={9} className="px-4 py-3 text-right font-medium text-gray-600">Totale Categoria:</td>
                <td className="px-4 py-3 text-right font-bold text-lg">{formattaImporto(totaleCategoria)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Button onClick={handleAddRiga} variant="outline" className="w-full py-3 border-dashed">
        <Plus className="h-4 w-4 mr-2" />
        Aggiungi Voce
      </Button>

      <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div><span>Addizione (+)</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></div><span>Detrazione (−)</span></div>
        <div className="flex items-center gap-1"><Calculator className="h-3 w-3" /><span>Quantità calcolata</span></div>
        <div className="flex items-center gap-1"><ChevronDown className="h-3 w-3" /><span>Espandi/comprimi misurazioni</span></div>
      </div>
    </div>
  );
}
