export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  StudentDashboard: undefined;
  EvaluationForm: { teamId: string; teamName: string };
  MyFeedback: { teamId?: string };
  InstructorDashboard: undefined;
  TeamDetail: { teamId: string };
  CreateTeam: {
    courseId: string;
    courseCode: string;
    teamId?: string;
    initialName?: string;
    initialMemberIds?: string[];
  };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
