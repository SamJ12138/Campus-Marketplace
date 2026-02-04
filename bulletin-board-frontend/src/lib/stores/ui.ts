import { create } from "zustand";

interface ReportModalState {
  open: boolean;
  targetType?: string;
  targetId?: string;
}

interface UIState {
  sidebarOpen: boolean;
  reportModal: ReportModalState;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openReportModal: (targetType: string, targetId: string) => void;
  closeReportModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  reportModal: {
    open: false,
    targetType: undefined,
    targetId: undefined,
  },

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) =>
    set({ sidebarOpen: open }),

  openReportModal: (targetType: string, targetId: string) =>
    set({
      reportModal: { open: true, targetType, targetId },
    }),

  closeReportModal: () =>
    set({
      reportModal: { open: false, targetType: undefined, targetId: undefined },
    }),
}));
