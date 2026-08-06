import { insforge, handleApiCall } from './index';
import { Interview, InterviewStatus, ApiState } from '@/types/dashboard';

export const InterviewsApi = {
  /**
   * Fetch all scheduled interviews
   */
  async fetchAll(): Promise<ApiState<Interview[]>> {
    return handleApiCall(async () => 
      insforge.database
        .from('interviews')
        .select('*')
        .order('scheduledAt', { ascending: true }) as any
    );
  },

  /**
   * Fetch interviews for a specific candidate
   */
  async fetchByCandidateId(candidateId: string): Promise<ApiState<Interview[]>> {
    return handleApiCall(async () => 
      insforge.database
        .from('interviews')
        .select('*')
        .eq('candidate_id', candidateId) // Assuming candidate_id exists in schema
        .order('scheduledAt', { ascending: true }) as any
    );
  },

  /**
   * Schedule a new interview
   */
  async schedule(interview: Omit<Interview, 'id'>): Promise<ApiState<Interview>> {
    return handleApiCall(async () => 
      insforge.database
        .from('interviews')
        .insert([interview])
        .select()
        .single() as any
    );
  },

  /**
   * Update interview details or status
   */
  async update(id: string, updates: Partial<Interview>): Promise<ApiState<Interview>> {
    return handleApiCall(async () => 
      insforge.database
        .from('interviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any
    );
  },

  /**
   * Update interview status (e.g., cancel, complete)
   */
  async updateStatus(id: string, status: InterviewStatus): Promise<ApiState<Interview>> {
    return handleApiCall(async () => 
      insforge.database
        .from('interviews')
        .update({ status })
        .eq('id', id)
        .select()
        .single() as any
    );
  },

  /**
   * Delete an interview record
   */
  async delete(id: string): Promise<ApiState<null>> {
    return handleApiCall(async () => 
      insforge.database
        .from('interviews')
        .delete()
        .eq('id', id) as any
    );
  }
};
