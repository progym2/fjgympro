import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Instructor {
  id: string;
  username: string;
  full_name: string | null;
  cref: string | null;
}

/**
 * Hook para masters controlarem o painel como se fossem um instrutor específico.
 * Para instrutores normais, retorna o próprio profile_id.
 */
export function useInstructorContext() {
  const { profile, role } = useAuth();
  const isMaster = role === 'master';

  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('master_instructor_context') || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  // Buscar lista de instrutores (apenas para masters)
  useEffect(() => {
    if (!isMaster) return;

    const fetchInstructors = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, cref')
          .not('cref', 'is', null)
          .order('full_name');

        if (error) throw error;
        setInstructors(data || []);

        // Se não tem instrutor selecionado mas tem instrutores disponíveis
        if (!selectedInstructorId && data && data.length > 0) {
          // Não auto-seleciona - deixa o master escolher
        }
      } catch (err) {
        console.error('Error fetching instructors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, [isMaster]);

  const selectInstructor = useCallback((instructorId: string | null) => {
    setSelectedInstructorId(instructorId);
    if (instructorId) {
      localStorage.setItem('master_instructor_context', instructorId);
    } else {
      localStorage.removeItem('master_instructor_context');
    }
  }, []);

  // O ID efetivo a ser usado nas queries
  // Para instrutores normais: usa o próprio profile_id
  // Para masters: usa o instrutor selecionado ou null se não selecionou
  const effectiveInstructorId = isMaster ? selectedInstructorId : profile?.profile_id || null;

  // Dados do instrutor selecionado (para exibição)
  const selectedInstructor = instructors.find(i => i.id === selectedInstructorId) || null;

  return {
    isMaster,
    instructors,
    selectedInstructorId,
    selectedInstructor,
    effectiveInstructorId,
    selectInstructor,
    loading,
    // Se o master está sem contexto de instrutor selecionado
    needsInstructorSelection: isMaster && !selectedInstructorId,
  };
}
