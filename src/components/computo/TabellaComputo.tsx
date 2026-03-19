import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Trash2, Copy, AlertCircle, Calculator,
  ArrowUp, ArrowDown, Search, PlusCircle, MinusCircle,
  ChevronDown, ChevronRight, X, Filter,
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

// ============================================================
// MODALE RICERCA PREZZARIO
// ============================================================

interface ModalRicercaPrezzarioProps {
  onSelect: (voce: VocePrezzario) => void;
  onClose: () => void;
}

function ModalRicercaPrezzario({ onSelect, onClose }: ModalRicercaPrezzarioProps) {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [filtroUM, setFiltroUM] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 120);

  // Focus automatico all'apertura
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Chiudi con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Categorie uniche
  const categorie = useMemo(() => {
    const set = new Set<string>();
    state.prezzario.forEach(v => { if (v.categoria) set.add(v.categoria); });
    return Array.from(set).sort();
  }, [state.prezzario]);

  // Unità uniche
  const unitaMisuraUniche = useMemo(() => {
    const set = new Set<string>();
    state.prezzario.forEach(v => set.add(v.unitaMisura));
    return Array.from(set).sort();
  }, [state.prezzario]);

  // Risultati filtrati
  const risultati = useMemo(() => {
    let voci = state.prezzario;
    if (filtroUM) voci = voci.filter(v => v.unitaMisura === filtroUM);
    if (filtroCategoria) voci = voci.filter(v => v.categoria === filtroCategoria);
    if (debouncedSearch.trim().length >= 1) {
      const s = debouncedSearch.toLowerCase();
      voci = voci.filter(v =>
        v.codice.toLowerCase().includes(s) ||
        v.descrizione.toLowerCase().includes(s) ||
        (v.categoria ?? '').toLowerCase().includes(s)
      );
    }
    return voci.slice(0, 100);
  }, [state.prezzario, debouncedSearch, filtroUM, filtroCategoria]);

  // Reset highlighted quando cambiano i risultati
  useEffect(() => { setHighlighted(0); }, [risultati]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => Math.min(risultati.length - 1, i + 1));
      // scroll
      const el = listRef.current?.children[highlighted + 1] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => Math.max(0, i - 1));
      const el = listRef.current?.children[highlighted - 1] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (risultati[highlighted]) { onSelect(risultati[highlighted]); onClose(); }
    }
  };

  const handleSelect = (voce: VocePrezzario) => { onSelect(voce); onClose(); };

  // Evidenzia il testo cercato
  const highlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#FEF08A', borderRadius: 2, padding: '0 1px' }}>{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return createPortal(
    /* Overlay */
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Pannello */}
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', width: '100%', maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search style={{ width: 18, height: 18, color: 'var(--color-text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cerca per codice, descrizione, categoria..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: 'var(--color-text-primary)' }}
          />
          <button onClick={onClose} style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Filtri */}
        <div style={{ padding: '8px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'var(--color-background-secondary)' }}>
          <Filter style={{ width: 13, height: 13, color: 'var(--color-text-secondary)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Filtri:</span>

          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{ fontSize: 12, padding: '3px 8px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            <option value="">Tutte le categorie</option>
            {categorie.map(c => <option key={c} value={c}>{c.length > 40 ? c.slice(0, 40) + '…' : c}</option>)}
          </select>

          <select
            value={filtroUM}
            onChange={e => setFiltroUM(e.target.value)}
            style={{ fontSize: 12, padding: '3px 8px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            <option value="">Tutte le U.M.</option>
            {unitaMisuraUniche.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          {(filtroCategoria || filtroUM || search) && (
            <button
              onClick={() => { setFiltroCategoria(''); setFiltroUM(''); setSearch(''); }}
              style={{ fontSize: 12, color: '#A32D2D', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
            >
              × Azzera filtri
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {risultati.length} {risultati.length === 100 ? '(max 100)' : ''}  voci
          </span>
        </div>

        {/* Lista risultati */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {state.prezzario.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <p style={{ fontWeight: 500 }}>Prezzario vuoto</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Importa prima un CSV dal tab Prezzario.</p>
            </div>
          ) : risultati.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <p style={{ fontWeight: 500 }}>Nessun risultato</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Prova a modificare la ricerca o i filtri.</p>
            </div>
          ) : (
            risultati.map((voce, idx) => (
              <button
                key={voce.id}
                onClick={() => handleSelect(voce)}
                onMouseEnter={() => setHighlighted(idx)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 16px',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  background: idx === highlighted ? 'var(--color-background-info)' : 'transparent',
                  border: 'none', cursor: 'pointer', display: 'block',
                  transition: 'background 0.1s',
                }}
              >
                {/* Riga 1: codice + UM + prezzo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#185FA5', fontWeight: 500, flexShrink: 0 }}>
                    {highlight(voce.codice, search)}
                  </span>
                  <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, border: '0.5px solid var(--color-border-secondary)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                    {voce.unitaMisura}
                  </span>
                  {voce.categoria && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {voce.categoria.length > 50 ? voce.categoria.slice(0, 50) + '…' : voce.categoria}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 13, color: 'var(--color-text-primary)', flexShrink: 0 }}>
                    € {voce.prezzoUnitario.toFixed(2)}
                  </span>
                </div>
                {/* Riga 2: descrizione */}
                <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {highlight(voce.descrizione, search)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <span>↑↓ naviga</span>
          <span>Enter seleziona</span>
          <span>Esc chiudi</span>
        </div>
      </div>
    </div>
  , document.body);
}

// ============================================================
// RIGA MISURAZIONE
// ============================================================

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

// ============================================================
// RIGA COMPUTO
// ============================================================

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

function RigaComputoComponent({
  riga, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown,
  onAddMisurazione, onUpdateMisurazione, onDeleteMisurazione, isFirst, isLast,
}: RigaComputoProps) {
  const { state, validaRiga } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const formula = UNITA_MISURA_FORMULE[riga.unitaMisura];
  const validazione = validaRiga(riga);
  const nMis = riga.misurazioni.length;
  const hasNeg = riga.misurazioni.some(m => m.segno === -1);

  const handleVoceSelect = useCallback((voce: VocePrezzario) => {
    onUpdate(riga.id, {
      codice: voce.codice,
      descrizione: voce.descrizione,
      unitaMisura: voce.unitaMisura,
      prezzoUnitario: voce.prezzoUnitario,
    });
  }, [riga.id, onUpdate]);

  return (
    <>
      {/* MODALE RICERCA */}
      {showModal && (
        <ModalRicercaPrezzario
          onSelect={handleVoceSelect}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* RIGA PRINCIPALE */}
      <tr className={`border-b hover:bg-gray-50 transition-colors ${!validazione.valida ? 'bg-red-50' : ''}`}>
        {/* N. + toggle */}
        <td className="px-2 py-2 text-center text-sm text-gray-500 w-10">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-medium">{riga.numero}</span>
            <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-blue-500" title={expanded ? 'Comprimi' : 'Espandi'}>
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          </div>
        </td>

        {/* Codice + pulsante apri modale */}
        <td className="px-2 py-1 w-36">
          <div className="flex items-center gap-1">
            <Input
              value={riga.codice}
              onChange={(e) => onUpdate(riga.id, { codice: e.target.value })}
              placeholder="Codice"
              className="h-8 px-2 py-1 text-sm font-mono border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
            {state.prezzario.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setShowModal(true)}
                      className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Cerca nel prezzario</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </td>

        {/* Descrizione */}
        <td className="px-2 py-1 min-w-[200px]">
          <div className="flex items-center gap-1">
            <Input
              value={riga.descrizione}
              onChange={(e) => onUpdate(riga.id, { descrizione: e.target.value })}
              placeholder={state.prezzario.length > 0 ? 'Descrizione (o cerca con 🔍)' : 'Descrizione lavorazione'}
              className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
            {/* Secondo pulsante ricerca sulla descrizione (più visibile) */}
            {state.prezzario.length > 0 && (
              <Button
                variant="outline" size="sm"
                onClick={() => setShowModal(true)}
                className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0 gap-1"
              >
                <Search className="h-3 w-3" />
                Prezzario
              </Button>
            )}
          </div>
        </td>

        {/* U.M. */}
        <td className="px-2 py-1 w-20">
          <select value={riga.unitaMisura} onChange={(e) => onUpdate(riga.id, { unitaMisura: e.target.value as UnitàMisura })} className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 rounded">
            {Object.entries(UNITA_MISURA_FORMULE).map(([key, info]) => <option key={key} value={key}>{key} - {info.descrizione}</option>)}
          </select>
        </td>

        {/* Colonne misure aggregate */}
        <td className="px-2 py-1 w-24 bg-gray-50 text-center">
          <span className="text-xs text-gray-500">{nMis} mis.{hasNeg ? ' (±)' : ''}</span>
        </td>
        <td className="px-2 py-1 w-24 bg-gray-50"></td>
        <td className="px-2 py-1 w-24 bg-gray-50"></td>

        {/* Quantità */}
        <td className="px-2 py-1 w-24">
          <div className={`h-8 px-2 py-1 text-sm font-bold flex items-center justify-end ${riga.quantita === 0 ? 'text-red-500' : 'text-blue-700'}`}>
            {formattaNumero(riga.quantita)}{riga.quantita !== 0 && <Calculator className="h-3 w-3 ml-1 text-gray-400" />}
          </div>
        </td>

        {/* Prezzo */}
        <td className="px-2 py-1 w-28">
          <Input type="number" value={riga.prezzoUnitario || ''} onChange={(e) => onUpdate(riga.id, { prezzoUnitario: parseFloat(e.target.value) || 0 })} placeholder="€" className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500" step="0.01" />
        </td>

        {/* Importo */}
        <td className="px-2 py-1 w-28">
          <div className="h-8 px-2 py-1 text-sm font-bold text-right flex items-center justify-end">{formattaImporto(riga.importo)}</div>
        </td>

        {/* Note */}
        <td className="px-2 py-1 w-32">
          <Input value={riga.note || ''} onChange={(e) => onUpdate(riga.id, { note: e.target.value })} placeholder="Note..." className="h-8 px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500" />
        </td>

        {/* Azioni */}
        <td className="px-2 py-1 w-32">
          <div className="flex items-center justify-center gap-1">
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => onDuplicate(riga.id)} className="h-7 w-7 p-0"><Copy className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Duplica</p></TooltipContent></Tooltip></TooltipProvider>
            {!isFirst && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={onMoveUp} className="h-7 w-7 p-0"><ArrowUp className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Sposta su</p></TooltipContent></Tooltip></TooltipProvider>}
            {!isLast && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={onMoveDown} className="h-7 w-7 p-0"><ArrowDown className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Sposta giù</p></TooltipContent></Tooltip></TooltipProvider>}
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => onDelete(riga.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Elimina</p></TooltipContent></Tooltip></TooltipProvider>
            {!validazione.valida && <TooltipProvider><Tooltip><TooltipTrigger asChild><AlertCircle className="h-4 w-4 text-red-500" /></TooltipTrigger><TooltipContent><div className="text-xs">{validazione.errori.map((e, i) => <p key={i}>• {e}</p>)}</div></TooltipContent></Tooltip></TooltipProvider>}
          </div>
        </td>
      </tr>

      {/* MISURAZIONI ESPANSE */}
      {expanded && (
        <>
          <tr className="bg-gray-50 border-b border-gray-200">
            <td className="pl-10 py-1 text-xs text-gray-500 font-semibold">±</td>
            <td className="px-1 py-1 text-xs text-gray-500 font-semibold">Descrizione misurazione</td>
            <td className={`px-1 py-1 text-xs text-gray-500 font-semibold w-20 text-center ${!formula.richiedeLunghezza ? 'bg-gray-100' : ''}`}>{formula.richiedeLunghezza ? 'Lung. (m)' : ''}</td>
            <td className={`px-1 py-1 text-xs text-gray-500 font-semibold w-20 text-center ${!formula.richiedeLarghezza ? 'bg-gray-100' : ''}`}>{formula.richiedeLarghezza ? 'Larg. (m)' : ''}</td>
            <td className={`px-1 py-1 text-xs text-gray-500 font-semibold w-20 text-center ${!formula.richiedeAltezza ? 'bg-gray-100' : ''}`}>{formula.richiedeAltezza ? 'Alt. (m)' : ''}</td>
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

          <tr className="bg-gray-50 border-b-2 border-gray-300">
            <td colSpan={6} className="pl-10 py-1.5">
              <div className="flex items-center gap-4">
                <button onClick={() => onAddMisurazione(riga.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  <PlusCircle className="h-3.5 w-3.5" />Aggiungi misurazione (+)
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={() => onAddMisurazione(riga.id)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium" title="Aggiungi poi clicca − per renderla detrazione">
                  <MinusCircle className="h-3.5 w-3.5" />Aggiungi detrazione (−)
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

// ============================================================
// TABELLA PRINCIPALE
// ============================================================

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
                <th className="px-2 py-2 text-xs font-medium text-gray-600 text-left w-36">Codice</th>
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
                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                  Nessuna riga. <Button variant="link" onClick={handleAddRiga} className="ml-2">Aggiungi la prima voce</Button>
                </td></tr>
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
        <Plus className="h-4 w-4 mr-2" />Aggiungi Voce
      </Button>

      <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div><span>Addizione (+)</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></div><span>Detrazione (−)</span></div>
        <div className="flex items-center gap-1"><Calculator className="h-3 w-3" /><span>Quantità calcolata</span></div>
        <div className="flex items-center gap-1"><Search className="h-3 w-3 text-blue-500" /><span>Cerca nel prezzario con il pulsante "Prezzario"</span></div>
      </div>
    </div>
  );
}
