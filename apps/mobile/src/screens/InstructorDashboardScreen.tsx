import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DIMENSION_LABELS,
  EvalDimension,
  Role,
  TERM_HINT,
  normalizeTerm,
  toTitleCase,
  type PublicUser,
} from '@repo/types';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { StudentBadges, TeamBadges } from '../components/Badges';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { GradientButton } from '../components/GradientButton';
import { EmptyState, ErrorState, Loading, Screen } from '../components/Screen';
import { ScoreBar } from '../components/ScoreBar';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { ToastBanner } from '../components/ToastBanner';
import { useCreateUser } from '../hooks/useAuth';
import { useCourseSummary } from '../hooks/useEvaluations';
import {
  useCourseDeleteImpact,
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  useDeleteTeam,
  useDeleteUser,
  useStudents,
  useUpdateCourse,
} from '../hooks/useTeams';
import { useUpdateUser } from '../hooks/useUsers';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useUiStore } from '../store/ui';
import { fullName, percent, score } from '../lib/format';
import { ORGANIZATIONS, orgLabel } from '../lib/orgs';
import { useAuthStore } from '../store/auth';
import type { RootStackParamList } from '../navigation/types';
import { AppShell } from '../components/AppShell';

type Props = NativeStackScreenProps<RootStackParamList, 'InstructorDashboard'>;
type SortKey = 'overall' | 'name' | 'studentId' | 'email' | 'reviews';

export function InstructorDashboardScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const selectedOrg = useAuthStore((s) => s.selectedOrg);
  const setSelectedOrg = useAuthStore((s) => s.setSelectedOrg);

  const courses = useCourses();
  const createUserMutation = useCreateUser();
  const deleteTeamMutation = useDeleteTeam();
  const deleteUserMutation = useDeleteUser();
  const createCourseMutation = useCreateCourse();
  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();
  const updateUserMutation = useUpdateUser();

  const [courseId, setCourseId] = useState<string | null>(null);
  // Measured off-layout (see the probe row in the JSX): the full pill row's
  // height and one pill's height. The row has wrapped past a single line when
  // it is taller than a single pill.
  const [courseRowHeight, setCourseRowHeight] = useState(0);
  const [coursePillHeight, setCoursePillHeight] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>('overall');
  const [teamSearch, setTeamSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  /* Lives in the ui store, not local state: the mobile bottom nav switches it. */
  const viewMode = useUiStore((s) => s.instructorView);
  const setViewMode = useUiStore((s) => s.setInstructorView);
  const setCreateActions = useUiStore((s) => s.setCreateActions);
  const { isCompact } = useBreakpoint();
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // `mine` = rostered on a team in one of this instructor's own courses, and
  // confined to the selected school. The team builder deliberately uses the
  // unscoped list, or a student not yet on any team could never be added to one.
  const studentDirectory = useStudents(studentSearch || undefined, selectedOrg, 'mine');

  // Edit Student modal state
  const [editingStudent, setEditingStudent] = useState<PublicUser | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState('');

  const handleOpenEditStudent = (s: PublicUser) => {
    setEditingStudent(s);
    setEditFirstName(s.firstName);
    setEditLastName(s.lastName);
    setEditStudentId(s.studentId ?? '');
    setEditEmail(s.email);
    setEditError('');
  };

  const handleUpdateStudentSubmit = () => {
    if (!editingStudent) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setEditError('First name, last name, and email address are required.');
      return;
    }
    if (editStudentId.trim() && !/^\d+$/.test(editStudentId.trim())) {
      setEditError('Student ID must contain numbers only.');
      return;
    }
    setEditError('');
    updateUserMutation.mutate(
      {
        id: editingStudent.id,
        input: {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim(),
          studentId: editStudentId.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setSuccessMessage(`Successfully updated student ${editFirstName} ${editLastName}`);
          setTimeout(() => setSuccessMessage(''), 5000);
          setEditingStudent(null);
        },
        onError: (err) => {
          setEditError((err as Error).message);
        },
      },
    );
  };

  // Course modal state. One form serves create and edit: `editingCourseId`
  // null means create. Keeping a single modal means the two paths can never
  // drift apart in validation or layout.
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseTerm, setCourseTerm] = useState('');
  const [courseError, setCourseError] = useState('');

  // Delete confirmation state. Declared up here (not next to the modal) so the
  // impact query runs before this component's early returns — a hook after a
  // conditional return would break the rules of hooks.
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Which course is showing its management popover. Driven by hover on
  // desktop and by long-press on touch, where hover does not exist.
  const [managingCourseId, setManagingCourseId] = useState<string | null>(null);
  const manageCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openManage = (id: string) => {
    if (manageCloseTimer.current) clearTimeout(manageCloseTimer.current);
    setManagingCourseId(id);
  };
  /**
   * Closing is deferred so the pointer can cross the gap between the pill and
   * the popover without the menu disappearing out from under it. Re-entering
   * either element cancels the pending close.
   */
  const scheduleCloseManage = () => {
    if (manageCloseTimer.current) clearTimeout(manageCloseTimer.current);
    manageCloseTimer.current = setTimeout(() => setManagingCourseId(null), 180);
  };
  const closeManage = () => {
    if (manageCloseTimer.current) clearTimeout(manageCloseTimer.current);
    setManagingCourseId(null);
  };
  const deleteImpact = useCourseDeleteImpact(deletingCourseId);

  const isEditingCourse = editingCourseId !== null;
  const courseMutation = isEditingCourse ? updateCourseMutation : createCourseMutation;

  const openCreateCourse = () => {
    setEditingCourseId(null);
    setCourseCode('');
    setCourseTitle('');
    setCourseTerm('');
    setCourseError('');
    setIsCourseModalOpen(true);
  };

  const openEditCourse = (course: { id: string; code: string; title: string; term: string }) => {
    setEditingCourseId(course.id);
    setCourseCode(course.code);
    setCourseTitle(course.title);
    setCourseTerm(course.term);
    setCourseError('');
    setIsCourseModalOpen(true);
  };

  const handleCourseSubmit = () => {
    if (!courseCode.trim() || !courseTitle.trim() || !courseTerm.trim()) {
      setCourseError('Course code, title and term are all required.');
      return;
    }
    // The API applies these same rules (they live in @repo/types), but running
    // them here turns a 400 round-trip into an instant inline message, and
    // sends an already-canonical payload.
    const normalizedTerm = normalizeTerm(courseTerm);
    if (!normalizedTerm) {
      setCourseError(TERM_HINT);
      return;
    }
    const normalizedTitle = toTitleCase(courseTitle);
    setCourseError('');

    const flash = (message: string) => {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 5000);
      setIsCourseModalOpen(false);
      setEditingCourseId(null);
      setCourseCode('');
      setCourseTitle('');
      setCourseTerm('');
    };
    const onError = (err: unknown) => setCourseError((err as Error).message);

    if (editingCourseId) {
      updateCourseMutation.mutate(
        {
          id: editingCourseId,
          input: {
            code: courseCode.trim(),
            title: normalizedTitle,
            term: normalizedTerm,
          },
        },
        { onSuccess: (course) => flash(`Saved changes to ${course.code}`), onError },
      );
      return;
    }

    createCourseMutation.mutate(
      {
        code: courseCode.trim(),
        title: normalizedTitle,
        term: normalizedTerm,
        organizationId: selectedOrg,
      },
      { onSuccess: (course) => flash(`Successfully created course ${course.code}`), onError },
    );
  };

  /**
   * The management panel. Rendered inside the pill's own wrapper and pinned to
   * its bottom edge, so it tracks the pill through wrapping and resizing with
   * no coordinate maths. Hover handlers repeat here because leaving the pill
   * for the popover is itself a hover-out on the pill.
   */
  const renderManagePopover = (course: {
    id: string;
    code: string;
    title: string;
    term: string;
  }) =>
    managingCourseId === course.id ? (
      <View style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50 }} className="pt-1.5">
        <View className="w-52 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <Text className="px-1 pb-1 text-xs text-muted" numberOfLines={1}>
            {course.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${course.code}`}
            onPress={() => {
              closeManage();
              openEditCourse(course);
            }}
            className="rounded-lg px-2 py-1.5 hover:bg-slate-50"
          >
            <Text className="text-sm text-slate-600">Edit course</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${course.code}`}
            onPress={() => {
              closeManage();
              setDeleteConfirmText('');
              setDeletingCourseId(course.id);
            }}
            className="rounded-lg px-2 py-1.5 hover:bg-red-50 cursor-pointer"
          >
            <Text className="text-sm font-medium text-red-600">Delete course</Text>
          </Pressable>
        </View>
      </View>
    ) : null;

  const closeDeleteCourse = () => {
    setDeletingCourseId(null);
    setDeleteConfirmText('');
  };

  const handleConfirmDeleteCourse = (code: string) => {
    if (!deletingCourseId) return;
    deleteCourseMutation.mutate(deletingCourseId, {
      onSuccess: () => {
        setSuccessMessage(`Deleted course ${code}`);
        setTimeout(() => setSuccessMessage(''), 5000);
        closeDeleteCourse();
      },
      onError: (err) => setCourseError((err as Error).message),
    });
  };

  // Create Student modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123');

  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [studentIdError, setStudentIdError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const toggleTeam = (id: string) => {
    setExpandedTeams((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setStudentId('');
    setEmail('');
    setPassword('Password123');
    setFirstNameError('');
    setLastNameError('');
    setStudentIdError('');
    setEmailError('');
    setPasswordError('');
    setSubmitError('');
  };

  const handleCreateUserSubmit = () => {
    let hasError = false;
    setFirstNameError('');
    setLastNameError('');
    setStudentIdError('');
    setEmailError('');
    setPasswordError('');
    setSubmitError('');

    if (!firstName.trim()) {
      setFirstNameError("Please enter student's first name");
      hasError = true;
    }
    if (!lastName.trim()) {
      setLastNameError("Please enter student's last name");
      hasError = true;
    }
    if (!studentId.trim()) {
      setStudentIdError('Please enter a student ID');
      hasError = true;
    } else if (!/^\d+$/.test(studentId.trim())) {
      setStudentIdError('Student ID must contain numbers only');
      hasError = true;
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setEmailError('Please enter a proper email address');
      hasError = true;
    }
    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    if (hasError) return;

    createUserMutation.mutate(
      {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentId: studentId.trim(),
        organizationId: selectedOrg,
        role: Role.STUDENT,
      },
      {
        onSuccess: () => {
          setSuccessMessage(`Successfully created student account for ${firstName} ${lastName}`);
          setIsModalOpen(false);
          resetForm();
          setTimeout(() => setSuccessMessage(''), 5000);
        },
        onError: (err) => {
          setSubmitError(err.message || 'Failed to create student. Please check credentials.');
        },
      },
    );
  };

  const filteredCourses = (courses.data ?? []).filter(
    (course) => course.organizationId === selectedOrg,
  );
  const activeCourseId =
    courseId && filteredCourses.some((c) => c.id === courseId)
      ? courseId
      : (filteredCourses[0]?.id ?? '');

  const summary = useCourseSummary(activeCourseId);
  const activeCourse = filteredCourses.find((c) => c.id === activeCourseId);

  /* Publish the create actions so the phone layout's + button can fire them;
     on mobile the three buttons themselves are hidden. "New Team" is omitted
     until a course is selected, which is also why the row is rebuilt on every
     change of activeCourse. */
  useEffect(() => {
    setCreateActions({
      newCourse: openCreateCourse,
      newTeam: activeCourse
        ? () =>
            navigation.navigate('CreateTeam', {
              courseId: activeCourse.id,
              courseCode: activeCourse.code,
            })
        : undefined,
      newStudent: () => {
        resetForm();
        setIsModalOpen(true);
      },
    });
    return () => setCreateActions({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse?.id, activeCourse?.code]);

  // The pill row spilled onto a second line, so swap it for a select. The 4px
  // slack absorbs sub-pixel layout rounding; without it a row that fits
  // exactly can flip-flop between the two renderings on resize.
  const coursesOverflowOneLine = coursePillHeight > 0 && courseRowHeight > coursePillHeight + 4;

  const deletingCourse = filteredCourses.find((c) => c.id === deletingCourseId);
  // Deleting a course with teams destroys grading data, so that case demands
  // the instructor retype the course code — the standard guard for an
  // irreversible cascade. An empty course only needs a plain confirm.
  const deleteNeedsTypedCode = (deleteImpact.data?.teamCount ?? 0) > 0;
  const deleteConfirmed =
    !deleteNeedsTypedCode || deleteConfirmText.trim() === (deletingCourse?.code ?? '');
  const countOf = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  if (courses.isLoading) return <Loading label="Loading courses…" />;
  if (courses.isError) {
    return (
      <Screen title="Instructor dashboard">
        <ErrorState
          message={(courses.error as Error).message}
          onRetry={() => void courses.refetch()}
        />
      </Screen>
    );
  }
  if (!courses.data || courses.data.length === 0) {
    return (
      <Screen title="Instructor dashboard">
        <EmptyState
          title="No courses yet"
          message="Create a course to start building teams and collecting evaluations."
        />
      </Screen>
    );
  }

  return (
    <AppShell>
      <Screen
        title={`Welcome, ${user?.firstName ?? 'Instructor'}`}
        subtitle="Aggregated peer assessment results across your teams."
        refreshing={summary.isFetching}
        onRefresh={() => void summary.refetch()}
      >
        <View className="mb-2 w-full max-w-xs">
          <SelectField
            label="Organization / School"
            placeholder="Select School"
            value={selectedOrg}
            onValueChange={(val) => setSelectedOrg(val)}
            options={ORGANIZATIONS.map((o) => ({ label: o.label, value: o.value }))}
          />
        </View>

        {filteredCourses.length > 0 ? (
          // Lifting the pill's own wrapper is not enough. Every react-native-web
          // View carries `position: relative; z-index: 0`, so this container and
          // the button row below it are two SIBLING stacking contexts, both at
          // 0 — and siblings that tie on z-index paint in DOM order, which puts
          // the later buttons on top no matter how high the popover goes inside
          // here. The whole subtree has to out-rank its siblings.
          <View className="w-full" style={{ zIndex: managingCourseId ? 50 : 0 }}>
            {/* Off-layout probe. It always renders the full pill row, so the
                screen can collapse to a select AND expand back to pills when
                the window is resized — a probe that only existed in the pill
                branch would unmount on collapse and could never recover.
                Absolute + opacity 0 keeps it out of the visual flow while
                still being laid out, which is what makes onLayout fire.
                Every probe pill uses the SELECTED (larger) type ramp, so the
                measurement over-estimates slightly and we collapse a touch
                early rather than leaving a wrapped row on screen. */}
            <View
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 }}
              className="flex-row flex-wrap gap-2"
              onLayout={(e) => setCourseRowHeight(e.nativeEvent.layout.height)}
            >
              {filteredCourses.map((course, index) => (
                <View
                  key={course.id}
                  className="rounded-full border border-slate-300 px-3.5 py-2"
                  onLayout={
                    index === 0
                      ? (e) => setCoursePillHeight(e.nativeEvent.layout.height)
                      : undefined
                  }
                >
                  <Text className="text-base">
                    {course.code} · {course.term}
                  </Text>
                </View>
              ))}
            </View>

            {/* items-end aligns Manage with the select's control rather than
                its label, so the two sit on the same baseline. */}
            {coursesOverflowOneLine ? (
              <View className="w-full max-w-md flex-row items-end gap-2">
                <View className="flex-1">
                  <SelectField
                    label="Course"
                    placeholder="Select course"
                    value={activeCourseId ?? ''}
                    onValueChange={(val) => setCourseId(val)}
                    options={filteredCourses.map((course) => ({
                      label: `${course.code} · ${course.term}`,
                      value: course.id,
                    }))}
                  />
                </View>
                {/* There are no pills to hover in this mode, so the selected
                    course gets an explicit trigger for the same popover. */}
                {activeCourse ? (
                  <View
                    style={{ zIndex: managingCourseId === activeCourse.id ? 50 : 0 }}
                    {...({
                      onMouseEnter: () => openManage(activeCourse.id),
                      onMouseLeave: scheduleCloseManage,
                    } as any)}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Manage ${activeCourse.code}`}
                      onPress={() =>
                        managingCourseId === activeCourse.id
                          ? closeManage()
                          : openManage(activeCourse.id)
                      }
                      className="h-12 shrink-0 justify-center rounded-lg border border-slate-300 bg-white px-3 hover:bg-slate-50"
                    >
                      <Text className="text-sm text-slate-600">Manage ▼</Text>
                    </Pressable>
                    {renderManagePopover(activeCourse)}
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {filteredCourses.map((course) => {
                  const selected = course.id === activeCourseId;
                  const managing = managingCourseId === course.id;
                  return (
                    // react-native-web gives every View `position: relative;
                    // z-index: 0`, so each pill sits in its own stacking
                    // context. Without lifting the open one, its popover would
                    // paint underneath every pill that follows it.
                    <View
                      key={course.id}
                      style={{ zIndex: managing ? 50 : 0 }}
                      {...({
                        onMouseEnter: () => openManage(course.id),
                        onMouseLeave: scheduleCloseManage,
                      } as any)}
                    >
                      <Pressable
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        onPress={() => setCourseId(course.id)}
                        // Touch devices have no hover, so long-press is the
                        // way in there. It does not interfere with onPress.
                        onLongPress={() => openManage(course.id)}
                        delayLongPress={500}
                        className={[
                          'liquid-glass-pill rounded-full px-3.5 py-2 transition-all',
                          selected
                            ? 'liquid-glass-pill-active active'
                            : 'border border-slate-300 bg-white hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <Text
                          className={
                            selected ? 'text-sm text-white font-medium' : 'text-sm text-ink-700'
                          }
                        >
                          {course.code} · {course.term}
                        </Text>
                      </Pressable>
                      {renderManagePopover(course)}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <EmptyState
            title="No courses in this organization"
            message="Select a different organization or create a new course for this school."
          />
        )}

        <ToastBanner message={successMessage} onClose={() => setSuccessMessage('')} />

        {/* Three 140px-minimum buttons cannot sit in a row on a phone, so below
            768px they move into the bottom nav's + menu instead. */}
        <View className={`flex-row flex-wrap items-center gap-3 ${isCompact ? 'hidden' : ''}`}>
          <View className="flex-1 min-w-[140px]">
            <GradientButton label="+ New Course" fullWidth height={48} onPress={openCreateCourse} />
          </View>

          {activeCourse ? (
            <View className="flex-1 min-w-[140px]">
              <GradientButton
                label="+ New Team"
                fullWidth
                height={48}
                onPress={() =>
                  navigation.navigate('CreateTeam', {
                    courseId: activeCourse.id,
                    courseCode: activeCourse.code,
                  })
                }
              />
            </View>
          ) : null}

          <View className="flex-1 min-w-[140px]">
            <GradientButton
              label="+ Add New Student"
              tone="black"
              fullWidth
              height={48}
              onPress={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            />
          </View>
        </View>

        <Modal
          visible={isCourseModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCourseModalOpen(false)}
        >
          <View className="flex-1 items-center justify-center bg-black/60 p-4">
            <View className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
              <View className="h-2 w-full bg-linear-to-r from-slate-200 via-slate-300 to-slate-200" />
              <View className="gap-3 p-5 sm:p-6">
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                      <Text className="text-lg">📚</Text>
                    </View>
                    <View>
                      <Text className="text-xl text-ink">
                        {isEditingCourse ? 'Edit Course' : 'New Course'}
                      </Text>
                      <Text className="text-xs text-muted">
                        {isEditingCourse ? 'In' : 'Added to'} {orgLabel(selectedOrg)}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsCourseModalOpen(false)}
                    className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100"
                  >
                    <Text className="text-sm text-slate-500">✕</Text>
                  </Pressable>
                </View>

                <View className="gap-3">
                  <TextField
                    label="Course Code"
                    placeholder="SOEN 341"
                    value={courseCode}
                    onChangeText={(t) => {
                      setCourseCode(t);
                      setCourseError('');
                    }}
                    onSubmitEditing={handleCourseSubmit}
                    required
                  />
                  <TextField
                    label="Course Title"
                    placeholder="Software Process"
                    value={courseTitle}
                    onChangeText={(t) => {
                      setCourseTitle(t);
                      setCourseError('');
                    }}
                    onSubmitEditing={handleCourseSubmit}
                    required
                  />
                  <TextField
                    label="Term"
                    placeholder="Fall 2026"
                    value={courseTerm}
                    onChangeText={(t) => {
                      setCourseTerm(t);
                      setCourseError('');
                    }}
                    onSubmitEditing={handleCourseSubmit}
                    required
                  />
                  {courseError ? (
                    <View className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                      <Text className="text-sm text-amber-700">{courseError}</Text>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row items-center justify-end gap-3 border-t border-slate-100 pt-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsCourseModalOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 hover:bg-slate-50"
                  >
                    <Text className="text-sm text-slate-600">Cancel</Text>
                  </Pressable>
                  <View className="min-w-[140px]">
                    <GradientButton
                      label={
                        courseMutation.isPending
                          ? isEditingCourse
                            ? 'Saving…'
                            : 'Creating…'
                          : isEditingCourse
                            ? 'Save Changes'
                            : 'Create Course'
                      }
                      disabled={courseMutation.isPending}
                      onPress={handleCourseSubmit}
                      height={42}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={deletingCourseId !== null}
          transparent
          animationType="fade"
          onRequestClose={closeDeleteCourse}
        >
          <View className="flex-1 items-center justify-center bg-black/60 p-4">
            <View className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
              <View className="h-2 w-full bg-red-500" />
              <View className="gap-3 p-5 sm:p-6">
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50">
                      <Text className="text-lg">🗑️</Text>
                    </View>
                    <View>
                      <Text className="text-xl text-ink">Delete Course</Text>
                      <Text className="text-xs text-muted">
                        {deletingCourse ? `${deletingCourse.code} · ${deletingCourse.term}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={closeDeleteCourse}
                    className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100"
                  >
                    <Text className="text-sm text-slate-500">✕</Text>
                  </Pressable>
                </View>

                {deleteImpact.isLoading ? (
                  <Text className="text-sm text-muted">Checking what this would remove…</Text>
                ) : deleteNeedsTypedCode ? (
                  <View className="gap-2">
                    <Text className="text-base text-ink">
                      This course still has teams. Deleting it permanently removes all of it:
                    </Text>
                    <View className="gap-1 rounded-xl border border-red-200 bg-red-50 p-3">
                      <Text className="text-sm text-red-800 font-medium">
                        · {countOf(deleteImpact.data?.teamCount ?? 0, 'team')}
                      </Text>
                      <Text className="text-sm text-red-800 font-medium">
                        · {countOf(deleteImpact.data?.memberCount ?? 0, 'team membership')}
                      </Text>
                      <Text className="text-sm text-red-800 font-medium">
                        · {countOf(deleteImpact.data?.evaluationCount ?? 0, 'submitted evaluation')}
                      </Text>
                    </View>
                    <Text className="text-sm text-muted">
                      This cannot be undone. The evaluation data is not recoverable.
                    </Text>
                  </View>
                ) : (
                  <Text className="text-base text-ink">
                    This course has no teams, so nothing else will be removed.
                  </Text>
                )}

                {deleteNeedsTypedCode ? (
                  <TextField
                    label={`Type ${deletingCourse?.code ?? ''} to confirm`}
                    placeholder={deletingCourse?.code ?? ''}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                  />
                ) : null}

                <View className="flex-row items-center justify-end gap-3 border-t border-slate-100 pt-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={closeDeleteCourse}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <Text className="text-sm text-slate-600">Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!deleteConfirmed || deleteCourseMutation.isPending}
                    onPress={() => handleConfirmDeleteCourse(deletingCourse?.code ?? '')}
                    className={[
                      'rounded-xl border px-5 py-2 cursor-pointer transition-all',
                      !deleteConfirmed || deleteCourseMutation.isPending
                        ? 'border-slate-200 bg-slate-100 opacity-60'
                        : 'border-red-600 bg-red-600 hover:bg-red-700',
                    ].join(' ')}
                  >
                    <Text
                      className={
                        !deleteConfirmed || deleteCourseMutation.isPending
                          ? 'text-sm text-slate-400 font-medium'
                          : 'text-sm text-white font-medium'
                      }
                    >
                      {deleteCourseMutation.isPending ? 'Deleting…' : 'Delete Course'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={isModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View className="flex-1 items-center justify-center bg-black/60 p-4">
            <View className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
              {/* Top gradient accent bar */}
              <View className="h-2 w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />

              <View className="flex-1 p-5 sm:p-6 gap-3">
                {/* Header */}
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-100">
                      <Text className="text-lg">🎓</Text>
                    </View>
                    <View>
                      <Text className="text-2xl text-ink">Add New Student</Text>
                      <Text className="text-xs font-medium text-muted">
                        Enter student contact information and credentials
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsModalOpen(false)}
                    className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100"
                  >
                    <Text className="text-base text-slate-500">✕</Text>
                  </Pressable>
                </View>

                <ScrollView
                  className="flex-1"
                  contentContainerClassName="gap-4 py-2"
                  showsVerticalScrollIndicator
                >
                  {/* Two-Column Form Layout */}
                  <View className="flex-col sm:flex-row gap-4">
                    {/* Left Column: Name & ID */}
                    <View className="flex-1 gap-3">
                      <TextField
                        label="First Name"
                        placeholder="Student's First Name"
                        value={firstName}
                        onChangeText={(text) => {
                          setFirstName(text);
                          setFirstNameError('');
                        }}
                        error={firstNameError}
                        required
                      />

                      <TextField
                        label="Last Name"
                        placeholder="Student's Last Name"
                        value={lastName}
                        onChangeText={(text) => {
                          setLastName(text);
                          setLastNameError('');
                        }}
                        error={lastNameError}
                        required
                      />

                      <TextField
                        label="Student I.D."
                        placeholder="e.g. 40281923"
                        value={studentId}
                        onChangeText={(text) => {
                          setStudentId(text.replace(/\D/g, ''));
                          setStudentIdError('');
                        }}
                        keyboardType="numeric"
                        error={studentIdError}
                        required
                      />
                    </View>

                    {/* Right Column: Credentials */}
                    <View className="flex-1 gap-3">
                      <TextField
                        label="Email Address"
                        placeholder="student@peerreview.dev"
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          setEmailError('');
                        }}
                        error={emailError}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        required
                      />

                      <TextField
                        label="Password (default Password123)"
                        placeholder="Password123"
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          setPasswordError('');
                        }}
                        error={passwordError}
                        secureTextEntry
                        required
                      />
                    </View>
                  </View>

                  {submitError ? (
                    <View className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                      <Text className="text-sm text-amber-700">{submitError}</Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Footer buttons */}
                <View className="flex-row items-center justify-end gap-3 border-t border-slate-100 pt-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 hover:bg-slate-50"
                  >
                    <Text className="text-base text-slate-600">Cancel</Text>
                  </Pressable>
                  <View className="min-w-[140px]">
                    <GradientButton
                      label={createUserMutation.isPending ? 'Creating…' : 'Create Student'}
                      tone="black"
                      disabled={createUserMutation.isPending}
                      onPress={handleCreateUserSubmit}
                      height={42}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Student Info Modal */}
        <Modal
          visible={Boolean(editingStudent)}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingStudent(null)}
        >
          <View className="flex-1 items-center justify-center bg-black/60 p-4">
            <View className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
              {/* Top gradient accent bar */}
              <View className="h-2 w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />

              <View className="flex-1 p-5 sm:p-6 gap-3">
                {/* Header */}
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-100">
                      <Text className="text-lg">✏️</Text>
                    </View>
                    <View>
                      <Text className="text-2xl text-ink">Edit Student Info</Text>
                      <Text className="text-xs font-medium text-muted">
                        Update student profile details and student ID
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEditingStudent(null)}
                    className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100"
                  >
                    <Text className="text-base text-slate-500">✕</Text>
                  </Pressable>
                </View>

                <ScrollView
                  className="flex-1"
                  contentContainerClassName="gap-4 py-2"
                  showsVerticalScrollIndicator
                >
                  <View className="flex-col sm:flex-row gap-4">
                    <View className="flex-1 gap-3">
                      <TextField
                        label="First Name"
                        placeholder="Student's First Name"
                        value={editFirstName}
                        onChangeText={(text) => {
                          setEditFirstName(text);
                          setEditError('');
                        }}
                        required
                      />

                      <TextField
                        label="Last Name"
                        placeholder="Student's Last Name"
                        value={editLastName}
                        onChangeText={(text) => {
                          setEditLastName(text);
                          setEditError('');
                        }}
                        required
                      />
                    </View>

                    <View className="flex-1 gap-3">
                      <TextField
                        label="Student ID"
                        placeholder="e.g. 40123456"
                        value={editStudentId}
                        onChangeText={(text) => setEditStudentId(text.replace(/\D/g, ''))}
                        keyboardType="numeric"
                      />

                      <TextField
                        label="Email Address"
                        placeholder="student@example.com"
                        value={editEmail}
                        onChangeText={(text) => {
                          setEditEmail(text);
                          setEditError('');
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        required
                      />
                    </View>
                  </View>

                  {editError ? (
                    <View className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                      <Text className="text-sm text-amber-700">{editError}</Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Footer buttons */}
                <View className="flex-row items-center justify-end gap-3 border-t border-slate-100 pt-3">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEditingStudent(null)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 hover:bg-slate-50"
                  >
                    <Text className="text-base text-slate-600">Cancel</Text>
                  </Pressable>
                  <View className="min-w-[140px]">
                    <GradientButton
                      label={updateUserMutation.isPending ? 'Saving…' : 'Save Changes'}
                      tone="blue"
                      disabled={updateUserMutation.isPending}
                      onPress={handleUpdateStudentSubmit}
                      height={40}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <View className="gap-3">
          {/* Navigation View Mode & Search Row */}
          <View className="flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-slate-200 pb-3">
            <View className="w-full sm:flex-1 flex-row gap-2 rounded-xl bg-slate-100 p-1 min-h-[48px]">
              <Pressable
                accessibilityRole="button"
                onPress={() => setViewMode('teams')}
                className={[
                  'liquid-glass-pill flex-1 items-center justify-center rounded-full px-3 py-2 transition-all',
                  viewMode === 'teams'
                    ? 'liquid-glass-pill-active active'
                    : 'bg-transparent hover:bg-slate-200/60',
                ].join(' ')}
              >
                <Text
                  className={
                    viewMode === 'teams'
                      ? 'text-base text-center text-white font-medium'
                      : 'text-base text-center text-slate-600'
                  }
                >
                  👥 Teams ({summary.data?.length ?? 0})
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setViewMode('students')}
                className={[
                  'liquid-glass-pill flex-1 items-center justify-center rounded-full px-3 py-2 transition-all',
                  viewMode === 'students'
                    ? 'liquid-glass-pill-active active'
                    : 'bg-transparent hover:bg-slate-200/60',
                ].join(' ')}
              >
                <Text
                  className={
                    viewMode === 'students'
                      ? 'text-base text-center text-white font-medium'
                      : 'text-base text-center text-slate-600'
                  }
                >
                  🎓 Students ({studentDirectory.data?.length ?? 0})
                </Text>
              </Pressable>
            </View>

            <View className="w-full sm:flex-1">
              <TextField
                label=""
                placeholder={viewMode === 'teams' ? '🔍 search teams' : '🔍 search students'}
                value={viewMode === 'teams' ? teamSearch : studentSearch}
                onChangeText={viewMode === 'teams' ? setTeamSearch : setStudentSearch}
              />
            </View>
          </View>
        </View>

        {viewMode === 'students' ? (
          <View className="gap-3">
            {/* Sort Students Controls for Student Directory */}
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-sm uppercase tracking-wider text-slate-500">
                Sort directory by:
              </Text>
              {(
                [
                  ['name', 'Name'],
                  ['studentId', 'Student ID'],
                  ['email', 'Email'],
                ] as Array<[SortKey, string]>
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => setSortBy(key)}
                  className={[
                    'rounded-lg px-3 py-1.5 transition-all',
                    sortBy === key
                      ? 'liquid-glass-pill-active'
                      : 'border border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Text
                    className={
                      sortBy === key
                        ? 'text-sm text-[#000000]'
                        : 'text-xs font-medium text-slate-600'
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {studentDirectory.isLoading ? <Loading label="Loading student directory…" /> : null}
            {studentDirectory.isError ? (
              <ErrorState
                message={(studentDirectory.error as Error).message}
                onRetry={() => void studentDirectory.refetch()}
              />
            ) : null}
            {studentDirectory.data ? (
              <DataTable
                columns={[
                  {
                    key: 'name',
                    header: 'Student Name',
                    primary: true,
                    width: 2,
                    render: (s) => (
                      <View className="flex-row items-center gap-2.5 text-left">
                        <Avatar user={s} size={32} />
                        <View className="items-start text-left">
                          <Text className="text-left text-base text-ink">{fullName(s)}</Text>
                          <Text className="text-left text-xs text-muted">{s.email}</Text>
                        </View>
                      </View>
                    ),
                  },
                  {
                    key: 'studentId',
                    header: 'Student ID',
                    width: 1.5,
                    render: (s) => (
                      <Text className="text-left text-base text-slate-700">
                        {s.studentId ?? '—'}
                      </Text>
                    ),
                  },
                  {
                    key: 'email',
                    header: 'Email Address',
                    width: 2,
                    render: (s) => (
                      <Text className="text-left text-sm text-slate-600">{s.email}</Text>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    width: 2,
                    render: (s) => (
                      <View
                        className={[
                          'w-full flex-row items-center gap-2 flex-nowrap',
                          isCompact ? 'justify-start' : 'justify-center',
                        ].join(' ')}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Edit student"
                          onPress={() => handleOpenEditStudent(s)}
                          className="table-action-btn flex-row items-center gap-1 px-3 py-1 cursor-pointer"
                        >
                          <Text className="text-xs">✏️</Text>
                          <Text className="text-xs font-medium">Edit</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete user"
                          onPress={() => {
                            if (
                              typeof window !== 'undefined' &&
                              window.confirm(
                                `Are you sure you want to delete student ${fullName(s)}?`,
                              )
                            ) {
                              deleteUserMutation.mutate(s.id, {
                                onSuccess: () => {
                                  setSuccessMessage(`Successfully deleted student ${fullName(s)}`);
                                  setTimeout(() => setSuccessMessage(''), 5000);
                                },
                              });
                            }
                          }}
                          className="table-action-btn flex-row items-center gap-1 px-3 py-1 cursor-pointer"
                        >
                          <Text className="text-xs">✕</Text>
                          <Text className="text-xs font-medium">Remove</Text>
                        </Pressable>
                      </View>
                    ),
                  },
                ]}
                rows={[...studentDirectory.data]
                  .filter((s) => s.organizationId === selectedOrg)
                  .sort((a, b) => {
                    if (sortBy === 'name')
                      return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
                    if (sortBy === 'studentId')
                      return (a.studentId ?? '').localeCompare(b.studentId ?? '');
                    if (sortBy === 'email') return a.email.localeCompare(b.email);
                    return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
                  })}
                keyExtractor={(s) => s.id}
                onRowPress={(s) => handleOpenEditStudent(s)}
                emptyMessage="No students found matching your search."
              />
            ) : null}
          </View>
        ) : (
          <>
            {summary.isLoading ? <Loading label="Aggregating results…" /> : null}
            {summary.isError ? (
              <ErrorState
                message={(summary.error as Error).message}
                onRetry={() => void summary.refetch()}
              />
            ) : null}

            {summary.data?.length === 0 ? (
              <EmptyState
                title="No teams in this course"
                message="Create a team and add students to start collecting evaluations."
              />
            ) : null}

            {summary.data
              ?.filter((team) =>
                team.teamName.toLowerCase().includes(teamSearch.trim().toLowerCase()),
              )
              .map((team) => {
                const students = [...team.students].sort((a, b) => {
                  if (sortBy === 'name')
                    return (a.user.lastName + a.user.firstName).localeCompare(
                      b.user.lastName + b.user.firstName,
                    );
                  if (sortBy === 'studentId')
                    return (a.user.studentId ?? '').localeCompare(b.user.studentId ?? '');
                  if (sortBy === 'email') return a.user.email.localeCompare(b.user.email);
                  if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
                  return b.overall - a.overall;
                });

                const isExpanded = Boolean(expandedTeams[team.teamId]);

                return (
                  <View
                    key={team.teamId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                  >
                    <View
                      className={`justify-between gap-3 ${
                        isCompact ? 'flex-col items-stretch' : 'flex-row items-center px-5'
                      }`}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isExpanded }}
                        onPress={() => toggleTeam(team.teamId)}
                        /* The badges have an intrinsic width the name does not;
                           in a row on a phone they squeeze the name to a single
                           character per line, so stack them instead. */
                        className={`flex-1 gap-3 ${
                          isCompact ? 'flex-col items-start' : 'flex-row items-center'
                        }`}
                      >
                        <View className="w-full flex-1">
                          <Text className="text-xl text-ink">{team.teamName}</Text>
                          <Text className="mt-0.5 text-xs text-muted">
                            {team.memberCount} members · {percent(team.completionRate)} submitted
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Badge
                            label={team.overall > 0 ? `${score(team.overall)} avg` : 'No data'}
                            tone={
                              team.completionRate >= 1
                                ? 'success'
                                : team.completionRate > 0
                                  ? 'warning'
                                  : 'neutral'
                            }
                          />
                          <TeamBadges
                            submittedCount={team.submittedCount}
                            expectedCount={team.expectedCount}
                          />
                        </View>
                      </Pressable>

                      <View className="flex-row items-center gap-2">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Edit team"
                          onPress={() =>
                            navigation.navigate('CreateTeam', {
                              courseId: activeCourse?.id ?? '',
                              courseCode: activeCourse?.code ?? '',
                              teamId: team.teamId,
                              initialName: team.teamName,
                              initialMemberIds: team.students.map((s) => s.user.id),
                            })
                          }
                          className="flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                          <Text className="text-sm text-slate-500">✏</Text>
                          <Text className="text-sm text-slate-700">Edit</Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete team"
                          onPress={() => {
                            if (
                              typeof window !== 'undefined' &&
                              window.confirm(
                                `Are you sure you want to delete team "${team.teamName}"?`,
                              )
                            ) {
                              deleteTeamMutation.mutate(team.teamId, {
                                onSuccess: () => {
                                  setSuccessMessage(`Successfully deleted team "${team.teamName}"`);
                                  setTimeout(() => setSuccessMessage(''), 5000);
                                },
                              });
                            }
                          }}
                          className="flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 shadow-sm hover:border-slate-300 hover:bg-slate-100/80 transition-all"
                        >
                          <Text className="text-sm text-slate-700">🗑</Text>
                          <Text className="text-sm text-slate-700">Delete</Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Toggle details"
                          onPress={() => toggleTeam(team.teamId)}
                          className="h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
                        >
                          <Text className="text-sm text-[#000000]">{isExpanded ? '▲' : '▼'}</Text>
                        </Pressable>
                      </View>
                    </View>

                    {isExpanded ? (
                      <View className="mt-4 gap-4 border-t border-slate-200 pt-4">
                        {team.overall > 0 ? (
                          <View className="gap-3">
                            {Object.values(EvalDimension).map((d) => (
                              <ScoreBar
                                key={d}
                                label={DIMENSION_LABELS[d]}
                                value={team.averages[d]}
                              />
                            ))}
                          </View>
                        ) : null}

                        <View className="gap-2">
                          {students.map((s) => (
                            <View
                              key={s.user.id}
                              className={`justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50/70 p-3 ${
                                isCompact ? 'flex-col items-stretch' : 'flex-row items-center px-5'
                              }`}
                            >
                              <View className="w-full flex-1">
                                <Text className="text-base text-ink-900">
                                  {s.user.firstName} {s.user.lastName}
                                </Text>
                                <Text className="text-xs text-ink-500">
                                  {s.user.studentId ? `ID ${s.user.studentId} · ` : ''}
                                  {s.reviewCount} review{s.reviewCount === 1 ? '' : 's'}
                                  {s.comments.length > 0 ? ` · ${s.comments.length} comments` : ''}
                                </Text>
                              </View>
                              <View className="flex-row flex-wrap items-center gap-3">
                                <StudentBadges
                                  averages={s.averages}
                                  overall={s.overall}
                                  reviewCount={s.reviewCount}
                                />
                                <Text className="text-base text-ink-900">
                                  {s.reviewCount > 0 ? score(s.overall) : '—'}
                                </Text>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel="Delete user"
                                  onPress={() => {
                                    if (
                                      typeof window !== 'undefined' &&
                                      window.confirm(
                                        `Are you sure you want to delete user ${s.user.firstName} ${s.user.lastName}?`,
                                      )
                                    ) {
                                      deleteUserMutation.mutate(s.user.id, {
                                        onSuccess: () => {
                                          setSuccessMessage(
                                            `Successfully deleted student ${s.user.firstName} ${s.user.lastName}`,
                                          );
                                          setTimeout(() => setSuccessMessage(''), 5000);
                                        },
                                      });
                                    }
                                  }}
                                  className="flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 shadow-xs hover:border-slate-300 hover:bg-slate-100 transition-all"
                                >
                                  <Text className="text-sm text-slate-700">✕</Text>
                                  <Text className="text-xs font-medium text-slate-700">Remove</Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>

                        <Button
                          label="Open team details"
                          variant="secondary"
                          onPress={() => navigation.navigate('TeamDetail', { teamId: team.teamId })}
                          fullWidth
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
          </>
        )}
      </Screen>
    </AppShell>
  );
}
