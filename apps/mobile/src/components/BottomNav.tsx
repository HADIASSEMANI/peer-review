import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Role } from '@repo/types';
import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Image, Pressable, Text, View } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface TabSpec {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

interface Box {
  x: number;
  width: number;
}

/**
 * Phone navigation: a liquid-glass pill bar whose selection is a bubble that
 * slides between items. Below 768px the header controls and the dashboards'
 * button rows do not fit side by side, so the primary destinations live here,
 * and the instructor's three create actions collapse into the raised +.
 *
 * Tabs switch the dashboards' internal views rather than pushing routes: both
 * dashboards render their sections in one screen, so a tab writes to the ui
 * store and only navigates when the user is elsewhere in the stack.
 */
export function BottomNav() {
  const { isCompact } = useBreakpoint();
  const user = useAuthStore((s) => s.user);
  const studentTab = useUiStore((s) => s.studentTab);
  const setStudentTab = useUiStore((s) => s.setStudentTab);
  const createActions = useUiStore((s) => s.createActions);
  const navigation = useNavigation<Nav>();
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const [menuOpen, setMenuOpen] = useState(false);
  /* Measured rather than computed from percentages: the + button makes the
     items unequal, so an item's centre is not a fixed fraction of the bar. */
  const [boxes, setBoxes] = useState<Record<number, Box>>({});

  if (!isCompact || !user) return null;

  const isInstructor = user.role === Role.INSTRUCTOR;
  const home = isInstructor ? 'InstructorDashboard' : 'StudentDashboard';
  const atHome = routeName === home;

  const goHome = () => {
    if (!atHome) navigation.navigate(home as never);
  };

  const tabs: TabSpec[] = isInstructor
    ? []
    : (['My Teams', 'Submissions', 'Feedback'] as const).map((tab, i) => ({
        icon: ['👥', '📝', '💬'][i] as string,
        label: tab === 'My Teams' ? 'Teams' : tab,
        isActive: atHome && studentTab === tab,
        onPress: () => {
          setStudentTab(tab);
          goHome();
        },
      }));

  /* Only offer create actions the current screen registered — "New Team" is
     unavailable until a course is selected, for instance. */
  const actions = [
    { label: '+ New Course', run: createActions.newCourse },
    { label: '+ New Team', run: createActions.newTeam },
    { label: '+ Add New Student', run: createActions.newStudent },
  ].filter((a) => Boolean(a.run));

  /* Instructors get the + on its own: their destinations are the two lists on
     the dashboard, which the view pills there already switch. Students keep
     the tabs, since their dashboard has no other tab control on mobile. */
  const showFab = isInstructor && actions.length > 0;
  const showTabs = !isInstructor;
  if (!showTabs && !showFab) return null;

  const activeIndex = tabs.findIndex((t) => t.isActive);
  const activeBox = activeIndex >= 0 ? boxes[activeIndex] : undefined;

  const measure = (index: number) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setBoxes((prev) =>
      prev[index]?.x === x && prev[index]?.width === width
        ? prev
        : { ...prev, [index]: { x, width } },
    );
  };

  const renderTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return null;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: tab.isActive }}
        accessibilityLabel={tab.label}
        onPress={tab.onPress}
        onLayout={measure(index)}
        className="z-10 flex-1 items-center justify-center gap-0.5 py-2 cursor-pointer"
      >
        <Text className="text-lg">{tab.icon}</Text>
        <Text className={`text-[11px] ${tab.isActive ? 'nav-tab-active' : 'nav-tab'}`}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      {menuOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close create menu"
          onPress={() => setMenuOpen(false)}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 40 }}
        />
      ) : null}

      {menuOpen ? (
        <View className="absolute bottom-28 left-4 right-4 z-50 gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-card">
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                action.run?.();
              }}
              className="min-h-[48px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 cursor-pointer"
            >
              <Text className="text-base text-ink-900">{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        className={`bubble-nav absolute bottom-3 left-3 right-3 z-50 h-[72px] flex-row items-center p-1.5 ${
          showTabs ? '' : 'justify-center'
        }`}
      >
        {/* Sits behind the items; `left`/`width` come from the measurements. */}
        {showTabs && activeBox ? (
          <View
            className="bubble-nav-bubble absolute"
            pointerEvents="none"
            style={{
              left: activeBox.x,
              width: activeBox.width,
              top: 6,
              bottom: 6,
            }}
          />
        ) : null}

        {showTabs ? (
          <>
            {renderTab(0)}
            {renderTab(1)}
            {renderTab(2)}
          </>
        ) : null}

        {showFab ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create"
            accessibilityState={{ expanded: menuOpen }}
            onPress={() => setMenuOpen((open) => !open)}
            className="bubble-nav-fab z-10 h-14 w-14 items-center justify-center rounded-full cursor-pointer"
          >
            {menuOpen ? (
              <Image
                source={{ uri: '/plus.svg' }}
                accessibilityLabel="Create"
                className="keep-bg icon-on-dark"
                style={{
                  width: 24,
                  height: 24,
                  transform: [{ rotate: '45deg' }],
                  transition: 'transform 0.5s',
                }}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={{ uri: '/plus.svg' }}
                accessibilityLabel="Create"
                className="keep-bg icon-on-dark"
                style={{
                  width: 24,
                  height: 24,
                  transform: [{ rotate: '0deg' }],
                  transition: 'transform 0.5s',
                }}
                resizeMode="contain"
              />
            )}
          </Pressable>
        ) : null}
      </View>
    </>
  );
}
