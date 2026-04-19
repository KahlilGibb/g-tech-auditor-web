export const API_ENDPOINTS = {
  ACTIONS: {
    LIST: '/actions',
    DETAIL: (id: string) => `/actions/${id}`,
    CREATE: '/actions',
    UPDATE: (id: string) => `/actions/${id}`,
    DELETE: (id: string) => `/actions/${id}`,
  },
  INSPECTIONS: {
    LIST: '/inspections',
    DASHBOARD_STATS: '/inspections/dashboard',
    DETAIL: (id: string) => `/inspections/${id}`,
  },
  TEMPLATES: {
    LIST: '/templates',
    DETAIL: (id: string) => `/templates/${id}`,
    CREATE: '/templates',
    UPDATE: (id: string) => `/templates/${id}`,
    DELETE: (id: string) => `/templates/${id}`,
  },
  TEMPLATE_VERSIONS: {
    UPDATE: (id: string) => `/template-versions/${id}`,
  },
  SECTIONS: {
    CREATE: (versionId: string) => `/sections?versionId=${versionId}`,
    UPDATE: (id: string) => `/sections/${id}`,
    DELETE: (id: string) => `/sections/${id}`,
    DUPLICATE: (id: string) => `/sections/${id}/duplicate`,
    REORDER: (versionId: string) => `/sections/reorder?versionId=${versionId}`,
  },
  FIELDS: {
    CREATE: (sectionId: string) => `/fields?sectionId=${sectionId}`,
    UPDATE: (id: string) => `/fields/${id}`,
    DELETE: (id: string) => `/fields/${id}`,
    REORDER: (sectionId: string) => `/fields/reorder?sectionId=${sectionId}`,
  },
  MASTER_FIELDS: {
    LIST: '/master-fields',
    CREATE_FROM_MASTER: (sectionId: string) => `/fields/from-master?sectionId=${sectionId}`,
  },
  CPS: {
    LIST: '/cps',
  },
  TRAINING: {
    LIST: '/training',
  },
  PROFILE: {
    DETAIL: '/profile',
    UPDATE: '/profile',
  }
};
