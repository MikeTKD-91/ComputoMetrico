import { useState, useCallback } from 'react';
import {
  Plus, Trash2, Copy, AlertCircle, ArrowUp, ArrowDown, Search, PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useApp } from '@/store/AppContext';
import { useRicercaPrezzario } from '@/App';
import { UNITA_MISURA_FORMULE } from '@/types';
import type { RigaComputo, Misurazione, UnitàMisura } from '@/types';
import { formattaImporto, formattaNumero } from '@/utils/exportUtils';

// ============================================================
// RIGA MISURAZIONE (stile Primus)
// ============================================================

interface RigaMisurazioneProps {
  misurazione: Misurazione;
  unitaMisura: UnitàMisura;
  index: number;
  onUpdate: (updates: Partial<Misurazione>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function RigaMisurazione({ misurazione, unitaMisura, index, onUpdate, onDelete, canDelete }: RigaMisurazioneProps) {
  const formula = UNITA_MISURA_FORMULE[unitaMisura];
  const isManuale = !formula.richiedeLunghezza && !formula.richiedeLarghezza && !formula.richiedeAltezza;
  const isNeg = misurazione.segno === -1;

  return (
    <tr className={`border-b border-gray-100 text-sm ${isNeg ? 'bg-red-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>

      {/* Segno +/- */}
      <td className="px-2 py-1.5 text-center w-10">
        <button
          onClick={() => onUpdate({ segno: isNeg ? 1 : -1 })}
          className={`w-7 h-7 rounded font-bold text-base flex items-center justify-center mx-auto transition-colors ${isNeg ? 'bg-red-200 text-red-700 hover:bg-red-300' : 'bg-green-200 text-green-700 hover:bg-green-300'}`}
        >
          {isNeg ? '−' : '+'}
        </button>
      </td>

      {/* Descrizione misurazione */}
      <td className="px-2 py-1.5">
        <Input
          value={misurazione.descrizione}
          onChange={e => onUpdate({ descrizione: e.target.value })}
          placeholder="es: piano terra, bagno, detraione finestra..."
          className="h-8 px-2 text-sm border border-gray-200 bg-white focus:ring-1 focus:ring-blue-400 rounded"
        />
      </td>

      {/* Lunghezza */}
      <td className={`px-2 py-1.5 w-24 ${!formula.richiedeLunghezza ? 'bg-gray-100' : ''}`}>
        {formula.richiedeLunghezza
          ? <Input type="number" value={misurazione.lunghezza ?? ''} onChange={e => onUpdate({ lunghezza: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0.00" className="h-8 px-2 text-sm text-right border border-gray-200 bg-white focus:ring-1 focus:ring-blue-400 rounded" step="0.01" />
          : <div className="h-8 flex items-center justify-center text-gray-300 text-xs">—</div>
        }
      </td>

      {/* Larghezza */}
      <td className={`px-2 py-1.5 w-24 ${!formula.richiedeLarghezza ? 'bg-gray-100' : ''}`}>
        {formula.richiedeLarghezza
          ? <Input type="number" value={misurazione.larghezza ?? ''} onChange={e => onUpdate({ larghezza: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0.00" className="h-8 px-2 text-sm text-right border border-gray-200 bg-white focus:ring-1 focus:ring-blue-400 rounded" step="0.01" />
          : <div className="h-8 flex items-center justify-center text-gray-300 text-xs">—</div>
        }
      </td>

      {/* Altezza */}
      <td className={`px-2 py-1.5 w-24 ${!formula.richiedeAltezza ? 'bg-gray-100' : ''}`}>
        {formula.richiedeAltezza
          ? <Input type="number" value={misurazione.altezza ?? ''} onChange={e => onUpdate({ altezza: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0.00" className="h-8 px-2 text-sm text-right border border-gray-200 bg-white focus:ring-1 focus:ring-blue-400 rounded" step="0.01" />
          : <div className="h-8 flex items-center justify-center text-gray-300 text-xs">—</div>
        }
      </td>

      {/* Quantità parziale */}
      <td className="px-2 py-1.5 w-28">
        {isManuale
          ? <Input type="number" value={misurazione.quantitaParziale || ''} onChange={e => onUpdate({ quantitaParziale: e.target.value ? parseFloat(e.target.value) : 0 })} placeholder="0.00" className="h-8 px-2 text-sm text-right border border-gray-200 bg-white focus:ring-1 focus:ring-blue-400 rounded" step="0.01" />
          : <div className={`h-8 px-2 flex items-center justify-end text-sm font-semibold ${isNeg ? 'text-red-600' : 'text-blue-700'}`}>
              {isNeg ? '−' : '+'}{formattaNumero(Math.abs(misurazione.quantitaParziale))}
            </div>
        }
      </td>

      {/* Colonne vuote per allineamento con header voce */}
      <td className="w-28 bg-gray-50/30"></td>
      <td className="w-28 bg-gray-50/30"></td>

      {/* Elimina riga misurazione */}
      <td className="px-2 py-1.5 w-10 text-center">
        {canDelete && (
          <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors p-1">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ============================================================
// BLOCCO VOCE STILE PRIMUS
// ============================================================

interface RigaComputoProps {
  riga: RigaComputo;
  numero: number;
  onUpdate: (id: string, updates: Partial<RigaComputo>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddMisurazione: (rigaId: string) => void;
  onUpdateMisurazione: (rigaId: string, misId: string, updates: Partial<Misurazione>) => void;
  onDeleteMisurazione: (rigaId: string, misId: string) => void;
  onOpenRicerca: (rigaId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function BloccoVoce({
  riga, numero, onUpdate, onDelete, onDuplicate, onMoveUp, onMoveDown,
  onAddMisurazione, onUpdateMisurazione, onDeleteMisurazione, onOpenRicerca, isFirst, isLast,
}: RigaComputoProps) {
  const { validaRiga } = useApp();
  const validazione = validaRiga(riga);
  const formula = UNITA_MISURA_FORMULE[riga.unitaMisura];
  // Descrizione completa salvata nelle note con prefisso __desc__
  const descCompleta = riga.note?.startsWith('__desc__') ? riga.note.replace('__desc__', '') : null;
  const noteVisibili = riga.note && !riga.note.startsWith('__desc__') ? riga.note : '';

  return (
    <div className={`mb-1 border rounded-lg overflow-hidden shadow-sm ${!validazione.valida ? 'border-red-300' : 'border-gray-200'}`}>

      {/* ── INTESTAZIONE VOCE (sfondo blu scuro stile Primus) ── */}
      <div className="bg-slate-700 text-white px-3 py-2 flex items-start gap-3">

        {/* Numero voce */}
        <div className="flex-shrink-0 w-8 h-8 bg-slate-500 rounded flex items-center justify-center text-sm font-bold mt-0.5">
          {numero}
        </div>

        {/* Codice + Descrizione */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Input
              value={riga.codice}
              onChange={e => onUpdate(riga.id, { codice: e.target.value })}
              placeholder="Codice"
              className="h-7 px-2 text-xs font-mono bg-slate-600 border-slate-500 text-white placeholder-slate-400 focus:bg-slate-500 focus:ring-1 focus:ring-blue-400 rounded w-44"
            />
            <select
              value={riga.unitaMisura}
              onChange={e => onUpdate(riga.id, { unitaMisura: e.target.value as UnitàMisura })}
              className="h-7 px-2 text-xs bg-slate-600 border border-slate-500 text-white rounded focus:ring-1 focus:ring-blue-400"
            >
              {Object.entries(UNITA_MISURA_FORMULE).map(([key, info]) => (
                <option key={key} value={key}>{key} — {info.descrizione}</option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenRicerca(riga.id)}
              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 border-0 text-white gap-1.5"
            >
              <Search className="h-3 w-3" />
              Cerca prezzario
            </Button>
            {!validazione.valida && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">{validazione.errori.map((e: any, i: number) => <p key={i}>• {e}</p>)}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Descrizione voce (titolo) */}
          <Input
            value={riga.descrizione}
            onChange={e => onUpdate(riga.id, { descrizione: e.target.value })}
            placeholder="Descrizione lavorazione..."
            className="h-8 px-2 text-sm font-semibold bg-slate-600 border-slate-500 text-white placeholder-slate-400 focus:bg-slate-500 focus:ring-1 focus:ring-blue-400 rounded w-full"
          />

          {/* Descrizione completa articolo (se presente) */}
          {descCompleta && (
            <div className="mt-1.5 text-xs text-slate-300 leading-relaxed bg-slate-800/50 rounded px-2 py-1.5 border border-slate-600">
              {descCompleta}
            </div>
          )}
        </div>

        {/* Prezzo + Importo + Azioni */}
        <div className="flex-shrink-0 flex items-start gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Prezzo unitario</div>
            <Input
              type="number"
              value={riga.prezzoUnitario || ''}
              onChange={e => onUpdate(riga.id, { prezzoUnitario: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="h-8 px-2 text-sm text-right font-medium bg-slate-600 border-slate-500 text-white placeholder-slate-400 focus:bg-slate-500 focus:ring-1 focus:ring-blue-400 rounded w-28"
              step="0.01"
            />
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Importo</div>
            <div className="h-8 px-3 bg-blue-700 rounded flex items-center justify-end text-white font-bold text-sm w-32">
              {formattaImporto(riga.importo)}
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-1 mt-5">
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={() => onDuplicate(riga.id)} className="text-slate-400 hover:text-white p-1"><Copy className="h-3.5 w-3.5" /></button>
              </TooltipTrigger><TooltipContent>Duplica</TooltipContent></Tooltip>
            </TooltipProvider>
            {!isFirst && (
              <TooltipProvider>
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={onMoveUp} className="text-slate-400 hover:text-white p-1"><ArrowUp className="h-3.5 w-3.5" /></button>
                </TooltipTrigger><TooltipContent>Sposta su</TooltipContent></Tooltip>
              </TooltipProvider>
            )}
            {!isLast && (
              <TooltipProvider>
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={onMoveDown} className="text-slate-400 hover:text-white p-1"><ArrowDown className="h-3.5 w-3.5" /></button>
                </TooltipTrigger><TooltipContent>Sposta giù</TooltipContent></Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <button onClick={() => onDelete(riga.id)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
              </TooltipTrigger><TooltipContent>Elimina voce</TooltipContent></Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* ── TABELLA MISURAZIONI ── */}
      <table className="w-full">
        {/* Header colonne misurazioni */}
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200 text-xs text-gray-500 font-semibold">
            <th className="px-2 py-1.5 text-center w-10">±</th>
            <th className="px-2 py-1.5 text-left">Descrizione misurazione</th>
            <th className={`px-2 py-1.5 text-center w-24 ${!formula.richiedeLunghezza ? 'bg-gray-200 text-gray-400' : 'text-gray-600'}`}>
              {formula.richiedeLunghezza ? 'Lungh. (m)' : '—'}
            </th>
            <th className={`px-2 py-1.5 text-center w-24 ${!formula.richiedeLarghezza ? 'bg-gray-200 text-gray-400' : 'text-gray-600'}`}>
              {formula.richiedeLarghezza ? 'Larg. (m)' : '—'}
            </th>
            <th className={`px-2 py-1.5 text-center w-24 ${!formula.richiedeAltezza ? 'bg-gray-200 text-gray-400' : 'text-gray-600'}`}>
              {formula.richiedeAltezza ? 'Alt. (m)' : '—'}
            </th>
            <th className="px-2 py-1.5 text-right w-28 text-gray-600">Parziale</th>
            <th className="w-28 bg-gray-100"></th>
            <th className="w-28 bg-gray-100"></th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {riga.misurazioni.map((mis, idx) => (
            <RigaMisurazione
              key={mis.id}
              misurazione={mis}
              unitaMisura={riga.unitaMisura}
              index={idx}
              onUpdate={updates => onUpdateMisurazione(riga.id, mis.id, updates)}
              onDelete={() => onDeleteMisurazione(riga.id, mis.id)}
              canDelete={riga.misurazioni.length > 1}
            />
          ))}
        </tbody>

        {/* Footer: aggiungi + totale */}
        <tfoot>
          <tr className="bg-gray-50 border-t border-gray-200">
            <td colSpan={5} className="px-3 py-2">
              <button
                onClick={() => onAddMisurazione(riga.id)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Aggiungi riga di misurazione
              </button>
            </td>
            <td className="px-3 py-2 text-right w-28">
              <div className="text-sm font-bold text-blue-800">
                {formattaNumero(riga.quantita)} <span className="text-xs font-normal text-gray-500">{riga.unitaMisura}</span>
              </div>
            </td>
            <td className="px-3 py-2 text-right w-28">
              <div className="text-xs text-gray-500">Totale quantità</div>
            </td>
            <td className="px-3 py-2 text-right w-28">
              <div className="text-sm font-bold text-blue-900">{formattaImporto(riga.importo)}</div>
            </td>
            <td className="w-10"></td>
          </tr>
          {/* Note (se non è __desc__) */}
          {noteVisibili && (
            <tr className="bg-amber-50 border-t border-amber-100">
              <td colSpan={9} className="px-3 py-1.5 text-xs text-amber-800">
                <span className="font-semibold">Note: </span>{noteVisibili}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
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
  const { apriRicerca } = useRicercaPrezzario();
  const righe = getRighePerCategoria(categoriaId);
  const totaleCategoria = totaliPerCategoria.find(t => t.categoriaId === categoriaId)?.totale || 0;

  const handleOpenRicerca = useCallback((rigaId: string) => {
    apriRicerca((voce) => {
      const titoloBreve = voce.voceBreve?.trim() || voce.descrizione.slice(0, 120);
      const descCompleta = voce.descrizione;
      dispatch({
        type: 'UPDATE_RIGA', payload: {
          id: rigaId,
          updates: {
            codice: voce.codice,
            descrizione: titoloBreve,
            unitaMisura: voce.unitaMisura,
            prezzoUnitario: voce.prezzoUnitario,
            note: descCompleta !== titoloBreve ? `__desc__${descCompleta}` : undefined,
          },
        }
      });
    });
  }, [apriRicerca, dispatch]);

  const handleAddRiga = () => dispatch({ type: 'ADD_RIGA', payload: { categoriaId } });
  const handleUpdateRiga = (id: string, updates: Partial<RigaComputo>) => dispatch({ type: 'UPDATE_RIGA', payload: { id, updates } });
  const handleDeleteRiga = (id: string) => { if (confirm('Eliminare questa voce?')) dispatch({ type: 'DELETE_RIGA', payload: id }); };
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
    [allRighe[indices[index]], allRighe[indices[newIndex]]] = [allRighe[indices[newIndex]], allRighe[indices[index]]];
    dispatch({ type: 'REORDER_RIGHE', payload: allRighe });
  };

  return (
    <div className="space-y-2">

      {/* Lista voci stile Primus */}
      {righe.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg px-4 py-12 text-center text-gray-500">
          <p className="font-medium text-base mb-1">Nessuna voce nel computo</p>
          <p className="text-sm mb-4">Aggiungi la prima voce o cercala nel prezzario</p>
          <Button onClick={handleAddRiga} size="sm">
            <Plus className="h-4 w-4 mr-2" />Aggiungi voce
          </Button>
        </div>
      ) : (
        righe.map((riga, index) => (
          <BloccoVoce
            key={riga.id}
            riga={riga}
            numero={index + 1}
            onUpdate={handleUpdateRiga}
            onDelete={handleDeleteRiga}
            onDuplicate={handleDuplicateRiga}
            onMoveUp={() => handleMoveRiga(index, 'up')}
            onMoveDown={() => handleMoveRiga(index, 'down')}
            onAddMisurazione={handleAddMisurazione}
            onUpdateMisurazione={handleUpdateMisurazione}
            onDeleteMisurazione={handleDeleteMisurazione}
            onOpenRicerca={handleOpenRicerca}
            isFirst={index === 0}
            isLast={index === righe.length - 1}
          />
        ))
      )}

      {/* Bottone aggiungi voce */}
      {righe.length > 0 && (
        <Button onClick={handleAddRiga} variant="outline" className="w-full py-3 border-dashed border-2 text-gray-500 hover:text-blue-600 hover:border-blue-300">
          <Plus className="h-4 w-4 mr-2" />Aggiungi Voce
        </Button>
      )}

      {/* Totale categoria */}
      {righe.length > 0 && (
        <div className="flex justify-end pt-2">
          <div className="bg-slate-800 text-white rounded-lg px-6 py-3 flex items-center gap-6">
            <span className="text-sm text-slate-300">{righe.length} voci</span>
            <span className="text-slate-400">|</span>
            <span className="text-sm text-slate-300">Totale categoria:</span>
            <span className="text-xl font-bold">{formattaImporto(totaleCategoria)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
