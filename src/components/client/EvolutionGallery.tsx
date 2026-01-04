import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Plus, Trash2, Calendar, Scale, Percent, 
  X, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight,
  ZoomIn, MessageSquare, ArrowLeftRight, TrendingUp, LayoutGrid
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';
import FadeScrollList from '@/components/shared/FadeScrollList';

// Lazy load heavy components for faster initial render
const PhotoComparison = lazy(() => import('./PhotoComparison'));
const EvolutionCharts = lazy(() => import('./EvolutionCharts'));

const TabLoader = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

interface EvolutionPhoto {
  id: string;
  photo_url: string;
  photo_date: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  notes: string | null;
  photo_type: string;
  created_at: string;
}

const photoTypeLabels: Record<string, string> = {
  front: 'Frente',
  back: 'Costas',
  side_left: 'Lado Esquerdo',
  side_right: 'Lado Direito',
};

const EvolutionGallery: React.FC = () => {
  const { profile, user } = useAuth();
  const { playClickSound } = useAudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photos, setPhotos] = useState<EvolutionPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<EvolutionPhoto | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [photoTypeFilter, setPhotoTypeFilter] = useState<string>('all');
  
  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    preview: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    bodyFat: '',
    notes: '',
    type: 'front',
  });

  useEffect(() => {
    if (profile?.profile_id) {
      fetchPhotos();
    }
  }, [profile?.profile_id]);

  const fetchPhotos = async () => {
    if (!profile?.profile_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evolution_photos')
        .select('*')
        .eq('profile_id', profile.profile_id)
        .order('photo_date', { ascending: false });
      
      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error fetching photos:', err);
      toast.error('Erro ao carregar fotos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas imagens');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB');
      return;
    }
    
    const preview = URL.createObjectURL(file);
    setUploadData(prev => ({ ...prev, file, preview }));
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!uploadData.file || !user?.id || !profile?.profile_id) {
      toast.error('Selecione uma imagem');
      return;
    }
    
    setUploading(true);
    try {
      const fileExt = uploadData.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('evolution-photos')
        .upload(fileName, uploadData.file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('evolution-photos')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('evolution_photos')
        .insert({
          profile_id: profile.profile_id,
          photo_url: publicUrl,
          photo_date: uploadData.date,
          weight_kg: uploadData.weight ? parseFloat(uploadData.weight) : null,
          body_fat_percentage: uploadData.bodyFat ? parseFloat(uploadData.bodyFat) : null,
          notes: uploadData.notes || null,
          photo_type: uploadData.type,
        });
      
      if (insertError) throw insertError;
      
      toast.success('Foto adicionada com sucesso!');
      setShowUploadDialog(false);
      resetUploadData();
      fetchPhotos();
    } catch (err: any) {
      console.error('Error uploading:', err);
      toast.error(`Erro ao enviar foto: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: EvolutionPhoto) => {
    if (!confirm('Tem certeza que deseja excluir esta foto?')) return;
    
    setDeleting(photo.id);
    try {
      // Extract file path from URL
      const urlParts = photo.photo_url.split('/evolution-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('evolution-photos').remove([filePath]);
      }
      
      const { error } = await supabase
        .from('evolution_photos')
        .delete()
        .eq('id', photo.id);
      
      if (error) throw error;
      
      toast.success('Foto excluída');
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      if (selectedPhoto?.id === photo.id) {
        setShowPhotoDialog(false);
        setSelectedPhoto(null);
      }
    } catch (err: any) {
      console.error('Error deleting:', err);
      toast.error('Erro ao excluir foto');
    } finally {
      setDeleting(null);
    }
  };

  const resetUploadData = () => {
    if (uploadData.preview) URL.revokeObjectURL(uploadData.preview);
    setUploadData({
      file: null,
      preview: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
      bodyFat: '',
      notes: '',
      type: 'front',
    });
  };

  const openPhotoViewer = (photo: EvolutionPhoto, index: number) => {
    playClickSound();
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    setShowPhotoDialog(true);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? (selectedIndex - 1 + photos.length) % photos.length
      : (selectedIndex + 1) % photos.length;
    setSelectedIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  // Filter photos by type
  const filteredPhotos = useMemo(() => {
    if (photoTypeFilter === 'all') return photos;
    return photos.filter(p => p.photo_type === photoTypeFilter);
  }, [photos, photoTypeFilter]);

  // Group photos by month
  const groupedPhotos = filteredPhotos.reduce((acc, photo) => {
    const month = format(new Date(photo.photo_date), 'MMMM yyyy', { locale: ptBR });
    if (!acc[month]) acc[month] = [];
    acc[month].push(photo);
    return acc;
  }, {} as Record<string, EvolutionPhoto[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      <ClientPageHeader 
        title="GALERIA DE EVOLUÇÃO"
        icon={<Camera className="w-6 h-6" />}
        iconColor="text-purple-500"
      />
      
      <FadeScrollList className="flex-1 space-y-4 pr-1">
        {/* Tabs for Gallery / Compare / Charts */}
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="gallery" className="text-xs sm:text-sm flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Galeria</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-xs sm:text-sm flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Comparar</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-xs sm:text-sm flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gráficos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-0">
            {/* Filter + Add Photo Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Select value={photoTypeFilter} onValueChange={setPhotoTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Filtrar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="front">Frente</SelectItem>
                    <SelectItem value="back">Costas</SelectItem>
                    <SelectItem value="side_left">Lado Esquerdo</SelectItem>
                    <SelectItem value="side_right">Lado Direito</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Button
                onClick={() => {
                  playClickSound();
                  fileInputRef.current?.click();
                }}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Adicionar</span> Foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

        {/* Photo Grid */}
        {filteredPhotos.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardContent className="p-8 text-center">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">
                {photos.length === 0 ? 'Nenhuma foto registrada' : 'Nenhuma foto deste tipo'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {photos.length === 0 
                  ? 'Adicione fotos para acompanhar sua evolução física ao longo do tempo.'
                  : 'Tente selecionar outro filtro ou adicione mais fotos.'}
              </p>
              {photos.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Tirar Primeira Foto
                </Button>
              )}
              {photos.length > 0 && photoTypeFilter !== 'all' && (
                <Button
                  variant="outline"
                  onClick={() => setPhotoTypeFilter('all')}
                >
                  Ver Todas as Fotos
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedPhotos).map(([month, monthPhotos]) => (
            <div key={month} className="space-y-3">
              <h3 className="font-bebas text-lg text-purple-500 capitalize">{month}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {monthPhotos.map((photo, idx) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden bg-card border border-border/50 cursor-pointer group"
                    onClick={() => openPhotoViewer(photo, photos.indexOf(photo))}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`Evolução ${photo.photo_date}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs font-medium">
                        {format(new Date(photo.photo_date), 'dd/MM/yyyy')}
                      </p>
                      <div className="flex items-center gap-2 text-[10px]">
                        {photo.weight_kg && <span>{photo.weight_kg}kg</span>}
                        {photo.body_fat_percentage && <span>{photo.body_fat_percentage}%</span>}
                      </div>
                    </div>
                    <Badge 
                      className="absolute top-2 left-2 text-[10px] bg-black/50 text-white border-0"
                    >
                      {photoTypeLabels[photo.photo_type] || photo.photo_type}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      disabled={deleting === photo.id}
                    >
                      {deleting === photo.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
          </TabsContent>

          <TabsContent value="compare" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <PhotoComparison photos={photos} />
            </Suspense>
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <EvolutionCharts photos={photos} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </FadeScrollList>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!open) resetUploadData();
        setShowUploadDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-500" />
              Adicionar Foto de Evolução
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {uploadData.preview && (
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                <img
                  src={uploadData.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  value={uploadData.date}
                  onChange={(e) => setUploadData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={uploadData.type}
                  onValueChange={(v) => setUploadData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front">Frente</SelectItem>
                    <SelectItem value="back">Costas</SelectItem>
                    <SelectItem value="side_left">Lado Esquerdo</SelectItem>
                    <SelectItem value="side_right">Lado Direito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Peso (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 75.5"
                  value={uploadData.weight}
                  onChange={(e) => setUploadData(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Gordura (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 15.5"
                  value={uploadData.bodyFat}
                  onChange={(e) => setUploadData(prev => ({ ...prev, bodyFat: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Observações
              </label>
              <Textarea
                placeholder="Como você se sente? Alguma conquista?"
                value={uploadData.notes}
                onChange={(e) => setUploadData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadData.file}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Salvar Foto
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedPhoto && (
              <motion.div
                key={selectedPhoto.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <img
                  src={selectedPhoto.photo_url}
                  alt={`Evolução ${selectedPhoto.photo_date}`}
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
                
                {/* Navigation */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => navigatePhoto('prev')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => navigatePhoto('next')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
                
                {/* Close button */}
                <button
                  onClick={() => setShowPhotoDialog(false)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {/* Info panel */}
                <div className="p-4 bg-card border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{photoTypeLabels[selectedPhoto.photo_type]}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(selectedPhoto.photo_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {selectedPhoto.weight_kg && (
                          <span className="flex items-center gap-1">
                            <Scale className="w-4 h-4 text-blue-500" />
                            {selectedPhoto.weight_kg} kg
                          </span>
                        )}
                        {selectedPhoto.body_fat_percentage && (
                          <span className="flex items-center gap-1">
                            <Percent className="w-4 h-4 text-orange-500" />
                            {selectedPhoto.body_fat_percentage}% gordura
                          </span>
                        )}
                      </div>
                      {selectedPhoto.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{selectedPhoto.notes}"
                        </p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedPhoto)}
                      disabled={deleting === selectedPhoto.id}
                    >
                      {deleting === selectedPhoto.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default EvolutionGallery;
