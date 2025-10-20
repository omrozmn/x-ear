declare module "@/generated/orval" {
  export const appointmentsApi: {
    getAppointments: (params?: any) => Promise<any>;
    getAppointment: (id: string) => Promise<any>;
    createAppointment: (body: any, opts?: any) => Promise<any>;
    updateAppointment: (id: string, body: any, opts?: any) => Promise<any>;
    deleteAppointment: (id: string, opts?: any) => Promise<any>;
  };
}
