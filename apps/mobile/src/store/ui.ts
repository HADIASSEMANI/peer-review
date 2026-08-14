import { create } from 'zustand';

export type StudentTab = 'My Teams' | 'Submissions' | 'Feedback';
export type InstructorView = 'teams' | 'students';

/** Create actions a screen publishes so the bottom nav's + button can fire them. */
export interface CreateActions {
  newCourse?: () => void;
  newTeam?: () => void;
  newStudent?: () => void;
}

interface UiState {
  /** Which card the student dashboard is showing. */
  studentTab: StudentTab;
  setStudentTab: (tab: StudentTab) => void;
  /** Which list the instructor dashboard is showing. */
  instructorView: InstructorView;
  setInstructorView: (view: InstructorView) => void;
  createActions: CreateActions;
  setCreateActions: (actions: CreateActions) => void;
}

/**
 * View state that has to be readable from outside the screen that owns it.
 *
 * The mobile bottom nav sits in AppShell, several levels above the dashboards,
 * so it cannot reach their local useState. Rather than thread props through
 * every screen, the dashboards read their current tab from here and publish
 * their create handlers on mount; the nav reads both.
 */
export const useUiStore = create<UiState>((set) => ({
  studentTab: 'My Teams',
  setStudentTab: (studentTab) => set({ studentTab }),
  instructorView: 'teams',
  setInstructorView: (instructorView) => set({ instructorView }),
  createActions: {},
  setCreateActions: (createActions) => set({ createActions }),
}));
