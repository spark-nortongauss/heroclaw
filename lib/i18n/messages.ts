export const LOCALES = ['en', 'pt-BR', 'es', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'mc_locale';
export const LOCALE_STORAGE_KEY = 'mc-locale';

const messages = {
  en: {
    'language.english': 'English',
    'language.portugueseBrazil': 'Português (Brasil)',
    'language.spanish': 'Español',
    'language.french': 'Français',

    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.board': 'Board',
    'nav.tickets': 'Tickets',
    'nav.chat': 'Chat',
    'nav.files': 'Files',
    'nav.close': 'Close',

    'common.create': 'Create',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.search': 'Search',
    'common.status': 'Status',
    'common.priority': 'Priority',
    'common.assignee': 'Assignee',
    'common.dueDate': 'Due date',
    'common.logout': 'Logout',

    'tickets.title': 'Tickets',
    'tickets.subtitle': 'Track tickets and monitor status transitions.',
    'tickets.searchIssues': 'Search issues',
    'tickets.filterStatus': 'Filter by status',
    'tickets.filterAssignee': 'Filter by assignee',
    'tickets.filterPriority': 'Filter by priority',
    'tickets.allStatuses': 'All statuses',
    'tickets.allAssignees': 'All assignees',
    'tickets.allPriorities': 'All priorities',
    'tickets.createTicket': 'Create Ticket',
    'tickets.deleteSelectedTitle': 'Delete selected tickets?',
    'tickets.deleteSelectedDescription': 'This will permanently delete {count} selected ticket(s).',
    'tickets.deleteButton': 'Delete tickets',
    'tickets.empty': 'No tickets found.',

    'projects.search': 'Search projects',
    'projects.filterStatus': 'Filter projects by status',
    'projects.sort': 'Sort projects',
    'projects.createdDate': 'Created date',
    'projects.name': 'Name',
    'projects.empty': 'No projects found.',
    'projects.deleteSelectedTitle': 'Delete selected projects?',
    'projects.deleteSelectedDescription': 'This will permanently delete {count} selected project(s). Tickets linked to these projects may still exist; if database foreign-key constraints block deletion, those projects will be kept.',
    'projects.deleteButton': 'Delete projects',

    'toast.deleted': 'Deleted.',
    'toast.deleteFailed': 'Delete failed.',
    'toast.signedOutInactivity': 'Signed out due to inactivity',
    'toast.projectDeleteBlockedTickets': 'Cannot delete project: it still has tickets. Delete tickets first.'
  },
  'pt-BR': {
    'language.english': 'Inglês',
    'language.portugueseBrazil': 'Português (Brasil)',
    'language.spanish': 'Espanhol',
    'language.french': 'Francês',

    'nav.dashboard': 'Painel',
    'nav.projects': 'Projetos',
    'nav.board': 'Quadro',
    'nav.tickets': 'Tickets',
    'nav.chat': 'Chat',
    'nav.files': 'Arquivos',
    'nav.close': 'Fechar',

    'common.create': 'Criar',
    'common.delete': 'Excluir',
    'common.cancel': 'Cancelar',
    'common.search': 'Buscar',
    'common.status': 'Status',
    'common.priority': 'Prioridade',
    'common.assignee': 'Responsável',
    'common.dueDate': 'Prazo',
    'common.logout': 'Sair',

    'tickets.title': 'Tickets',
    'tickets.subtitle': 'Acompanhe tickets e monitore transições de status.',
    'tickets.searchIssues': 'Buscar chamados',
    'tickets.filterStatus': 'Filtrar por status',
    'tickets.filterAssignee': 'Filtrar por responsável',
    'tickets.filterPriority': 'Filtrar por prioridade',
    'tickets.allStatuses': 'Todos os status',
    'tickets.allAssignees': 'Todos os responsáveis',
    'tickets.allPriorities': 'Todas as prioridades',
    'tickets.createTicket': 'Criar Ticket',
    'tickets.deleteSelectedTitle': 'Excluir tickets selecionados?',
    'tickets.deleteSelectedDescription': 'Isto excluirá permanentemente {count} ticket(s) selecionado(s).',
    'tickets.deleteButton': 'Excluir tickets',
    'tickets.empty': 'Nenhum ticket encontrado.',

    'projects.search': 'Buscar projetos',
    'projects.filterStatus': 'Filtrar projetos por status',
    'projects.sort': 'Ordenar projetos',
    'projects.createdDate': 'Data de criação',
    'projects.name': 'Nome',
    'projects.empty': 'Nenhum projeto encontrado.',
    'projects.deleteSelectedTitle': 'Excluir projetos selecionados?',
    'projects.deleteSelectedDescription': 'Isto excluirá permanentemente {count} projeto(s) selecionado(s). Tickets vinculados a estes projetos ainda podem existir; se restrições de chave estrangeira bloquearem a exclusão, esses projetos serão mantidos.',
    'projects.deleteButton': 'Excluir projetos',

    'toast.deleted': 'Excluído.',
    'toast.deleteFailed': 'Falha ao excluir.',
    'toast.signedOutInactivity': 'Sessão encerrada por inatividade',
    'toast.projectDeleteBlockedTickets': 'Não é possível excluir o projeto: ele ainda possui tickets. Exclua os tickets primeiro.'
  },
  es: {
    'language.english': 'Inglés',
    'language.portugueseBrazil': 'Português (Brasil)',
    'language.spanish': 'Español',
    'language.french': 'Francés',

    'nav.dashboard': 'Panel',
    'nav.projects': 'Proyectos',
    'nav.board': 'Tablero',
    'nav.tickets': 'Tickets',
    'nav.chat': 'Chat',
    'nav.files': 'Archivos',
    'nav.close': 'Cerrar',

    'common.create': 'Crear',
    'common.delete': 'Eliminar',
    'common.cancel': 'Cancelar',
    'common.search': 'Buscar',
    'common.status': 'Estado',
    'common.priority': 'Prioridad',
    'common.assignee': 'Asignado',
    'common.dueDate': 'Fecha límite',
    'common.logout': 'Cerrar sesión',

    'tickets.title': 'Tickets',
    'tickets.subtitle': 'Sigue los tickets y monitorea cambios de estado.',
    'tickets.searchIssues': 'Buscar incidencias',
    'tickets.filterStatus': 'Filtrar por estado',
    'tickets.filterAssignee': 'Filtrar por asignado',
    'tickets.filterPriority': 'Filtrar por prioridad',
    'tickets.allStatuses': 'Todos los estados',
    'tickets.allAssignees': 'Todos los asignados',
    'tickets.allPriorities': 'Todas las prioridades',
    'tickets.createTicket': 'Crear Ticket',
    'tickets.deleteSelectedTitle': '¿Eliminar tickets seleccionados?',
    'tickets.deleteSelectedDescription': 'Esto eliminará permanentemente {count} ticket(s) seleccionado(s).',
    'tickets.deleteButton': 'Eliminar tickets',
    'tickets.empty': 'No se encontraron tickets.',

    'projects.search': 'Buscar proyectos',
    'projects.filterStatus': 'Filtrar proyectos por estado',
    'projects.sort': 'Ordenar proyectos',
    'projects.createdDate': 'Fecha de creación',
    'projects.name': 'Nombre',
    'projects.empty': 'No se encontraron proyectos.',
    'projects.deleteSelectedTitle': '¿Eliminar proyectos seleccionados?',
    'projects.deleteSelectedDescription': 'Esto eliminará permanentemente {count} proyecto(s) seleccionado(s). Los tickets vinculados a estos proyectos pueden seguir existiendo; si las restricciones de clave foránea bloquean la eliminación, esos proyectos se conservarán.',
    'projects.deleteButton': 'Eliminar proyectos',

    'toast.deleted': 'Eliminado.',
    'toast.deleteFailed': 'Error al eliminar.',
    'toast.signedOutInactivity': 'Sesión cerrada por inactividad',
    'toast.projectDeleteBlockedTickets': 'No se puede eliminar el proyecto: todavía tiene tickets. Elimina primero los tickets.'
  },
  fr: {
    'language.english': 'Anglais',
    'language.portugueseBrazil': 'Portugais (Brésil)',
    'language.spanish': 'Espagnol',
    'language.french': 'Français',

    'nav.dashboard': 'Tableau de bord',
    'nav.projects': 'Projets',
    'nav.board': 'Board',
    'nav.tickets': 'Tickets',
    'nav.chat': 'Chat',
    'nav.files': 'Fichiers',
    'nav.close': 'Fermer',

    'common.create': 'Créer',
    'common.delete': 'Supprimer',
    'common.cancel': 'Annuler',
    'common.search': 'Rechercher',
    'common.status': 'Statut',
    'common.priority': 'Priorité',
    'common.assignee': 'Assigné',
    'common.dueDate': "Date d'échéance",
    'common.logout': 'Déconnexion',

    'tickets.title': 'Tickets',
    'tickets.subtitle': 'Suivez les tickets et les changements de statut.',
    'tickets.searchIssues': 'Rechercher des tickets',
    'tickets.filterStatus': 'Filtrer par statut',
    'tickets.filterAssignee': 'Filtrer par assigné',
    'tickets.filterPriority': 'Filtrer par priorité',
    'tickets.allStatuses': 'Tous les statuts',
    'tickets.allAssignees': 'Tous les assignés',
    'tickets.allPriorities': 'Toutes les priorités',
    'tickets.createTicket': 'Créer un ticket',
    'tickets.deleteSelectedTitle': 'Supprimer les tickets sélectionnés ?',
    'tickets.deleteSelectedDescription': 'Cette action supprimera définitivement {count} ticket(s) sélectionné(s).',
    'tickets.deleteButton': 'Supprimer les tickets',
    'tickets.empty': 'Aucun ticket trouvé.',

    'projects.search': 'Rechercher des projets',
    'projects.filterStatus': 'Filtrer les projets par statut',
    'projects.sort': 'Trier les projets',
    'projects.createdDate': 'Date de création',
    'projects.name': 'Nom',
    'projects.empty': 'Aucun projet trouvé.',
    'projects.deleteSelectedTitle': 'Supprimer les projets sélectionnés ?',
    'projects.deleteSelectedDescription': 'Cette action supprimera définitivement {count} projet(s) sélectionné(s). Les tickets liés à ces projets peuvent encore exister ; si les contraintes de clé étrangère bloquent la suppression, ces projets seront conservés.',
    'projects.deleteButton': 'Supprimer les projets',

    'toast.deleted': 'Supprimé.',
    'toast.deleteFailed': 'Échec de la suppression.',
    'toast.signedOutInactivity': 'Déconnecté pour inactivité',
    'toast.projectDeleteBlockedTickets': 'Impossible de supprimer le projet : il contient encore des tickets. Supprimez d\'abord les tickets.'
  }
} as const;

export type TranslationKey = keyof (typeof messages)['en'];
export type Dictionary = Record<TranslationKey, string>;

export const I18N_MESSAGES: Record<Locale, Dictionary> = messages;

export function isLocale(value: string | null | undefined): value is Locale {
  if (!value) return false;
  return LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (isLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return I18N_MESSAGES[locale];
}
