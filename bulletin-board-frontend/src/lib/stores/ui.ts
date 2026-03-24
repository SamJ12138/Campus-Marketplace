import { create } from "zustand";

interface ReportModalState {
  open: boolean;
  targetType?: string;
  targetId?: string;
}

interface UIState {
  sidebarOpen: boolean;
  reportModal: ReportModalState;
  showOnboarding: boolean;
  showOfferTutorial: boolean;
  showOfferPostingTutorial: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openReportModal: (targetType: string, targetId: string) => void;
  closeReportModal: () => void;
  setShowOnboarding: (show: boolean) => void;
  setShowOfferTutorial: (show: boolean) => void;
  setShowOfferPostingTutorial: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  reportModal: {
    open: false,
    targetType: undefined,
    targetId: undefined,
  },
  showOnboarding: false,
  showOfferTutorial: false,
  showOfferPostingTutorial: false,

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

  setShowOnboarding: (show: boolean) =>
    set({ showOnboarding: show }),

  setShowOfferTutorial: (show: boolean) =>
    set({ showOfferTutorial: show }),

  setShowOfferPostingTutorial: (show: boolean) =>
    set({ showOfferPostingTutorial: show }),
}));
