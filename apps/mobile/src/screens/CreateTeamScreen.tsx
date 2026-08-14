import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ButtonGroup } from '../components/ButtonGroup';
import { Card } from '../components/Card';
import { GradientButton } from '../components/GradientButton';
import { ErrorState, Loading, Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useCourses, useCreateTeam, useStudents, useTeams, useUpdateTeam } from '../hooks/useTeams';
import { fullName } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTeam'>;

export function CreateTeamScreen({ route, navigation }: Props) {
  const { courseId, courseCode, teamId, initialName = '', initialMemberIds = [] } = route.params;
  const { isCompact } = useBreakpoint();

  const [name, setName] = useState(initialName);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialMemberIds);

  const courses = useCourses();
  const courseTeams = useTeams(courseId);

  // Unscoped on purpose: a student not yet on any team must be selectable.
  // Confined to the course's own school so cross-organization rosters are impossible.
  const courseOrgId = courses.data?.find((c) => c.id === courseId)?.organizationId;
  const students = useStudents(search || undefined, courseOrgId);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam(teamId ?? '');

  const isEditing = Boolean(teamId);
  const activeMutation = isEditing ? updateTeam : createTeam;

  /**
   * A student may only be on one team per course, so anyone already rostered
   * on a *different* team in this course is off-limits. They are shown greyed
   * out with the team name rather than hidden — "where did Priya go?" is a
   * worse experience than "Priya is on Team Alpha".
   */
  const takenBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of courseTeams.data ?? []) {
      if (team.id === teamId) continue;
      for (const m of team.members) map.set(m.userId, team.name);
    }
    return map;
  }, [courseTeams.data, teamId]);

  const toggle = (id: string) => {
    if (takenBy.has(id)) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canSubmit = name.trim().length >= 2 && !activeMutation.isPending;

  const onSubmit = () => {
    if (!canSubmit) return;
    if (isEditing && teamId) {
      updateTeam.mutate(
        { name: name.trim(), memberIds: selected },
        { onSuccess: () => navigation.goBack() },
      );
    } else {
      createTeam.mutate(
        { name: name.trim(), courseId, memberIds: selected },
        { onSuccess: () => navigation.goBack() },
      );
    }
  };

  const submitLabel = isEditing ? 'Save team changes' : 'Create team';

  return (
    <Screen>
      {/* Back sits beside the title, and the submit button lives up here too so
          it is reachable without scrolling past the whole student roster. */}
      <View
        className={`gap-3 border-b border-slate-200 pb-4 ${isCompact ? 'flex-col' : 'flex-row items-center'}`}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            className="flex-row items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50 transition-all"
          >
            <Image
              source={{ uri: '/arrow-back-outline.svg' }}
              accessibilityLabel="Back"
              className="keep-bg icon-on-light"
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
            <Text className="text-base text-slate-700">Back</Text>
          </Pressable>

          <View className="flex-1">
            <Text className="text-3xl text-ink">{isEditing ? 'Edit team' : 'Create a team'}</Text>
            <Text className="text-xs font-medium text-muted">
              {courseCode} ·{' '}
              {isEditing ? 'update team name and roster' : 'pick a name and a roster'}
            </Text>
          </View>
        </View>

        <View className={isCompact ? 'w-full' : 'ml-auto min-w-[180px]'}>
          <GradientButton
            label={activeMutation.isPending ? 'Saving…' : submitLabel}
            onPress={onSubmit}
            disabled={!canSubmit}
            height={44}
            fullWidth
          />
        </View>
      </View>

      <Card>
        <View className="gap-4">
          <TextField
            label="Team Name"
            value={name}
            onChangeText={setName}
            placeholder="Team Gamma"
            autoCapitalize="words"
            onSubmitEditing={onSubmit}
            required
          />
          <TextField
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder="🔍 Search students by name, email, or ID"
          />
        </View>
      </Card>

      <Card
        title="Select Students"
        subtitle={`${selected.length} selected${takenBy.size > 0 ? ` · ${takenBy.size} unavailable` : ''}`}
      >
        {students.isLoading || courseTeams.isLoading ? <Loading label="Loading students…" /> : null}
        {students.isError ? (
          <ErrorState
            message={(students.error as Error).message}
            onRetry={() => void students.refetch()}
          />
        ) : null}

        <View className="gap-1.5">
          {students.data?.map((student) => {
            const isSelected = selected.includes(student.id);
            const onOtherTeam = takenBy.get(student.id);

            return (
              <Pressable
                key={student.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected, disabled: Boolean(onOtherTeam) }}
                accessibilityLabel={
                  onOtherTeam
                    ? `${fullName(student)} — unavailable, already on ${onOtherTeam}`
                    : fullName(student)
                }
                disabled={Boolean(onOtherTeam)}
                onPress={() => toggle(student.id)}
                className={[
                  'flex-row items-center gap-3 rounded-xl border px-3 py-2.5 transition-all',
                  onOtherTeam
                    ? 'border-slate-200 bg-slate-50 opacity-60'
                    : isSelected
                      ? 'liquid-glass-pill-active'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                ].join(' ')}
              >
                <Avatar user={student} size={34} />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-ink-900">{fullName(student)}</Text>
                  <Text className="text-xs text-ink-500">
                    {student.studentId ? `ID ${student.studentId} · ` : ''}
                    {student.email}
                  </Text>
                </View>

                {onOtherTeam ? (
                  <View className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                    <Text className="text-xs text-slate-500">On {onOtherTeam}</Text>
                  </View>
                ) : (
                  <View
                    className={[
                      'h-5 w-5 items-center justify-center rounded-md border',
                      isSelected ? 'border-slate-400 bg-slate-100' : 'border-slate-300',
                    ].join(' ')}
                  >
                    {isSelected ? <Text className="text-sm text-[#000000]">✓</Text> : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {activeMutation.isError ? (
        <View className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <Text className="text-base text-slate-700">
            {(activeMutation.error as Error).message}
          </Text>
        </View>
      ) : null}

      <View className="pb-8">
        <ButtonGroup
          height={54}
          items={[
            {
              label: activeMutation.isPending ? 'Saving…' : submitLabel,
              primary: true,
              disabled: !canSubmit,
              loading: activeMutation.isPending,
              onPress: onSubmit,
            },
            { label: 'Cancel', onPress: () => navigation.goBack() },
          ]}
        />
      </View>
    </Screen>
  );
}
