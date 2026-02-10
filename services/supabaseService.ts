// Supabase service has been removed.
// This application now runs as a standalone client-side SPA.

export const supabaseService = {
  async getOverrides() { return []; },
  async toggleVisibility() { return false; },
  async uploadImage() { return ''; }
};