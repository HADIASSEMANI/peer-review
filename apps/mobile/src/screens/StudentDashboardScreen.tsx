import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DIMENSION_LABELS,
  EVAL_DIMENSIONS,
  EvalDimension,
  type EvaluationTarget,
  type Team,
} from '@repo/types';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Alert } from '../components/Alert';
import { AppShell } from '../components/AppShell';
import { DataTable, type Column } from '../components/DataTable';
import { GradientButton } from '../components/GradientButton';
import { ErrorState, Loading } from '../components/Screen';
import { ScoreBar } from '../components/ScoreBar';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useEvaluationTargets, useMyFeedback } from '../hooks/useEvaluations';
import { useTeams } from '../hooks/useTeams';
import { fullName, score } from '../lib/format';
import { useAuthStore } from '../store/auth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentDashboard'>;
type Tab = 'My Teams' | 'Submissions' | 'Feedback';

const TABS: Tab[] = ['My Teams', 'Submissions', 'Feedback'];

/** Emoji + label per tab, matching the instructor dashboard's segmented control. */
const TAB_EMOJI: Record<Tab, string> = {
  'My Teams': '👥',
  Submissions: '📝',
  Feedback: '💬',
};

/** Compact criterion labels for the dense comments cell. */
const SHORT_LABEL: Record<EvalDimension, string> = {
  [EvalDimension.COOPERATION]: 'Cooperation',
  [EvalDimension.CONCEPTUAL]: 'Conceptual',
  [EvalDimension.PRACTICAL]: 'Practical',
  [EvalDimension.WORK_ETHIC]: 'Ethic',
};

const avg = (t: EvaluationTarget): string => {
  if (!t.existing) return '—';
  const r = t.existing;
  return (
    (r.cooperation + r.conceptualContribution + r.practicalContribution + r.workEthic) /
    4
  ).toFixed(2);
};

const shortDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString() : '—';

export function StudentDashboardScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const { isCompact } = useBreakpoint();
  const [active, setActive] = useState<Tab>('My Teams');
  const [expandedFeedbackIndexes, setExpandedFeedbackIndexes] = useState<Record<number, boolean>>({});

  const toggleFeedback = (index: number) => {
    setExpandedFeedbackIndexes((prev) => ({ ...prev, [index]: !prev[index] }));
  };
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const teams = useTeams();
  const currentTeamId = selectedTeamId;
  const targets = useEvaluationTargets(currentTeamId ?? '');
  const feedback = useMyFeedback();

  const selectedTeam = currentTeamId ? (teams.data?.find((t) => t.id === currentTeamId) ?? null) : null;

  const tabCounts: Record<Tab, number | null> = {
    'My Teams': teams.data?.length ?? null,
    Submissions: currentTeamId
      ? ((targets.data ?? []).filter((t) => t.submitted).length ?? null)
      : null,
    Feedback: feedback.data?.comments.length ?? null,
  };

  const teamColumns = useMemo<Array<Column<Team>>>(
    () => [
      { key: 'name', header: 'Team', primary: true, width: 2, render: (t) => t.name },
      { key: 'size', header: 'Members', render: (t) => String(t.members.length) },
      { key: 'course', header: 'Course', width: 2, render: (t) => t.course?.code ?? '—' },
      { key: 'term', header: 'Term', render: (t) => t.course?.term ?? '—' },
    ],
    [],
  );

  const submissionColumns = useMemo<Array<Column<EvaluationTarget>>>(
    () => [
      {
        key: 'teammate',
        header: 'Teammate',
        primary: true,
        width: 2,
        render: (t) => fullName(t.user),
      },
      { key: 'coop', header: 'Cooperation', render: (t) => t.existing?.cooperation ?? '—' },
      {
        key: 'conceptual',
        header: 'Conceptual Contribution',
        render: (t) => t.existing?.conceptualContribution ?? '—',
      },
      {
        key: 'practical',
        header: 'Practical Contribution',
        render: (t) => t.existing?.practicalContribution ?? '—',
      },
      { key: 'ethic', header: 'Work Ethic', render: (t) => t.existing?.workEthic ?? '—' },
      {
        key: 'comments',
        header: 'Comments',
        width: 3,
        render: (t) => (
          <View className="gap-0.5">
            {EVAL_DIMENSIONS.map((d) => (
              <Text key={d} className="text-sm text-ink">
                <Text className="">{SHORT_LABEL[d]}:</Text>{' '}
                {t.existingComments?.[d]?.trim() || 'No comment'}
              </Text>
            ))}
          </View>
        ),
      },
      { key: 'average', header: 'Average', render: (t) => avg(t) },
      { key: 'date', header: 'Date', render: (t) => shortDate(t.submittedAt) },
    ],
    [],
  );

  if (teams.isLoading) {
    return (
      <AppShell>
        <Loading label="Loading your teams…" />
      </AppShell>
    );
  }

  if (teams.isError) {
    return (
      <AppShell>
        <ErrorState message={(teams.error as Error).message} onRetry={() => void teams.refetch()} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View className="mx-auto w-full max-w-5xl gap-5">
        <View className="gap-1">
          <Text className="text-3xl text-ink">
            Welcome{user ? `, ${user.firstName}` : ''}
          </Text>
          <Text className="text-sm text-muted">
            {selectedTeam
              ? `${selectedTeam.name} · ${selectedTeam.course?.code ?? ''} ${selectedTeam.course?.term ?? ''}`
              : 'Student dashboard'}
          </Text>
        </View>

        {/* Sidebar for Desktop, Top Tabs for Mobile */}
        <View className={`w-full ${isCompact ? 'flex-col gap-4' : 'flex-row gap-8 items-start'}`}>
          <View
            className={`${
              isCompact
                ? 'w-full flex-row justify-around gap-2 rounded-xl bg-slate-100 p-1'
                : 'w-56 flex-col gap-1 rounded-xl bg-slate-100 p-1.5'
            }`}
          >
            {TABS.map((tab) => {
              const on = tab === active;
              const count = tabCounts[tab];
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => setActive(tab)}
                  className={[
                    'rounded-lg px-4 py-2.5 flex-row items-center gap-2 transition-all',
                    isCompact ? 'flex-1 justify-center' : 'w-full',
                    on ? 'liquid-glass-pill-active' : 'bg-transparent hover:bg-slate-100',
                  ].join(' ')}
                >
                  <Text
                    className={
                      on
                        ? 'text-base text-[#15803d]'
                        : 'text-sm font-medium text-slate-600'
                    }
                  >
                    {TAB_EMOJI[tab]} {tab}
                    {count === null ? '' : ` (${count})`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Tab Content */}
          <View className="flex-1 w-full gap-5">
            {active === 'My Teams' ? (
              <View className="gap-4">
                <DataTable
                  columns={teamColumns}
                  rows={teams.data ?? []}
                  keyExtractor={(t) => t.id}
                  onRowPress={(t) => setSelectedTeamId((prev) => (prev === t.id ? null : t.id))}
                  selectedKey={currentTeamId}
                  emptyMessage="Your instructor has not added you to a team yet."
                />

                {selectedTeam ? (
                  <View className="gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                    <Text className="text-xl text-ink">
                      {selectedTeam.name} — Teammates
                    </Text>
                    <View className="gap-2 pl-2">
                      {selectedTeam.members
                        .filter((m) => m.userId !== user?.id)
                        .map((m) => (
                          <Text key={m.id} className="text-base font-medium text-slate-800">
                            • {fullName(m.user)}
                            {m.user.studentId ? ` (${m.user.studentId})` : ''}
                          </Text>
                        ))}
                    </View>
                    <View className="pt-2">
                      <GradientButton
                        label="Go to Peer Evaluation Form"
                        tone="blue"
                        fullWidth={isCompact}
                        onPress={() =>
                          navigation.navigate('EvaluationForm', {
                            teamId: selectedTeam.id,
                            teamName: selectedTeam.name,
                          })
                        }
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {active === 'Submissions' ? (
              <View className="gap-4">
                <Alert title="Confidentiality Reminder">
                  Please maintain the confidentiality of all peer feedback information.
                </Alert>

                {targets.isLoading ? <Loading label="Loading submissions…" /> : null}
                {targets.isError ? (
                  <ErrorState
                    message={(targets.error as Error).message}
                    onRetry={() => void targets.refetch()}
                  />
                ) : (
                  <DataTable
                    columns={submissionColumns}
                    rows={(targets.data ?? []).filter((t) => t.submitted)}
                    keyExtractor={(t) => t.user.id}
                    emptyMessage="No peer feedback found."
                  />
                )}
              </View>
            ) : null}

            {active === 'Feedback' ? (
              <View className="mx-auto w-full max-w-[700px] gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
                <Text className="text-center text-[32px] text-ink">Peer Feedback</Text>

                {feedback.data && feedback.data.reviewCount > 0 ? (
                  <>
                    <View className="gap-3">
                      {Object.values(EvalDimension).map((d) => (
                        <ScoreBar key={d} label={DIMENSION_LABELS[d]} value={feedback.data.averages[d]} />
                      ))}
                      <Text className="text-center text-sm text-muted">
                        Overall {score(feedback.data.overall)} / 7 from {feedback.data.reviewCount}{' '}
                        anonymous review{feedback.data.reviewCount === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View className="gap-4">
                      {feedback.data.comments.map((comment, index) => {
                        const isExpanded = Boolean(expandedFeedbackIndexes[index]);
                        return (
                          <View
                            key={`${index}-${comment.text.slice(0, 12)}`}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm"
                          >
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ expanded: isExpanded }}
                              onPress={() => toggleFeedback(index)}
                              className="flex-row items-center justify-between gap-3"
                            >
                              <Text className="text-sm uppercase tracking-wide text-[#15803d]">
                                {DIMENSION_LABELS[comment.dimension]}
                              </Text>
                              <View className="flex-row items-center gap-2">
                                <Text className="text-xs text-muted">
                                  {isExpanded ? 'Hide comment' : 'Show comment'}
                                </Text>
                                <Text className="text-base text-[#15803d]">
                                  {isExpanded ? '▲' : '▼'}
                                </Text>
                              </View>
                            </Pressable>

                            {isExpanded ? (
                              <View className="mt-3 border-t border-slate-200 pt-3">
                                <Text className="text-base leading-6 text-slate-800">{comment.text}</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text className="text-center text-base text-slate-600">
                    Your feedback from other students will be displayed here.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </AppShell>
  );
}

