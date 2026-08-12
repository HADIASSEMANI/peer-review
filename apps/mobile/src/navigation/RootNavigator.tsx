import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Role } from '@repo/types';
import { Pressable, Text } from 'react-native';
import { Loading } from '../components/Screen';
import { useLogout } from '../hooks/useAuth';
import { CreateTeamScreen } from '../screens/CreateTeamScreen';
import { EvaluationFormScreen } from '../screens/EvaluationFormScreen';
import { InstructorDashboardScreen } from '../screens/InstructorDashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MyFeedbackScreen } from '../screens/MyFeedbackScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { StudentDashboardScreen } from '../screens/StudentDashboardScreen';
import { TeamDetailScreen } from '../screens/TeamDetailScreen';
import { useAuthStore } from '../store/auth';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** URL mapping so the web build has real, shareable routes. */
const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      StudentDashboard: '',
      EvaluationForm: 'teams/:teamId/evaluate',
      MyFeedback: 'feedback',
      InstructorDashboard: 'instructor',
      TeamDetail: 'teams/:teamId',
      CreateTeam: 'courses/:courseId/teams/new',
    },
  },
};

function SignOutButton() {
  const logout = useLogout();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void logout()}
      className="mr-3 rounded-md border border-[#d3d3d3] bg-[#f8f9fa] px-3.5 py-1.5 hover:bg-[#eff6ff]"
    >
      <Text className="text-sm font-medium text-ink">Sign out</Text>
    </Pressable>
  );
}

export function RootNavigator() {
  const { token, user, hydrated } = useAuthStore();

  if (!hydrated) return <Loading label="Starting up…" />;

  const isAuthed = Boolean(token && user);
  const isInstructor = user?.role === Role.INSTRUCTOR;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontWeight: '600' },
          headerStyle: { backgroundColor: '#ffffff' },
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        {!isAuthed ? (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : isInstructor ? (
          <Stack.Group screenOptions={{ headerRight: () => <SignOutButton /> }}>
            <Stack.Screen
              name="InstructorDashboard"
              component={InstructorDashboardScreen}
              options={{ title: 'Instructor dashboard' }}
            />
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ title: 'Team' }} />
            <Stack.Screen
              name="CreateTeam"
              component={CreateTeamScreen}
              options={{ title: 'New team' }}
            />
          </Stack.Group>
        ) : (
          <Stack.Group screenOptions={{ headerShown: false }}>
            {/* Student screens render their own header/footer chrome via AppShell. */}
            <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
            <Stack.Screen name="EvaluationForm" component={EvaluationFormScreen} />
            <Stack.Screen name="MyFeedback" component={MyFeedbackScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
