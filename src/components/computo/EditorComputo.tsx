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
  Table
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

  const handleIniziaModifica = (cat: Categoria) => {
    setCategoriaInModifica(cat);
    setNomeModifica(cat.nome);
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
    const numeroRighe = state.computoCorrente?.righe.filter(r => r.categoriaId === id).length || 0;
    
    const messaggio = numeroRighe > 0
      ? `La categoria "${categoria?.nome}" contiene ${numeroRighe} righe. Le righe verranno spostate nella categoria "Generale". Sei sicuro?`
      : `Sei sicuro di voler eliminare la categoria "${categoria?.nome}"?`;
    
    if (confirm(messaggio)) {
      dispatch({ type: 'DELETE_CATEGORIA', payload: id });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Categorie</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Aggiungi nuova */}
        <div className="flex gap-2 mb-4">
          <Input
            value={nuovaCategoria}
            onChange={(e) => setNuovaCategoria(e.target.value)}
            placeholder="Nuova categoria..."
            onKeyDown={(e) => e.key === 'Enter' && handleAggiungi()}
            className="flex-1"
          />
          <Button onClick={handleAggiungi} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Lista categorie */}
        <div className="space-y-2">
          {state.computoCorrente?.categorie.map((cat, index) => {
            const numeroRighe = state.computoCorrente?.righe.filter(r => r.categoriaId === cat.id).length || 0;
            const totale = state.computoCorrente?.righe
              .filter(r => r.categoriaId === cat.id)
              .reduce((sum, r) => sum + r.importo, 0) || 0;

            return (
              <div 
                key={cat.id} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
              >
                {categoriaInModifica?.id === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={nomeModifica}
                      onChange={(e) => setNomeModifica(e.target.value)}
                      className="h-7"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSalvaModifica();
                        if (e.key === 'Escape') setCategoriaInModifica(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={handleSalvaModifica} className="h-7 w-7 p-0">
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setCategoriaInModifica(null)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{index + 1}.</span>
                      <span className="font-medium">{cat.nome}</span>
                      <Badge variant="secondary" className="text-xs">
                        {numeroRighe} righe
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {formattaImporto(totale)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleIniziaModifica(cat)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      {index > 0 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleElimina(cat.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE INTESTAZIONE COMPUTI
// ============================================

function IntestazioneComputo() {
  const { state, dispatch } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    cliente: '',
    indirizzo: '',
    oggetto: '',
    numero: '',
  });

  const handleEdit = () => {
    if (state.computoCorrente) {
      setFormData({
        cliente: state.computoCorrente.intestazione.cliente,
        indirizzo: state.computoCorrente.intestazione.indirizzo,
        oggetto: state.computoCorrente.intestazione.oggetto,
        numero: state.computoCorrente.intestazione.numero || '',
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (state.computoCorrente) {
      dispatch({
        type: 'UPDATE_COMPUTO',
        payload: {
          id: state.computoCorrente.id,
          updates: {
            intestazione: {
              ...state.computoCorrente.intestazione,
              ...formData,
            }
          }
        }
      });
      setIsEditing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {state.computoCorrente?.nome}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Modifica
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => state.computoCorrente && esportaComputoPDF(state.computoCorrente)}
            >
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => state.computoCorrente && esportaComputoExcel(state.computoCorrente)}
            >
              <Table className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Cliente:</span>
              <p className="font-medium">{state.computoCorrente?.intestazione.cliente || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Numero:</span>
              <p className="font-medium">{state.computoCorrente?.intestazione.numero || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Indirizzo:</span>
              <p className="font-medium">{state.computoCorrente?.intestazione.indirizzo || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Data:</span>
              <p className="font-medium">
                {state.computoCorrente?.intestazione.data 
                  ? new Date(state.computoCorrente.intestazione.data).toLocaleDateString('it-IT')
                  : '-'
                }
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Oggetto:</span>
              <p className="font-medium">{state.computoCorrente?.intestazione.oggetto || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog modifica intestazione */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Intestazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Cliente</Label>
              <Input
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Nome cliente"
              />
            </div>
            <div>
              <Label>Indirizzo</Label>
              <Input
                value={formData.indirizzo}
                onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                placeholder="Indirizzo lavori"
              />
            </div>
            <div>
              <Label>Oggetto</Label>
              <Input
                value={formData.oggetto}
                onChange={(e) => setFormData({ ...formData, oggetto: e.target.value })}
                placeholder="Oggetto dei lavori"
              />
            </div>
            <div>
              <Label>Numero computo</Label>
              <Input
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="Numero/Protocollo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================
// COMPONENTE PRINCIPALE EDITOR
// ============================================

export function EditorComputo() {
  const { state, totaleGenerale } = useApp();
  const [categoriaEspansa, setCategoriaEspansa] = useState<Record<string, boolean>>({});

  // Espandi tutte le categorie all'apertura
  React.useEffect(() => {
    if (state.computoCorrente) {
      const espansi: Record<string, boolean> = {};
      state.computoCorrente.categorie.forEach(cat => {
        espansi[cat.id] = true;
      });
      setCategoriaEspansa(espansi);
    }
  }, [state.computoCorrente?.id]);

  const toggleCategoria = (catId: string) => {
    setCategoriaEspansa(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  if (!state.computoCorrente) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calculator className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nessun computo aperto</p>
          <p className="text-sm text-gray-400">Crea o apri un computo per iniziare</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intestazione */}
      <IntestazioneComputo />

      {/* Gestione Categorie */}
      <GestioneCategorie />

      {/* Categorie con tabelle */}
      <div className="space-y-6">
        {state.computoCorrente.categorie.map((categoria) => {
          const numeroRighe = state.computoCorrente?.righe.filter(r => r.categoriaId === categoria.id).length || 0;
          const totaleCategoria = state.computoCorrente?.righe
            .filter(r => r.categoriaId === categoria.id)
            .reduce((sum, r) => sum + r.importo, 0) || 0;

          return (
            <Card key={categoria.id}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleCategoria(categoria.id)}
              >
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {categoriaEspansa[categoria.id] ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <span>{categoria.nome}</span>
                    <Badge variant="secondary">{numeroRighe} righe</Badge>
                  </div>
                  <span className="text-lg font-bold">
                    {formattaImporto(totaleCategoria)}
                  </span>
                </CardTitle>
              </CardHeader>
              
              {categoriaEspansa[categoria.id] && (
                <CardContent>
                  <TabellaComputo categoriaId={categoria.id} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Totale Generale */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">TOTALE GENERALE COMPUTI</p>
              <p className="text-xs text-blue-400">
                {state.computoCorrente.righe.length} righe totali
              </p>
            </div>
            <p className="text-3xl font-bold text-blue-700">
              {formattaImporto(totaleGenerale)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
