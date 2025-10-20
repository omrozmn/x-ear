// Minimal Orval stub for local development and scaffolding.
// Replace with real Orval-generated client by running the project's codegen.

export const appointmentsApi = {
  getAppointments: async (params?: { page?: number; per_page?: number; search?: string }) => {
    void params;
    // Return an array-like shape expected by list hooks
    return [] as any;
  },
  getAppointment: async (id: string) => {
    return { id } as any;
  },
  createAppointment: async (body: any, opts?: any) => {
    void opts;
    return { ...body, id: 'new-id' } as any;
  },
  updateAppointment: async (id: string, body: any, opts?: any) => {
    void opts;
    return { id, ...body } as any;
  },
  deleteAppointment: async (id: string, opts?: any) => {
    void opts;
    return { id } as any;
  },
};
