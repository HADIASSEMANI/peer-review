import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DIMENSION_LABELS, EvalDimension, Role } from '@repo/types';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, Loading, Screen } from '../components/Screen';
import { ScoreBar } from '../components/ScoreBar';
import { useTeamSummary } from '../hooks/useEvaluations';
import { useDeleteTeam, useDeleteUser, useTeam } from '../hooks/useTeams';
import { fullName, percent, score } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

export function TeamDetailScreen({ route, navigation }: Props) {
  const { teamId } = route.params;
  const currentUser = useAuthStore((s) => s.user);
  const isInstructor = currentUser?.role === Role.INSTRUCTOR;

  const team = useTeam(teamId);
  const summary = useTeamSummary(teamId);
  const deleteTeam = useDeleteTeam();
  const deleteUser = useDeleteUser();

  const [expandedStudentIds, setExpandedStudentIds] = useState<Record<string, boolean>>({});

  const toggleStudent = (id: string) => {
    setExpandedStudentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (team.isLoading || summary.isLoading) return <Loading label="Loading team…" />;
  if (team.isError) {
    return (
      <Screen title="Team">
        <ErrorState message={(team.error as Error).message} onRetry={() => void team.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen
      title={team.data?.name ?? 'Team'}
      subtitle={
        summary.data
          ? `${summary.data.memberCount} members · ${percent(summary.data.completionRate)} submitted`
          : undefined
      }
      refreshing={summary.isFetching}
      onRefresh={() => void summary.refetch()}
    >
      {isInstructor && team.data ? (
        <View className="flex-row items-center justify-end gap-2 pb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit team"
            onPress={() =>
              navigation.navigate('CreateTeam', {
                courseId: team.data.courseId,
                courseCode: team.data.course?.code ?? '',
                teamId: team.data.id,
                initialName: team.data.name,
                initialMemberIds: team.data.members.map((m) => m.userId),
              })
            }
            className="flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <Text className="text-sm text-slate-500">✏</Text>
            <Text className="text-sm text-slate-700">Edit Team</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete team"
            onPress={() => {
              if (
                typeof window !== 'undefined' &&
                window.confirm(`Are you sure you want to delete team "${team.data.name}"?`)
              ) {
                deleteTeam.mutate(team.data.id, {
                  onSuccess: () => navigation.goBack(),
                });
              }
            }}
            className="flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 shadow-sm hover:border-slate-300 hover:bg-slate-100/80 transition-all"
          >
            <Text className="text-sm text-slate-700">🗑</Text>
            <Text className="text-sm text-slate-700">Delete Team</Text>
          </Pressable>
        </View>
      ) : null}

      {summary.data && summary.data.overall > 0 ? (
        <Card title="Team averages" right={<Badge label={`${score(summary.data.overall)} avg`} tone="brand" />}>
          <View className="gap-3">
            {Object.values(EvalDimension).map((d) => (
              <ScoreBar key={d} label={DIMENSION_LABELS[d]} value={summary.data.averages[d]} />
            ))}
          </View>
        </Card>
      ) : (
        <EmptyState
          title="No evaluations yet"
          message="Results appear here as team members submit their peer assessments."
        />
      )}

      {summary.data?.students.map((s) => {
        const isExpanded = Boolean(expandedStudentIds[s.user.id]);
        return (
          <View
            key={s.user.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              onPress={() => toggleStudent(s.user.id)}
              className="flex-row items-center justify-between gap-3"
            >
              <View className="flex-1 flex-row items-center gap-3">
                <Avatar user={s.user} size={36} />
                <View className="flex-1">
                  <Text className="text-lg text-ink">{fullName(s.user)}</Text>
                  <Text className="text-xs text-muted">
                    {s.user.studentId ? `ID ${s.user.studentId} · ` : ''}
                    {s.reviewCount} review{s.reviewCount === 1 ? '' : 's'} received
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <Badge
                  label={s.reviewCount > 0 ? `${score(s.overall)} / 7` : 'No reviews'}
                  tone={s.reviewCount > 0 ? 'brand' : 'neutral'}
                />
                {isInstructor ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete user"
                    onPress={() => {
                      if (
                        typeof window !== 'undefined' &&
                        window.confirm(`Are you sure you want to delete student ${fullName(s.user)}?`)
                      ) {
                        deleteUser.mutate(s.user.id);
                      }
                    }}
                    className="flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 shadow-xs hover:border-slate-300 hover:bg-slate-100 transition-all"
                  >
                    <Text className="text-sm text-slate-700">✕</Text>
                    <Text className="text-xs font-medium text-slate-700">Remove</Text>
                  </Pressable>
                ) : null}
                <Text className="text-base text-[#15803d]">
                  {isExpanded ? '▲' : '▼'}
                </Text>
              </View>
            </Pressable>

            {isExpanded ? (
              <View className="mt-4 gap-4 border-t border-slate-200 pt-4">
                {s.reviewCount > 0 ? (
                  <View className="gap-3">
                    {Object.values(EvalDimension).map((d) => (
                      <ScoreBar key={d} label={DIMENSION_LABELS[d]} value={s.averages[d]} />
                    ))}
                  </View>
                ) : null}

                {s.comments.length > 0 ? (
                  <View className="gap-2 border-t border-slate-200 pt-3">
                    <Text className="text-base text-ink-900">Anonymous comments</Text>
                    {s.comments.map((comment, index) => (
                      <View
                        key={`${index}-${comment.text.slice(0, 12)}`}
                        className="gap-0.5 rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <Text className="text-sm uppercase tracking-wide text-muted">
                          {DIMENSION_LABELS[comment.dimension]}
                        </Text>
                        <Text className="text-sm leading-5 text-ink">{comment.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

