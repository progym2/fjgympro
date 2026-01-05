import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, Users, Loader2, Award, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';

interface Instructor {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cref: string | null;
  clientCount: number;
}

const ViewInstructors: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    setLoading(true);
    try {
      // Get instructors (profiles with CREF)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, phone, cref')
        .not('cref', 'is', null)
        .order('full_name');

      if (profiles) {
        // Get client counts for each instructor
        const instructorsWithCounts = await Promise.all(
          profiles.map(async (p) => {
            const { count } = await supabase
              .from('instructor_clients')
              .select('id', { count: 'exact', head: true })
              .eq('instructor_id', p.id)
              .eq('is_active', true);

            return {
              ...p,
              clientCount: count || 0,
            };
          })
        );

        setInstructors(instructorsWithCounts);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = instructors.filter(i =>
    i.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-teal-500 flex items-center gap-2">
            <Eye className="w-6 h-6" />
            VER INSTRUTORES ({instructors.length})
          </h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 w-full sm:w-64"
          />
        </div>
      </div>

      {filteredInstructors.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum instrutor encontrado</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInstructors.map((instructor, index) => (
            <motion.div
              key={instructor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 hover:border-teal-500/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/20 to-green-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bebas text-teal-500">
                    {(instructor.full_name || instructor.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{instructor.full_name || instructor.username}</h3>
                  <p className="text-sm text-muted-foreground">@{instructor.username}</p>
                  
                  {instructor.cref && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-teal-500">
                      <Award className="w-3 h-3" />
                      <span>CREF: {instructor.cref}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {instructor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {instructor.phone}
                      </span>
                    )}
                    {instructor.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" /> {instructor.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alunos vinculados:</span>
                  <span className="px-2 py-1 text-sm font-bebas rounded-full bg-teal-500/20 text-teal-500">
                    {instructor.clientCount}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ViewInstructors;
