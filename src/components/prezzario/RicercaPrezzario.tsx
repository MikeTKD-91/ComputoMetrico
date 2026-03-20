import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { VocePrezzario } from '@/types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface RicercaPrezzarioProps {
  onSelect: (voce: VocePrezzario) => void;
  onClose: () => void;
}

export function RicercaPrezzario({ onSelect, onClose }: RicercaPrezzarioProps) {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [filtroUM, setFiltroUM] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSottoCategoria, setFiltroSottoCategoria] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 150);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Ogni volta che cambia categoria, azzera la sotto-categoria
  useEffect(() => { setFiltroSottoCategoria(''); }, [filtroCategoria]);

  const categorie = useMemo(() => {
    const set = new Set<string>();
    state.prezzario.forEach(v => { if (v.categoria) set.add(v.categoria); });
    return Array.from(set).sort();
  }, [state.prezzario]);

  const sottoCategorie = useMemo(() => {
    const set = new Set<string>();
    state.prezzario.forEach(v => {
      if (v.sottoCategoria && (!filtroCategoria || v.categoria === filtroCategoria)) {
        set.add(v.sottoCategoria);
      }
    });
    return Array.from(set).sort();
  }, [state.prezzario, filtroCategoria]);

  const unitaMisuraUniche = useMemo(() => {
    const set = new Set<string>();
    state.prezzario.forEach(v => set.add(v.unitaMisura));
    return Array.from(set).sort();
  }, [state.prezzario]);

  const risultati = useMemo(() => {
    let voci = state.prezzario;
    if (filtroUM) voci = voci.filter(v => v.unitaMisura === filtroUM);
    if (filtroCategoria) voci = voci.filter(v => v.categoria === filtroCategoria);
    if (filtroSottoCategoria) voci = voci.filter(v => v.sottoCategoria === filtroSottoCategoria);
    if (debouncedSearch.trim()) {
      const parole = debouncedSearch.toLowerCase().split(/\s+/).filter(p => p.length > 1);
      voci = voci.filter(v => {
        const testo = [v.codice, v.descrizione, v.voceBreve ?? '', v.categoria ?? '', v.sottoCategoria ?? ''].join(' ').toLowerCase();
        return parole.every(p => testo.includes(p));
      });
    }
    return voci.slice(0, 200);
  }, [state.prezzario, debouncedSearch, filtroUM, filtroCategoria, filtroSottoCategoria]);

  const handleSelect = (voce: VocePrezzario) => { onSelect(voce); onClose(); };
  const hasFilter = filtroCategoria || filtroUM || filtroSottoCategoria;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px',
        width: '100%', maxWidth: '820px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header ricerca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <Search style={{ width: '20px', height: '20px', color: '#9ca3af', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per codice, voce, descrizione, categoria..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', color: '#111827', backgroundColor: 'transparent' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', marginLeft: '4px' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Filtri */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', flexWrap: 'wrap' }}>
          <Filter style={{ width: '14px', height: '14px', color: '#9ca3af', flexShrink: 0 }} />

          {/* Categoria */}
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', maxWidth: '260px' }}
          >
            <option value="">Tutte le categorie</option>
            {categorie.map(c => <option key={c} value={c}>{c.length > 55 ? c.slice(0, 55) + '…' : c}</option>)}
          </select>

          {/* Sotto-categoria (capitolo) */}
          <select
            value={filtroSottoCategoria}
            onChange={e => setFiltroSottoCategoria(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', maxWidth: '260px' }}
          >
            <option value="">Tutti i capitoli</option>
            {sottoCategorie.map(s => <option key={s} value={s}>{s.length > 55 ? s.slice(0, 55) + '…' : s}</option>)}
          </select>

          {/* U.M. */}
          <select
            value={filtroUM}
            onChange={e => setFiltroUM(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff' }}
          >
            <option value="">Tutte U.M.</option>
            {unitaMisuraUniche.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          {hasFilter && (
            <button
              onClick={() => { setFiltroCategoria(''); setFiltroUM(''); setFiltroSottoCategoria(''); }}
              style={{ fontSize: '12px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              × Azzera filtri
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>
            {risultati.length}{risultati.length === 200 ? ' (max 200)' : ''} voci
          </span>
        </div>

        {/* Lista risultati */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {state.prezzario.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontWeight: 600, fontSize: '16px' }}>Prezzario vuoto</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Importa un CSV dal tab Prezzario.</p>
            </div>
          ) : risultati.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontWeight: 600, fontSize: '16px' }}>Nessun risultato</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Prova a modificare la ricerca o i filtri.</p>
            </div>
          ) : risultati.map(voce => {
            const isExpanded = expandedId === voce.id;
            return (
              <div
                key={voce.id}
                style={{
                  borderBottom: '1px solid #f3f4f6',
                  backgroundColor: isExpanded ? '#f0f7ff' : 'transparent',
                  transition: 'background-color 0.1s',
                }}
              >
                {/* Riga principale - click per espandere/contrarre */}
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 16px', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : voce.id)}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  {/* Codice + badge UM */}
                  <div style={{ flexShrink: 0, minWidth: '130px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1d4ed8', fontWeight: 700 }}>{voce.codice}</span>
                    <div style={{ marginTop: '3px' }}>
                      <span style={{ fontSize: '10px', padding: '1px 6px', border: '1px solid #d1d5db', borderRadius: '4px', color: '#6b7280' }}>{voce.unitaMisura}</span>
                    </div>
                  </div>

                  {/* Contenuto centrale */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Categoria + sotto-categoria */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                      {voce.categoria && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#ede9fe', color: '#6d28d9', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {voce.categoria}
                        </span>
                      )}
                      {voce.sottoCategoria && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {voce.sottoCategoria}
                        </span>
                      )}
                    </div>

                    {/* Titolo voce (breve) */}
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                      {voce.voceBreve || voce.descrizione.slice(0, 100)}
                    </div>

                    {/* Anteprima descrizione (o descrizione completa se espanso) */}
                    {isExpanded ? (
                      <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6', backgroundColor: '#fff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px', marginTop: '6px' }}>
                        {voce.descrizione}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {voce.descrizione}
                      </div>
                    )}
                  </div>

                  {/* Prezzo + toggle expand */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                      € {voce.prezzoUnitario.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {isExpanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                      {isExpanded ? 'riduci' : 'dettagli'}
                    </span>
                  </div>
                </div>

                {/* Bottone seleziona (visibile quando espanso) */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleSelect(voce)}
                      style={{
                        padding: '8px 20px', backgroundColor: '#1d4ed8', color: '#fff',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e40af')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                    >
                      ✓ Seleziona questa voce
                    </button>
                  </div>
                )}

                {/* Seleziona con click singolo se non espanso (doppio click = espandi, singolo = seleziona) */}
                {!isExpanded && (
                  <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleSelect(voce); }}
                      style={{
                        padding: '4px 14px', backgroundColor: 'transparent', color: '#1d4ed8',
                        border: '1px solid #93c5fd', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 500,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      Seleziona
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
          <span>Clicca <strong>Dettagli</strong> per leggere la descrizione completa, poi <strong>Seleziona</strong></span>
          <span>·</span>
          <span>Esc per chiudere</span>
        </div>
      </div>
    </div>
  );
}
