import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, Calendar, Scale, Percent,
  TrendingUp, TrendingDown, Minus, Maximize2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EvolutionPhoto {
  id: string;
  photo_url: string;
  photo_date: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  notes: string | null;
  photo_type: string;
}

interface PhotoComparisonProps {
  photos: EvolutionPhoto[];
}

const photoTypeLabels: Record<string, string> = {
  front: 'Frente',
  back: 'Costas',
  side_left: 'Lado Esquerdo',
  side_right: 'Lado Direito',
};

const PhotoComparison: React.FC<PhotoComparisonProps> = ({ photos }) => {
  const [beforeId, setBeforeId] = useState<string>('');
  const [afterId, setAfterId] = useState<string>('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'slider' | 'sideBySide'>('sideBySide');
  const [fullscreen, setFullscreen] = useState(false);
  const [photoTypeFilter, setPhotoTypeFilter] = useState<string>('all');

  // Filter photos by type
  const filteredPhotos = useMemo(() => {
    if (photoTypeFilter === 'all') return photos;
    return photos.filter(p => p.photo_type === photoTypeFilter);
  }, [photos, photoTypeFilter]);

  // Sort photos by date
  const sortedPhotos = useMemo(() => 
    [...filteredPhotos].sort((a, b) => new Date(a.photo_date).getTime() - new Date(b.photo_date).getTime()),
    [filteredPhotos]
  );

  // Auto-select first and last photo when filter changes
  React.useEffect(() => {
    if (sortedPhotos.length >= 2) {
      setBeforeId(sortedPhotos[0].id);
      setAfterId(sortedPhotos[sortedPhotos.length - 1].id);
    } else if (sortedPhotos.length === 1) {
      setBeforeId(sortedPhotos[0].id);
      setAfterId('');
    } else {
      setBeforeId('');
      setAfterId('');
    }
  }, [sortedPhotos]);

  const beforePhoto = filteredPhotos.find(p => p.id === beforeId);
  const afterPhoto = filteredPhotos.find(p => p.id === afterId);

  const stats = useMemo(() => {
    if (!beforePhoto || !afterPhoto) return null;
    
    const daysDiff = differenceInDays(
      new Date(afterPhoto.photo_date),
      new Date(beforePhoto.photo_date)
    );
    
    const weightDiff = beforePhoto.weight_kg && afterPhoto.weight_kg
      ? afterPhoto.weight_kg - beforePhoto.weight_kg
      : null;
    
    const fatDiff = beforePhoto.body_fat_percentage && afterPhoto.body_fat_percentage
      ? afterPhoto.body_fat_percentage - beforePhoto.body_fat_percentage
      : null;
    
    return { daysDiff, weightDiff, fatDiff };
  }, [beforePhoto, afterPhoto]);

  if (photos.length < 2) {
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardContent className="p-6 text-center">
          <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Adicione pelo menos 2 fotos para comparar sua evolução
          </p>
        </CardContent>
      </Card>
    );
  }

  const ComparisonContent = () => (
    <div className="space-y-4">
      {/* Photo Type Filter */}
      <div className="flex items-center gap-2">
        <Select value={photoTypeFilter} onValueChange={setPhotoTypeFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
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
        <span className="text-xs text-muted-foreground">
          {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredPhotos.length < 2 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">
            {filteredPhotos.length === 0 
              ? 'Nenhuma foto deste tipo encontrada'
              : 'Adicione mais fotos deste tipo para comparar'}
          </p>
          {photoTypeFilter !== 'all' && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setPhotoTypeFilter('all')}
            >
              Ver Todos os Tipos
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Photo Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ANTES</label>
              <Select value={beforeId} onValueChange={setBeforeId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {sortedPhotos.map(photo => (
                    <SelectItem key={photo.id} value={photo.id} disabled={photo.id === afterId}>
                      {format(new Date(photo.photo_date), 'dd/MM/yyyy')} - {photoTypeLabels[photo.photo_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">DEPOIS</label>
              <Select value={afterId} onValueChange={setAfterId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {sortedPhotos.map(photo => (
                    <SelectItem key={photo.id} value={photo.id} disabled={photo.id === beforeId}>
                      {format(new Date(photo.photo_date), 'dd/MM/yyyy')} - {photoTypeLabels[photo.photo_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={viewMode === 'sideBySide' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('sideBySide')}
              className="text-xs"
            >
              Lado a Lado
            </Button>
            <Button
              variant={viewMode === 'slider' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('slider')}
              className="text-xs"
            >
              Slider
            </Button>
            {!fullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen(true)}
                className="ml-2"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Comparison View */}
          {beforePhoto && afterPhoto && (
            <>
              {viewMode === 'sideBySide' ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="space-y-2">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted relative">
                      <img
                        src={beforePhoto.photo_url}
                        alt="Antes"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <Badge className="absolute top-2 left-2 bg-red-500/90 text-white border-0">
                        ANTES
                      </Badge>
                    </div>
                    <div className="text-center text-sm">
                      <p className="font-medium">
                        {format(new Date(beforePhoto.photo_date), "dd MMM yyyy", { locale: ptBR })}
                      </p>
                      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                        {beforePhoto.weight_kg && <span>{beforePhoto.weight_kg}kg</span>}
                        {beforePhoto.body_fat_percentage && <span>{beforePhoto.body_fat_percentage}%</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted relative">
                      <img
                        src={afterPhoto.photo_url}
                        alt="Depois"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <Badge className="absolute top-2 left-2 bg-green-500/90 text-white border-0">
                        DEPOIS
                      </Badge>
                    </div>
                    <div className="text-center text-sm">
                      <p className="font-medium">
                        {format(new Date(afterPhoto.photo_date), "dd MMM yyyy", { locale: ptBR })}
                      </p>
                      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                        {afterPhoto.weight_kg && <span>{afterPhoto.weight_kg}kg</span>}
                        {afterPhoto.body_fat_percentage && <span>{afterPhoto.body_fat_percentage}%</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted select-none">
                  {/* After Image (Background) */}
                  <img
                    src={afterPhoto.photo_url}
                    alt="Depois"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Before Image (Foreground with clip) */}
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img
                      src={beforePhoto.photo_url}
                      alt="Antes"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ width: `${100 / (sliderPosition / 100)}%` }}
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Slider Handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  {/* Slider Input (invisible) */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                  />
                  
                  {/* Labels */}
                  <Badge className="absolute top-2 left-2 bg-red-500/90 text-white border-0">ANTES</Badge>
                  <Badge className="absolute top-2 right-2 bg-green-500/90 text-white border-0">DEPOIS</Badge>
                </div>
              )}

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-2">
                  <Card className="bg-secondary/50">
                    <CardContent className="p-3 text-center">
                      <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                      <p className="text-lg font-bold">{stats.daysDiff}</p>
                      <p className="text-[10px] text-muted-foreground">dias</p>
                    </CardContent>
                  </Card>
                  
                  {stats.weightDiff !== null && (
                    <Card className="bg-secondary/50">
                      <CardContent className="p-3 text-center">
                        <Scale className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                        <p className={`text-lg font-bold flex items-center justify-center gap-1 ${
                          stats.weightDiff < 0 ? 'text-green-500' : stats.weightDiff > 0 ? 'text-orange-500' : ''
                        }`}>
                          {stats.weightDiff > 0 ? '+' : ''}{stats.weightDiff.toFixed(1)}
                          {stats.weightDiff < 0 ? <TrendingDown className="w-3 h-3" /> : 
                           stats.weightDiff > 0 ? <TrendingUp className="w-3 h-3" /> : 
                           <Minus className="w-3 h-3" />}
                        </p>
                        <p className="text-[10px] text-muted-foreground">kg</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {stats.fatDiff !== null && (
                    <Card className="bg-secondary/50">
                      <CardContent className="p-3 text-center">
                        <Percent className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                        <p className={`text-lg font-bold flex items-center justify-center gap-1 ${
                          stats.fatDiff < 0 ? 'text-green-500' : stats.fatDiff > 0 ? 'text-red-500' : ''
                        }`}>
                          {stats.fatDiff > 0 ? '+' : ''}{stats.fatDiff.toFixed(1)}
                          {stats.fatDiff < 0 ? <TrendingDown className="w-3 h-3" /> : 
                           stats.fatDiff > 0 ? <TrendingUp className="w-3 h-3" /> : 
                           <Minus className="w-3 h-3" />}
                        </p>
                        <p className="text-[10px] text-muted-foreground">% gordura</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight className="w-5 h-5 text-purple-500" />
            <h3 className="font-bebas text-lg">Comparar Antes e Depois</h3>
          </div>
          <ComparisonContent />
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <ComparisonContent />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoComparison;
