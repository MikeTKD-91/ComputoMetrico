import { useCallback } from 'react';
import { Plus, Trash2, Copy, AlertCircle, Search, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp, useRicercaPrezzario } from '@/App';
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
          className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center mx-auto transition-colors ${isNeg ? 'bg-red-200 text-red-700 hover:bg-red-300' : 'bg-green-200 text-green-700 hover:bg-green-300'}`}
        >
          {isNeg ? '−' : '+'}
        </button>
      </td>

      {/* Descrizione misurazione */}
      <td className="px-2 py-1.5 min-w-[300px]">
        <input
          value={misurazione.descrizione}
          onChange={(e) => onUpdate({ descrizione: e.target.value })}
          placeholder="es: piano terra, bagno, detrazione finestra..."
          className="w-full h-8 px-2 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded hover:bg-white/50 transition-colors"
        />
      </td>

      {/* Lunghezza */}
      <td className="px-2 py-1.5 w-24">
        {formula.richiedeLunghezza ? (
          <input
            type="number"
            value={misurazione.lunghezza ?? ''}
            onChange={(e) => onUpdate({ lunghezza: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0.00"
            className="w-full h-8 px-2 text-sm text-right border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded"
            step="0.01"
          />
        ) : <span className="block text-center text-gray-300">—</span>}
      </td>

      {/* Larghezza */}
      <td className="px-2 py-1.5 w-24">
        {formula.richiedeLarghezza ? (
          <input
            type="number"
            value={misurazione.larghezza ?? ''}
            onChange={(e) => onUpdate({ larghezza: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0.00"
            className="w-full h-8 px-2 text-sm text-right border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded"
            step="0.01"
          />
        ) : <span className="block text-center text-gray-300">—</span>}
      </td>

      {/* Altezza */}
      <td className="px-2 py-1.5 w-24">
        {formula.richiedeAltezza ? (
          <input
            type="number"
            value={misurazione.altezza ?? ''}
            onChange={(e) => onUpdate({ altezza: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0.00"
            className="w-full h-8 px-2 text-sm text-right border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded"
            step="0.01"
          />
        ) : <span className="block text-center text-gray-300">—</span>}
      </td>

      {/* Quantità parziale */}
      <td className="px-2 py-1.5 w-32 text-right font-medium">
        {isManuale ? (
          <input
            type="number"
            value={misurazione.quantitaParziale || ''}
            onChange={(e) => onUpdate({ quantitaParziale: e.target.value ? parseFloat(e.target.value) : 0 })}
            placeholder="0.00"
            className="w-full h-8 px-2 text-sm text-right border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded font-bold"
            step="0.01"
          />
        ) : (
          <span className={`${isNeg ? 'text-red-600' : 'text-gray-700'}`}>
            {isNeg ? '−' : '+'}{formattaNumero(Math.abs(misurazione.quantitaParziale))}
          </span>
        )}
      </td>

      {/* Azioni */}
      <td className="px-2 py-1.5 w-10 text-center">
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 p-1"
          >
            <Trash2 className="w-4 h-4" />
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
  riga,
  numero,
  onUpdate,
  onDelete,
  onDuplicate,
  
  
  onAddMisurazione,
  onUpdateMisurazione,
  onDeleteMisurazione,
  onOpenRicerca,

}: RigaComputoProps) {
  const { validaRiga } = useApp();
  const validazione = validaRiga(riga);
  const formula = UNITA_MISURA_FORMULE[riga.unitaMisura];

  const descCompleta = riga.note?.startsWith('__desc__') ? riga.note.replace('__desc__', '') : null;
  const noteVisibili = riga.note && !riga.note.startsWith('__desc__') ? riga.note : '';

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* HEADER VOCE (Stile PriMus reale: sfondo grigio chiaro, bordo blu sinistro) */}
      <div className="bg-gray-100/80 border-l-4 border-blue-600 px-4 py-3 flex items-center gap-3">
        <span className="text-sm font-black text-gray-400 w-8">{numero}</span>
        
        <input
          value={riga.codice}
          onChange={(e) => onUpdate(riga.id, { codice: e.target.value })}
          placeholder="Codice"
          className="w-32 h-8 px-2 text-xs font-mono bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
        />

        <div className="flex-1">
          <input
            value={riga.descrizione}
            onChange={(e) => onUpdate(riga.id, { descrizione: e.target.value })}
            placeholder="Descrizione lavorazione..."
            className="w-full h-8 px-2 text-sm font-bold bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <select
          value={riga.unitaMisura}
          onChange={(e) => onUpdate(riga.id, { unitaMisura: e.target.value as UnitàMisura })}
          className="w-24 h-8 px-2 text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
        >
          {Object.entries(UNITA_MISURA_FORMULE).map(([key, info]) => (
            <option key={key} value={key}>{key} — {info.descrizione}</option>
          ))}
        </select>

        <input
          type="number"
          value={riga.prezzoUnitario || ''}
          onChange={(e) => onUpdate(riga.id, { prezzoUnitario: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          className="w-28 h-8 px-2 text-sm text-right font-medium bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
          step="0.01"
        />

        <div className="w-36 text-right">
          <span className="text-xs text-gray-500 block uppercase font-bold tracking-tighter">Importo</span>
          <span className="text-sm font-black text-blue-700">{formattaImporto(riga.importo)}</span>
        </div>

        <div className="flex items-center gap-1 ml-2 border-l pl-3 border-gray-300">
           <button onClick={() => onOpenRicerca(riga.id)} title="Cerca nel prezzario" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
             <Search className="w-4 h-4" />
           </button>
           <button onClick={() => onDuplicate(riga.id)} title="Duplica voce" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
             <Copy className="w-4 h-4" />
           </button>
           <button onClick={() => onDelete(riga.id)} title="Elimina voce" className="p-1.5 text-red-500 hover:bg-red-50 rounded">
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* AREA DESCRIZIONE ESTESA (se presente) */}
      {descCompleta && (
        <div className="px-14 py-2 bg-blue-50/30 text-xs text-gray-500 leading-relaxed border-b border-gray-100">
          <p className="line-clamp-2 hover:line-clamp-none cursor-default transition-all">{descCompleta}</p>
        </div>
      )}

      {/* TABELLA MISURAZIONI */}
      <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">          <thead>
            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="px-2 py-2 font-medium w-10 text-center">±</th>
              <th className="px-2 py-2 font-medium text-left min-w-[300px]">Dettaglio misurazioni</th>
              <th className="px-2 py-2 font-medium text-right w-24">Lungh. (m)</th>
              <th className="px-2 py-2 font-medium text-right w-24">Larg. (m)</th>
              <th className="px-2 py-2 font-medium text-right w-24">Alt. (m)</th>
              <th className="px-2 py-2 font-medium text-right w-32">Parziale</th>
              <th className="px-2 py-2 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {riga.misurazioni.map((mis, idx) => (
              <RigaMisurazione
                key={mis.id}
                misurazione={mis}
                unitaMisura={riga.unitaMisura}
                index={idx}
                onUpdate={(updates) => onUpdateMisurazione(riga.id, mis.id, updates)}
                onDelete={() => onDeleteMisurazione(riga.id, mis.id)}
                canDelete={riga.misurazioni.length > 1}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/30">
              <td colSpan={2} className="px-4 py-2">
                <button
                  onClick={() => onAddMisurazione(riga.id)}
                  className="text-xs flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
                >
                  <PlusCircle className="w-4 h-4" /> Aggiungi riga di misura
                </button>
              </td>
              <td colSpan={3} className="px-4 py-2 text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400">Totale Quantità</span>
              </td>
              <td className="px-2 py-2 text-right">
                <span className="text-sm font-black text-gray-800">
                  {formattaNumero(riga.quantita)} <span className="text-[10px] text-gray-400 font-normal">{riga.unitaMisura}</span>
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* NOTE */}
      {noteVisibili && (
        <div className="px-4 py-2 bg-amber-50/50 border-t border-amber-100 flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-800 italic">{noteVisibili}</p>
        </div>
      )}
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
  const { dispatch, getRighePerCategoria, totaliPerCategoria } = useApp();
  const { apriRicerca } = useRicercaPrezzario();
  const righe = getRighePerCategoria(categoriaId);
  const totaleCategoria = totaliPerCategoria.find(t => t.categoriaId === categoriaId)?.totale || 0;

  const handleOpenRicerca = useCallback((rigaId: string) => {
    apriRicerca((voce) => {
      const titoloBreve = voce.voceBreve?.trim() || voce.descrizione.slice(0, 120);
      const descCompleta = voce.descrizione;
      
      dispatch({
        type: 'UPDATE_RIGA',
        payload: {
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
  const handleDeleteRiga = (id: string) => {
    if (confirm('Eliminare questa voce?')) dispatch({ type: 'DELETE_RIGA', payload: id });
  };
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
    <div className="py-2">
      {righe.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
          <p className="text-gray-400 text-sm mb-4">Nessuna voce in questa categoria</p>
          <Button onClick={handleAddRiga} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Aggiungi la prima voce
          </Button>
        </div>
      ) : (
        <>
          {righe.map((riga, index) => (
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
          ))}
          
          <div className="flex justify-between items-center bg-blue-600 text-white px-6 py-4 rounded-xl shadow-lg mt-4">
             <Button onClick={handleAddRiga} className="bg-white text-blue-700 hover:bg-blue-50 border-0 font-bold gap-2">
               <Plus className="w-5 h-5" /> Aggiungi Voce
             </Button>
             <div className="text-right">
                <span className="text-xs opacity-80 uppercase font-bold block">Totale Categoria</span>
                <span className="text-2xl font-black">{formattaImporto(totaleCategoria)}</span>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
