import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Award, BadgeCheck, Phone, Mail, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LinkedInstructor {
  id: string;
  full_name: string | null;
  username: string;
  cref: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  linked_at: string | null;
}

const LinkedInstructorCard: React.FC = () => {
  const { profile } = useAuth();
  const [instructor, setInstructor] = useState<LinkedInstructor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.profile_id) {
      fetchLinkedInstructor();
    }
  }, [profile?.profile_id]);

  const fetchLinkedInstructor = async () => {
    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          linked_at,
          profiles!instructor_clients_instructor_id_fkey (
            id,
            full_name,
            username,
            cref,
            phone,
            email,
            avatar_url
          )
        `)
        .eq('client_id', profile!.profile_id)
        .eq('is_active', true)
        .eq('link_status', 'accepted')
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error fetching instructor:', error);
        }
        setInstructor(null);
        return;
      }

      if (data && data.profiles) {
        const instructorData = data.profiles as any;
        setInstructor({
          ...instructorData,
          linked_at: data.linked_at
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-card/50 rounded-xl h-24 mb-4" />
    );
  }

  if (!instructor) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border-green-500/30 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Instructor Avatar */}
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-green-500/50">
                {instructor.avatar_url ? (
                  <AvatarImage src={instructor.avatar_url} alt={instructor.full_name || instructor.username} />
                ) : (
                  <AvatarFallback className="bg-green-500/20 text-green-500 text-xl font-bold">
                    {(instructor.full_name || instructor.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <BadgeCheck size={14} className="text-white" />
              </div>
            </div>

            {/* Instructor Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bebas text-lg text-green-500 tracking-wide">
                  SEU INSTRUTOR
                </h3>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50 text-[10px]">
                  ACOMPANHANDO
                </Badge>
              </div>
              
              <p className="font-semibold text-foreground truncate">
                {instructor.full_name || instructor.username}
              </p>
              
              {/* Credentials */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {instructor.cref && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Award size={12} className="text-amber-500" />
                    <span className="font-medium">CREF: {instructor.cref}</span>
                  </div>
                )}
                {instructor.linked_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    <span>Desde {format(new Date(instructor.linked_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
              
              {/* Contact Info */}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {instructor.phone && (
                  <a 
                    href={`tel:${instructor.phone}`}
                    className="flex items-center gap-1 text-xs text-green-500 hover:text-green-400 transition-colors"
                  >
                    <Phone size={12} />
                    <span>{instructor.phone}</span>
                  </a>
                )}
                {instructor.email && (
                  <a 
                    href={`mailto:${instructor.email}`}
                    className="flex items-center gap-1 text-xs text-green-500 hover:text-green-400 transition-colors"
                  >
                    <Mail size={12} />
                    <span className="truncate max-w-[150px]">{instructor.email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="mt-3 pt-3 border-t border-green-500/20">
            <p className="text-xs text-muted-foreground italic text-center">
              💪 Você está sendo acompanhado(a) profissionalmente. Seu instrutor pode criar treinos e planos personalizados para você!
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LinkedInstructorCard;
