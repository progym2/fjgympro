import { supabase } from '@/integrations/supabase/client';

/**
 * Validates that a client is properly linked to an instructor with accepted status
 * This is a critical security check to prevent instructors from assigning 
 * workouts/plans to clients they're not linked to
 */
export async function validateInstructorClientLink(
  instructorId: string,
  clientId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('instructor_clients')
      .select('id, link_status, is_active')
      .eq('instructor_id', instructorId)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .eq('link_status', 'accepted')
      .maybeSingle();

    if (error) {
      console.error('Error validating instructor-client link:', error);
      return { valid: false, error: 'Erro ao validar vínculo com o aluno.' };
    }

    if (!data) {
      return { 
        valid: false, 
        error: 'Você não tem permissão para criar treinos para este aluno. O aluno precisa aceitar sua solicitação de vínculo primeiro.' 
      };
    }

    return { valid: true };
  } catch (err) {
    console.error('Unexpected error in validateInstructorClientLink:', err);
    return { valid: false, error: 'Erro inesperado ao validar vínculo.' };
  }
}

/**
 * Validates that the selected student exists in the provided students list
 * This is a client-side check to ensure the student wasn't removed from the list
 */
export function validateStudentInList(
  studentId: string,
  students: Array<{ id: string }>
): boolean {
  return students.some(s => s.id === studentId);
}
