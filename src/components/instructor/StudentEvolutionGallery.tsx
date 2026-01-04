import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Calendar, Scale, Percent, X, Loader2, 
  Image as ImageIcon, ChevronLeft, ChevronRight, ArrowLeft, TrendingDown, TrendingUp
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InstructorPageHeader from './InstructorPageHeader';
import FadeScrollList from '@/components/shared/FadeScrollList';

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

interface StudentInfo {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

const photoTypeLabels: Record<string, string> = {
  front: 'Frente',
  back: 'Costas',
  side_left: 'Lado Esquerdo',
  side_right: 'Lado Direito',
};

const StudentEvolutionGallery: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const { playClickSound } = useAudio();
  
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [photos, setPhotos] = useState<EvolutionPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<EvolutionPhoto | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const fetchData = async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      // Fetch student info
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', studentId)
        .single();
      
      if (studentError) throw studentError;
      setStudent(studentData);
      
      // Fetch evolution photos
      const { data: photosData, error: photosError } = await supabase
        .from('evolution_photos')
        .select('*')
        .eq('profile_id', studentId)
        .order('photo_date', { ascending: false });
      
      if (photosError) throw photosError;
      setPhotos(photosData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Erro ao carregar galeria');
    } finally {
      setLoading(false);
    }
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

  // Calculate weight change
  const calculateProgress = () => {
    const photosWithWeight = photos.filter(p => p.weight_kg).sort((a, b) => 
      new Date(a.photo_date).getTime() - new Date(b.photo_date).getTime()
    );
    
    if (photosWithWeight.length < 2) return null;
    
    const first = photosWithWeight[0];
    const last = photosWithWeight[photosWithWeight.length - 1];
    const weightChange = (last.weight_kg || 0) - (first.weight_kg || 0);
    const fatChange = last.body_fat_percentage && first.body_fat_percentage 
      ? last.body_fat_percentage - first.body_fat_percentage 
      : null;
    
    return { weightChange, fatChange, firstDate: first.photo_date, lastDate: last.photo_date };
  };

  const progress = calculateProgress();

  // Group photos by month
  const groupedPhotos = photos.reduce((acc, photo) => {
    const month = format(new Date(photo.photo_date), 'MMMM yyyy', { locale: ptBR });
    if (!acc[month]) acc[month] = [];
    acc[month].push(photo);
    return acc;
  }, {} as Record<string, EvolutionPhoto[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aluno não encontrado</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => { playClickSound(); navigate(-1); }}
          className="text-sm text-muted-foreground hover:text-green-500 transition-colors"
        >
          <ArrowLeft size={16} className="inline mr-1" /> Voltar
        </button>
      </div>
      
      <InstructorPageHeader 
        title={`EVOLUÇÃO DE ${(student.full_name || student.username).toUpperCase()}`}
        icon={<Camera className="w-6 h-6" />}
        iconColor="text-purple-500"
      />
      
      <FadeScrollList className="flex-1 space-y-4 pr-1">
        {/* Student Info Card */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center overflow-hidden">
                {student.avatar_url ? (
                  <img
                    src={student.avatar_url}
                    alt={student.full_name || student.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bebas text-green-500">
                    {(student.full_name || student.username).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{student.full_name || student.username}</h3>
                <p className="text-sm text-muted-foreground">@{student.username}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {photos.length} foto{photos.length !== 1 ? 's' : ''} de evolução
                </p>
              </div>
            </div>
            
            {/* Progress Summary */}
            {progress && (
              <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {progress.weightChange > 0 ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Variação de Peso</p>
                    <p className={`font-semibold ${progress.weightChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {progress.weightChange > 0 ? '+' : ''}{progress.weightChange.toFixed(1)} kg
                    </p>
                  </div>
                </div>
                {progress.fatChange !== null && (
                  <div className="flex items-center gap-2">
                    {progress.fatChange > 0 ? (
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Variação de Gordura</p>
                      <p className={`font-semibold ${progress.fatChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {progress.fatChange > 0 ? '+' : ''}{progress.fatChange.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardContent className="p-8 text-center">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma foto de evolução</h3>
              <p className="text-sm text-muted-foreground">
                O aluno ainda não adicionou fotos de evolução física.
              </p>
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
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </FadeScrollList>

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
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default StudentEvolutionGallery;
