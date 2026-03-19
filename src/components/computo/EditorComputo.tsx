import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Calculator,
  FileDown,
  Table,
  User,
  LayoutList,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/AppContext';
import { TabellaComputo } from './TabellaComputo';
import { esportaComputoPDF, esportaComputoExcel, formattaImporto } from '@/utils/exportUtils';
import type { Categoria } from '@/types';

// ============================================
// COMPONENTE GESTIONE CATEGORIE
// ============================================
function GestioneCategorie() {
  const { state, dispatch } = useApp();
  const [nuovaCategoria, setNuovaCategoria] = useState('');
  const [categoriaInModifica, setCategoriaInModifica] = useState<Categoria | null>(null);
  const [nomeModifica, setNomeModifica] = useState('');

  const handleAggiungi = () => {
    if (nuovaCategoria.trim()) {
      dispatch({
        type: 'ADD_CATEGORIA',
        payload: { nome: nuovaCategoria.trim() }
      });
      setNuovaCategoria('');
    }
  };

  const handleSalvaModifica = () => {
    if (categoriaInModifica && nomeModifica.trim()) {
      dispatch({
        type: 'UPDATE_CATEGORIA',
        payload: { id: categoriaInModifica.id, updates: { nome: nomeModifica.trim() } }
      });
      setCategoriaInModifica(null);
    }
  };

  const handleElimina = (id: string) => {
    const categoria = state.computoCorrente?.categorie.find(c => c.id === id);
    if (confirm(`Eliminare la categoria "${categoria?.nome}"?`)) {
      dispatch({ type: 'DELETE_CATEGORIA', payload: id });
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <LayoutList className="w-5 h-5 text-blue-600" /> Capitoli e Categorie
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex gap-2 mb-6">
          <Input
            value={nuovaCategoria}
            onChange={(e) => setNuovaCategoria(e.target.value)}
            placeholder="Nuovo capitolo (es: Opere Murarie)"
            onKeyDown={(e) => e.key === 'Enter' && handleAggiungi()}
            className="flex-1 bg-white"
          />
          <Button onClick={handleAggiungi} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Aggiungi
          </Button>
        </div>

        <div className="space-y-2">
          {state.computoCorrente?.categorie.map((cat, index) => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors group">
              {categoriaInModifica?.id === cat.id ? (
                <div className="flex flex-1 gap-2">
                  <Input
                    value={nomeModifica}
                    onChange={(e) => setNomeModifica(e.target.value)}
                    className="h-9"
                    autoFocus
                  />
                  <Button onClick={handleSalvaModifica} size="sm" className="bg-green-600">Salva</Button>
                  <Button onClick={() => setCategoriaInModifica(null)} variant="ghost" size="sm">Annulla</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full">{index + 1}</span>
                    <span className="font-semibold text-gray-700">{cat.nome}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCategoriaInModifica(cat); setNomeModifica(cat.nome); }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleElimina(cat.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE INTESTAZIONE
// ============================================
function IntestazioneComputo() {
  const { state, dispatch } = useApp();
  
  const updateIntestazione = (field: string, value: string) => {
    if (!state.computoCorrente) return;
    dispatch({
      type: 'UPDATE_COMPUTO',
      payload: {
        id: state.computoCorrente.id,
        updates: {
          intestazione: {
            ...state.computoCorrente.intestazione,
            [field]: value
          }
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
       <Card className="border-gray-200 shadow-sm">
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <User className="w-5 h-5 text-blue-600" /> Dati Cliente
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome Cliente / Azienda</Label>
              <Input 
                value={state.computoCorrente?.intestazione.cliente || ''} 
                onChange={(e) => updateIntestazione('cliente', e.target.value)}
                placeholder="es: Mario Rossi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Indirizzo Lavori</Label>
              <Input 
                value={state.computoCorrente?.intestazione.indirizzo || ''} 
                onChange={(e) => updateIntestazione('indirizzo', e.target.value)}
                placeholder="es: Via Roma 1, Napoli"
              />
            </div>
         </CardContent>
       </Card>

       <Card className="border-gray-200 shadow-sm">
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <FileText className="w-5 h-5 text-blue-600" /> Dati Progetto
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Oggetto dei Lavori</Label>
              <Input 
                value={state.computoCorrente?.intestazione.oggetto || ''} 
                onChange={(e) => updateIntestazione('oggetto', e.target.value)}
                placeholder="es: Ristrutturazione appartamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Numero Computo</Label>
                <Input 
                  value={state.computoCorrente?.intestazione.numero || ''} 
                  onChange={(e) => updateIntestazione('numero', e.target.value)}
                  placeholder="es: 01/2024"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input 
                  type="date"
                  value={state.computoCorrente?.intestazione.data.split('T')[0] || ''} 
                  onChange={(e) => updateIntestazione('data', e.target.value)}
                />
              </div>
            </div>
         </CardContent>
       </Card>
    </div>
  );
}

// ============================================
// COMPONENTE RIEPILOGO E STAMPA
// ============================================
function RiepilogoStampa() {
  const { state, totaleGenerale } = useApp();
  if (!state.computoCorrente) return null;

  return (
    <div className="space-y-8 py-4">
       <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-gray-800">Riepilogo Finale</h2>
            <p className="text-gray-500">Controlla i totali e scarica il documento</p>
          </div>
          <div className="flex gap-3">
             <Button 
               onClick={() => esportaComputoPDF(state.computoCorrente!)}
               className="bg-blue-600 hover:bg-blue-700 font-bold"
             >
               <FileDown className="w-4 h-4 mr-2" /> Scarica PDF PriMus
             </Button>
             <Button 
               variant="outline"
               onClick={() => esportaComputoExcel(state.computoCorrente!)}
             >
               <FileDown className="w-4 h-4 mr-2" /> Esporta Excel
             </Button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
             <CardHeader>
               <CardTitle className="text-base uppercase tracking-wider text-gray-500">Dettaglio per Categoria</CardTitle>
             </CardHeader>
             <CardContent className="px-0">
                <table className="w-full">
                   <thead>
                     <tr className="bg-gray-50 text-[10px] text-gray-400 border-y">
                        <th className="px-6 py-2 text-left">CAPITOLO</th>
                        <th className="px-6 py-2 text-center">VOCI</th>
                        <th className="px-6 py-2 text-right">IMPORTO</th>
                     </tr>
                   </thead>
                   <tbody>
                      {state.computoCorrente.categorie.map(cat => {
                        const righeCat = state.computoCorrente!.righe.filter(r => r.categoriaId === cat.id);
                        const totale = righeCat.reduce((s, r) => s + r.importo, 0);
                        return (
                          <tr key={cat.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                             <td className="px-6 py-4 font-semibold text-gray-700">{cat.nome}</td>
                             <td className="px-6 py-4 text-center text-gray-500">{righeCat.length}</td>
                             <td className="px-6 py-4 text-right font-bold text-blue-600">{formattaImporto(totale)}</td>
                          </tr>
                        );
                      })}
                   </tbody>
                </table>
             </CardContent>
          </Card>

          <Card className="bg-blue-700 text-white h-fit shadow-xl border-0">
             <CardHeader>
               <CardTitle className="text-white/80 text-xs uppercase font-black tracking-widest">Totale Generale</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-4xl font-black mb-1">{formattaImporto(totaleGenerale)}</div>
                <div className="text-xs text-white/60">Totale calcolato su {state.computoCorrente.righe.length} voci totali</div>
                <Separator className="my-6 bg-white/20" />
                <div className="space-y-4">
                   <div className="text-xs font-bold flex justify-between">
                      <span>Imponibile</span>
                      <span>{formattaImporto(totaleGenerale)}</span>
                   </div>
                   <div className="text-xs font-bold flex justify-between">
                      <span>IVA (esclusa)</span>
                      <span>0,00 €</span>
                   </div>
                </div>
             </CardContent>
          </Card>
       </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPALE EDITOR
// ============================================
export function EditorComputo() {
  const { state } = useApp();
  const [tabAttiva, setTabAttiva] = useState<'intestazione' | 'computo' | 'categorie' | 'riepilogo'>('computo');
  const [categoriaEspansa, setCategoriaEspansa] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (state.computoCorrente) {
      const espansi: Record<string, boolean> = {};
      state.computoCorrente.categorie.forEach(cat => { espansi[cat.id] = true; });
      setCategoriaEspansa(espansi);
    }
  }, [state.computoCorrente?.id]);

  const toggleCategoria = (catId: string) => {
    setCategoriaEspansa(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (!state.computoCorrente) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* TABS STILE PRIMUS */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-8 gap-1 w-fit mx-auto shadow-inner border border-gray-200">
        {[
          { id: 'intestazione', label: 'Dati Generali', icon: User },
          { id: 'categorie', label: 'Capitoli', icon: LayoutList },
          { id: 'computo', label: 'Computo Metrico', icon: Calculator },
          { id: 'riepilogo', label: 'Riepilogo e Stampa', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabAttiva(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${
              tabAttiva === tab.id 
              ? 'bg-white text-blue-700 shadow-md transform scale-105' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENUTO TAB */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {tabAttiva === 'intestazione' && <IntestazioneComputo />}
        
        {tabAttiva === 'categorie' && <GestioneCategorie />}
        
        {tabAttiva === 'computo' && (
          <div className="space-y-4">
            {state.computoCorrente.categorie.map((categoria) => {
              const righeCat = state.computoCorrente!.righe.filter(r => r.categoriaId === categoria.id);
              const totCat = righeCat.reduce((s, r) => s + r.importo, 0);
              
              return (
                <div key={categoria.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleCategoria(categoria.id)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-gray-50/50 hover:bg-gray-50 transition-colors border-b"
                  >
                    <div className="flex items-center gap-3">
                      {categoriaEspansa[categoria.id] ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{categoria.nome}</span>
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 border-0">{righeCat.length} voci</Badge>
                    </div>
                    <span className="text-sm font-black text-blue-700">{formattaImporto(totCat)}</span>
                  </button>
                  {categoriaEspansa[categoria.id] && (
                    <div className="p-4 bg-gray-50/20">
                      <TabellaComputo categoriaId={categoria.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tabAttiva === 'riepilogo' && <RiepilogoStampa />}
      </div>
    </div>
  );
}
