import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DIMENSION_LABELS, EvalDimension, Role, type PublicUser } from '@repo/types';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
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
import { useCourses, useDeleteTeam, useDeleteUser, useStudents } from '../hooks/useTeams';
import { useUpdateUser } from '../hooks/useUsers';
import { fullName, percent, score } from '../lib/format';
import { useAuthStore } from '../store/auth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'InstructorDashboard'>;
type SortKey = 'overall' | 'name' | 'studentId' | 'email' | 'reviews';

const getCourseOrg = (code: string): string => {
  if (code.startsWith('ECSE') || code.startsWith('COMP 2')) return 'org2';
  if (code.startsWith('IFT')) return 'org3';
  if (code.startsWith('INF 3')) return 'org4';
  if (code.startsWith('LOG')) return 'org5';
  if (code.startsWith('INF 1')) return 'org6';
  return 'org1';
};

export function InstructorDashboardScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const selectedOrg = useAuthStore((s) => s.selectedOrg);
  const setSelectedOrg = useAuthStore((s) => s.setSelectedOrg);

  const courses = useCourses();
  const createUserMutation = useCreateUser();
  const deleteTeamMutation = useDeleteTeam();
  const deleteUserMutation = useDeleteUser();
  const updateUserMutation = useUpdateUser();

  const [courseId, setCourseId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('overall');
  const [teamSearch, setTeamSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [viewMode, setViewMode] = useState<'teams' | 'students'>('teams');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const studentDirectory = useStudents(studentSearch || undefined);

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
      setStudentIdError('Please enter a proper student ID');
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
    (course) => getCourseOrg(course.code) === selectedOrg,
  );
  const activeCourseId =
    courseId && filteredCourses.some((c) => c.id === courseId)
      ? courseId
      : (filteredCourses[0]?.id ?? '');

  const summary = useCourseSummary(activeCourseId);
  const activeCourse = filteredCourses.find((c) => c.id === activeCourseId);

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
          options={[
            { label: 'Concordia University', value: 'org1' },
            { label: 'McGill University', value: 'org2' },
            { label: 'Université de Montréal', value: 'org3' },
            { label: 'Université du Québec à Montréal', value: 'org4' },
            { label: 'École de technologie supérieure', value: 'org5' },
            { label: 'Polytechnique Montréal', value: 'org6' },
          ]}
        />
      </View>

      {filteredCourses.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {filteredCourses.map((course) => {
            const selected = course.id === activeCourseId;
            return (
              <Pressable
                key={course.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setCourseId(course.id)}
                className={[
                  'rounded-full px-3.5 py-2 transition-all',
                  selected
                    ? 'liquid-glass-pill-active'
                    : 'border border-slate-300 bg-white hover:bg-slate-50',
                ].join(' ')}
              >
                <Text
                  className={selected ? 'text-sm font-bold text-[#2563eb]' : 'text-sm text-ink-700'}
                >
                  {course.code} · {course.term}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title="No courses in this organization"
          message="Select a different organization or create a new course for this school."
        />
      )}

      <ToastBanner message={successMessage} onClose={() => setSuccessMessage('')} />

      <View className="flex-row items-center gap-3">
        {activeCourse ? (
          <View className="flex-1 min-w-[140px]">
            <Button
              label="Create a team"
              variant="secondary"
              onPress={() =>
                navigation.navigate('CreateTeam', {
                  courseId: activeCourse.id,
                  courseCode: activeCourse.code,
                })
              }
              fullWidth
            />
          </View>
        ) : null}
        <View className="flex-1 min-w-[140px]">
          <GradientButton
            label="+ Add New Student"
            tone="green"
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
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            {/* Top gradient accent bar */}
            <View className="h-2 w-full bg-gradient-to-r from-[#39ac46] via-[#00abec] to-[#2563eb]" />

            <View className="flex-1 p-5 sm:p-6 gap-3">
              {/* Header */}
              <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-[#eff6ff]">
                    <Text className="text-lg">🎓</Text>
                  </View>
                  <View>
                    <Text className="text-xl font-extrabold text-ink">Add New Student</Text>
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
                  <Text className="text-sm font-bold text-slate-500">✕</Text>
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
                        setStudentId(text);
                        setStudentIdError('');
                      }}
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
                  <View className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                    <Text className="text-xs font-semibold text-blue-700">{submitError}</Text>
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
                  <Text className="text-sm font-semibold text-slate-600">Cancel</Text>
                </Pressable>
                <View className="min-w-[140px]">
                  <GradientButton
                    label={createUserMutation.isPending ? 'Creating…' : 'Create Student'}
                    tone="green"
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
            <View className="h-2 w-full bg-gradient-to-r from-[#2563eb] via-[#00abec] to-[#39ac46]" />

            <View className="flex-1 p-5 sm:p-6 gap-3">
              {/* Header */}
              <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-[#eff6ff]">
                    <Text className="text-lg">✏️</Text>
                  </View>
                  <View>
                    <Text className="text-xl font-extrabold text-ink">Edit Student Info</Text>
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
                  <Text className="text-sm font-bold text-slate-500">✕</Text>
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
                      onChangeText={(text) => setEditStudentId(text)}
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
                  <View className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                    <Text className="text-xs font-semibold text-blue-700">{editError}</Text>
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
                  <Text className="text-sm font-semibold text-slate-600">Cancel</Text>
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
        <View className="flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <View className="flex-row gap-2 rounded-xl bg-slate-100 p-1">
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewMode('teams')}
              className={[
                'rounded-lg px-4 py-2 transition-all',
                viewMode === 'teams' ? 'liquid-glass-pill-active' : 'bg-transparent',
              ].join(' ')}
            >
              <Text
                className={
                  viewMode === 'teams'
                    ? 'text-sm font-bold text-[#2563eb]'
                    : 'text-sm font-medium text-slate-600'
                }
              >
                👥 Teams ({summary.data?.length ?? 0})
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewMode('students')}
              className={[
                'rounded-lg px-4 py-2 transition-all',
                viewMode === 'students' ? 'liquid-glass-pill-active' : 'bg-transparent',
              ].join(' ')}
            >
              <Text
                className={
                  viewMode === 'students'
                    ? 'text-sm font-bold text-[#2563eb]'
                    : 'text-sm font-medium text-slate-600'
                }
              >
                🎓 Student Directory ({studentDirectory.data?.length ?? 0})
              </Text>
            </Pressable>
          </View>

          <View className="w-full sm:w-72">
            <TextField
              label=""
              placeholder={
                viewMode === 'teams' ? '🔍 Search teams by name...' : '🔍 Search students'
              }
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
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                      ? 'text-xs font-bold text-[#2563eb]'
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
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleOpenEditStudent(s)}
                      className="flex-row items-center gap-2.5 hover:opacity-80 transition-all text-left"
                    >
                      <Avatar user={s} size={32} />
                      <View className="items-start text-left">
                        <Text className="text-left text-sm font-bold text-[#2563eb] underline">
                          {fullName(s)}
                        </Text>
                        <Text className="text-left text-xs text-muted">{s.email}</Text>
                      </View>
                    </Pressable>
                  ),
                },
                {
                  key: 'studentId',
                  header: 'Student ID',
                  width: 1.5,
                  render: (s) => (
                    <Text className="text-left text-sm font-bold text-slate-700">
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
                    <View className="w-full flex-row items-center justify-between gap-2 flex-nowrap">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit student"
                        onPress={() => handleOpenEditStudent(s)}
                        className="flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 shadow-xs hover:border-slate-300 hover:bg-slate-100 transition-all"
                      >
                        <Text className="text-xs">✏️</Text>
                        <Text className="text-xs font-medium text-slate-700">Edit</Text>
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
                        className="flex-row items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 shadow-xs hover:border-blue-300 hover:bg-blue-100 transition-all"
                      >
                        <Text className="text-xs font-bold text-blue-600">✕</Text>
                        <Text className="text-xs font-medium text-blue-700">Remove</Text>
                      </Pressable>
                    </View>
                  ),
                },
              ]}
              rows={[...studentDirectory.data].sort((a, b) => {
                if (sortBy === 'name')
                  return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
                if (sortBy === 'studentId')
                  return (a.studentId ?? '').localeCompare(b.studentId ?? '');
                if (sortBy === 'email') return a.email.localeCompare(b.email);
                return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
              })}
              keyExtractor={(s) => s.id}
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
                  <View className="flex-row items-center justify-between gap-3">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      onPress={() => toggleTeam(team.teamId)}
                      className="flex-1 flex-row items-center gap-3"
                    >
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-ink">{team.teamName}</Text>
                        <Text className="mt-0.5 text-xs text-muted">
                          {team.memberCount} members · {percent(team.completionRate)} submitted
                        </Text>
                      </View>
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
                        <Text className="text-xs font-bold text-slate-500">✏</Text>
                        <Text className="text-xs font-semibold text-slate-700">Edit</Text>
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
                        className="flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 shadow-sm hover:border-blue-300 hover:bg-blue-100/80 transition-all"
                      >
                        <Text className="text-xs font-bold text-blue-600">🗑</Text>
                        <Text className="text-xs font-semibold text-blue-700">Delete</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Toggle details"
                        onPress={() => toggleTeam(team.teamId)}
                        className="h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
                      >
                        <Text className="text-xs font-bold text-[#2563eb]">
                          {isExpanded ? '▲' : '▼'}
                        </Text>
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
                            className="flex-row items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50/70 p-3"
                          >
                            <View className="flex-1">
                              <Text className="text-sm font-bold text-ink-900">
                                {s.user.firstName} {s.user.lastName}
                              </Text>
                              <Text className="text-xs text-ink-500">
                                {s.user.studentId ? `ID ${s.user.studentId} · ` : ''}
                                {s.reviewCount} review{s.reviewCount === 1 ? '' : 's'}
                                {s.comments.length > 0 ? ` · ${s.comments.length} comments` : ''}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-3">
                              <Text className="text-sm font-extrabold text-ink-900">
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
                                className="flex-row items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 shadow-xs hover:border-blue-300 hover:bg-blue-100 transition-all"
                              >
                                <Text className="text-xs font-bold text-blue-600">✕</Text>
                                <Text className="text-xs font-medium text-blue-700">Remove</Text>
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
  );
}
