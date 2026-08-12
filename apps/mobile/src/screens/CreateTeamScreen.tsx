import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorState, Loading, Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useCreateTeam, useStudents, useUpdateTeam } from '../hooks/useTeams';
import { fullName } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTeam'>;

export function CreateTeamScreen({ route, navigation }: Props) {
  const { courseId, courseCode, teamId, initialName = '', initialMemberIds = [] } = route.params;
  const [name, setName] = useState(initialName);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialMemberIds);

  const students = useStudents(search || undefined);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam(teamId ?? '');

  const isEditing = Boolean(teamId);
  const activeMutation = isEditing ? updateTeam : createTeam;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onSubmit = () => {
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

  return (
    <Screen
      title={isEditing ? 'Edit team' : 'Create a team'}
      subtitle={`${courseCode} · ${isEditing ? 'update team name and roster' : 'pick a name and a roster'}`}
    >
      <Card>
        <View className="gap-4">
          <TextField
            label="Team name"
            value={name}
            onChangeText={setName}
            placeholder="Team Gamma"
            autoCapitalize="words"
          />
          <TextField
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Students"
          />
        </View>
      </Card>

      <Card title="Roster" subtitle={`${selected.length} selected`}>
        {students.isLoading ? <Loading label="Loading students…" /> : null}
        {students.isError ? (
          <ErrorState
            message={(students.error as Error).message}
            onRetry={() => void students.refetch()}
          />
        ) : null}

        <View className="gap-1.5">
          {students.data?.map((student) => {
            const isSelected = selected.includes(student.id);
            return (
              <Pressable
                key={student.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggle(student.id)}
                className={[
                  'flex-row items-center gap-3 rounded-xl border px-3 py-2.5 transition-all',
                  isSelected
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
                <View
                  className={[
                    'h-5 w-5 items-center justify-center rounded-md border',
                    isSelected ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-slate-300',
                  ].join(' ')}
                >
                  {isSelected ? <Text className="text-xs font-bold text-[#2563eb]">✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {activeMutation.isError ? (
        <Text className="text-sm text-blue-600">{(activeMutation.error as Error).message}</Text>
      ) : null}

      <View className="gap-2 pb-8">
        <Button
          label={isEditing ? 'Save team changes' : 'Create team'}
          onPress={onSubmit}
          disabled={name.trim().length < 2}
          loading={activeMutation.isPending}
          fullWidth
        />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
      </View>
    </Screen>
  );
}
