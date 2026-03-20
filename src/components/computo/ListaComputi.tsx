import { useState } from 'react';
import { 
  Folder, 
  Plus, 
  Trash2, 
  FileText, 
  Calendar,
  ChevronRight,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/AppContext';
import { formattaImporto } from '@/utils/exportUtils';

// ============================================
// COMPONENTE CREA NUOVO COMPUTO
// ============================================

interface CreaComputoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreaComputoDialog({ open, onOpenChange }: CreaComputoDialogProps) {
  const { dispatch } = useApp();
  const [formData, setFormData] = useState({
    nome: '',
    cliente: '',
    indirizzo: '',
    oggetto: '',
    numero: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Il nome è obbligatorio';
    if (!formData.cliente.trim()) newErrors.cliente = 'Il cliente è obbligatorio';
    if (!formData.oggetto.trim()) newErrors.oggetto = 'L\'oggetto è obbligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      dispatch({
        type: 'CREATE_COMPUTO',
        payload: {
          nome: formData.nome.trim(),
          intestazione: {
            cliente: formData.cliente.trim(),
            indirizzo: formData.indirizzo.trim(),
            oggetto: formData.oggetto.trim(),
            data: new Date().toISOString(),
            numero: formData.numero.trim() || undefined,
          }
        }
      });
      
      // Reset form
      setFormData({
        nome: '',
        cliente: '',
        indirizzo: '',
        oggetto: '',
        numero: '',
      });
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Computo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Nome computo *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="es. Computo lavori ristrutturazione"
              className={errors.nome ? 'border-red-500' : ''}
            />
            {errors.nome && <p className="text-sm text-red-500 mt-1">{errors.nome}</p>}
          </div>
          
          <div>
            <Label>Cliente *</Label>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              placeholder="Nome del cliente"
              className={errors.cliente ? 'border-red-500' : ''}
            />
            {errors.cliente && <p className="text-sm text-red-500 mt-1">{errors.cliente}</p>}
          </div>
          
          <div>
            <Label>Indirizzo lavori</Label>
            <Input
              value={formData.indirizzo}
              onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
              placeholder="Indirizzo dei lavori"
            />
          </div>
          
          <div>
            <Label>Oggetto *</Label>
            <Input
              value={formData.oggetto}
              onChange={(e) => setFormData({ ...formData, oggetto: e.target.value })}
              placeholder="Descrizione dei lavori"
              className={errors.oggetto ? 'border-red-500' : ''}
            />
            {errors.oggetto && <p className="text-sm text-red-500 mt-1">{errors.oggetto}</p>}
          </div>
          
          <div>
            <Label>Numero/Protocollo</Label>
            <Input
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              placeholder="Numero del computo (opzionale)"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="h-4 w-4 mr-1" />
            Crea Computo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE LISTA COMPUTI
// ============================================

export function ListaComputi() {
  const { state, dispatch, importComputo } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleApriComputo = (id: string) => {
    dispatch({ type: 'OPEN_COMPUTO', payload: id });
  };

  const handleEliminaComputo = (id: string, nome: string) => {
    if (confirm(`Sei sicuro di voler eliminare il computo "${nome}"?`)) {
      dispatch({ type: 'DELETE_COMPUTO', payload: id });
    }
  };

  const filteredComputi = state.computi.filter(computo =>
    computo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    computo.intestazione.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    computo.intestazione.oggetto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordina per data modifica (più recente prima)
  const sortedComputi = [...filteredComputi].sort(
    (a, b) => new Date(b.dataModifica).getTime() - new Date(a.dataModifica).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">I miei Computi</h2>
          <p className="text-gray-500">
            {state.computi.length} {state.computi.length === 1 ? 'computo' : 'computi'} salvati
          </p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Button asChild variant="outline">
              <span>📂 Importa JSON</span>
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={(e) => { if(e.target.files?.[0]) importComputo(e.target.files[0]); }} />
          </label>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Computo
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per nome, cliente o oggetto..."
          className="pl-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Lista */}
      {sortedComputi.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            {searchTerm ? (
              <>
                <p className="text-gray-500">Nessun computo trovato</p>
                <p className="text-sm text-gray-400">Prova a modificare i termini di ricerca</p>
              </>
            ) : (
              <>
                <p className="text-gray-500">Nessun computo salvato</p>
                <p className="text-sm text-gray-400 mb-4">Crea il tuo primo computo per iniziare</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Computo
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedComputi.map((computo) => {
            const totale = computo.righe.reduce((sum, r) => sum + r.importo, 0);
            const numeroRighe = computo.righe.length;
            
            return (
              <Card 
                key={computo.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleApriComputo(computo.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold text-lg">{computo.nome}</h3>
                        {computo.intestazione.numero && (
                          <Badge variant="outline">N. {computo.intestazione.numero}</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Cliente:</span>
                          <span>{computo.intestazione.cliente}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>
                            {new Date(computo.dataModifica).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="text-gray-400">Oggetto:</span>
                          <span className="truncate">{computo.intestazione.oggetto}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">
                          {numeroRighe} {numeroRighe === 1 ? 'riga' : 'righe'}
                        </Badge>
                        <Badge variant="secondary">
                          {computo.categorie.length} {computo.categorie.length === 1 ? 'categoria' : 'categorie'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-2xl font-bold text-blue-600">
                        {formattaImporto(totale)}
                      </p>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApriComputo(computo.id);
                          }}
                        >
                          Apri
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminaComputo(computo.id, computo.nome);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog crea computo */}
      <CreaComputoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
