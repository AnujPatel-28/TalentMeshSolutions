export const queryKeys = {
  dashboard: (roleId: string) => ['candidate-dashboard', roleId],
  applications: (roleId: string) => ['candidate-applications', roleId],
  recommendations: (roleId: string) => ['candidate-recommendations', roleId],
  adminDashboardSummary: ['admin-dashboard-summary'] as const,
};
