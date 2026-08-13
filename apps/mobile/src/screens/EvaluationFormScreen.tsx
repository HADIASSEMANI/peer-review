import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DIMENSION_DESCRIPTIONS,
  DIMENSION_LABELS,
  EVAL_DIMENSIONS,
  RATING_MAX,
  submitEvaluationBatchSchema,
  type SubmitEvaluationBatchInput,
} from '@repo/types';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { Alert } from '../components/Alert';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { GradientButton } from '../components/GradientButton';
import { RatingSelector } from '../components/RatingSelector';
import { EmptyState, ErrorState, Loading } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useEvaluationTargets, useSubmitEvaluations } from '../hooks/useEvaluations';
import { fullName } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EvaluationForm'>;

const DIMENSION_ICONS: Record<string, string> = {
  cooperation: '🤝',
  conceptualContribution: '💡',
  practicalContribution: '🛠️',
  workEthic: '⭐',
};

/** High-end collapsible guidance panel. */
function IntroPanel() {
  const [open, setOpen] = useState(false);

  return (
    <View className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-slate-100/40 to-white p-5 shadow-xs">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#15803d] shadow-xs">
            <Text className="text-lg">📋</Text>
          </View>
          <View>
            <Text className="text-lg text-ink-900">Peer Evaluation Instructions</Text>
            <Text className="text-xs font-medium text-slate-500">
              {open ? 'Click to collapse guidelines' : 'Click to view rating criteria & confidentiality policy'}
            </Text>
          </View>
        </View>
        <View className="h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white">
          <Text className="text-sm text-[#15803d]">{open ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {open ? (
        <View className="mt-4 gap-3 border-t border-slate-100 pt-3">
          <Text className="text-sm leading-6 text-slate-700">
            Rate each of your teammates across four core criteria on a scale of 1 to {RATING_MAX}.
            Submissions are confidential and help build fair team assessment averages.
          </Text>

          <View className="gap-2.5">
            {EVAL_DIMENSIONS.map((d) => (
              <View key={d} className="flex-row items-start gap-2.5 rounded-xl border border-slate-100/80 bg-white/80 p-3">
                <Text className="text-base">{DIMENSION_ICONS[d]}</Text>
                <View className="flex-1">
                  <Text className="text-sm text-ink-900">{DIMENSION_LABELS[d]}</Text>
                  <Text className="mt-0.5 text-xs text-slate-600">{DIMENSION_DESCRIPTIONS[d]}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text className="text-sm leading-5 text-slate-600">
            💡 All 4 numeric ratings are required per teammate before submitting. Written comments are optional but encouraged.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function EvaluationFormScreen({ route, navigation }: Props) {
  const { teamId, teamName } = route.params;
  const { isCompact } = useBreakpoint();
  const targets = useEvaluationTargets(teamId);
  const submit = useSubmitEvaluations(teamId);

  const [activeTeammateIndex, setActiveTeammateIndex] = useState(0);

  const { control, handleSubmit, reset, watch, formState } = useForm<SubmitEvaluationBatchInput>({
    resolver: zodResolver(submitEvaluationBatchSchema),
    defaultValues: { teamId, evaluations: [] },
  });

  const { fields } = useFieldArray({ control, name: 'evaluations' });
  const formValues = watch('evaluations');

  // Prefill from previous submission
  useEffect(() => {
    if (!targets.data) return;
    reset({
      teamId,
      evaluations: targets.data.map((t) => ({
        revieweeId: t.user.id,
        ratings: t.existing ?? {
          cooperation: 4,
          conceptualContribution: 4,
          practicalContribution: 4,
          workEthic: 4,
        },
        comments: t.existingComments ?? {},
      })),
    });
  }, [targets.data, reset, teamId]);

  const onSubmit = handleSubmit((values) => {
    submit.mutate(
      {
        teamId,
        evaluations: values.evaluations.map((e) => ({
          revieweeId: e.revieweeId,
          ratings: e.ratings,
          comments: Object.fromEntries(
            EVAL_DIMENSIONS.map((d) => [d, e.comments?.[d]?.trim() || undefined]),
          ),
        })),
      },
      { onSuccess: () => navigation.goBack() },
    );
  });

  if (targets.isLoading) {
    return (
      <AppShell>
        <Loading label="Loading teammates…" />
      </AppShell>
    );
  }

  if (targets.isError) {
    return (
      <AppShell>
        <ErrorState
          message={(targets.error as Error).message}
          onRetry={() => void targets.refetch()}
        />
      </AppShell>
    );
  }

  if (!targets.data || targets.data.length === 0) {
    return (
      <AppShell>
        <EmptyState
          title="No one to evaluate"
          message="You are the only member of this team right now."
        />
      </AppShell>
    );
  }

  const completedCount = formValues?.filter((ev) =>
    ev?.ratings?.cooperation &&
    ev?.ratings?.conceptualContribution &&
    ev?.ratings?.practicalContribution &&
    ev?.ratings?.workEthic
  ).length ?? 0;

  const totalTeammates = targets.data.length;
  const progressPercent = Math.round((completedCount / totalTeammates) * 100);

  return (
    <AppShell>
      <View className="mx-auto w-full max-w-3xl gap-6 pb-12">
        {/* Top Navigation Bar */}
        <View className="flex-row items-center justify-between gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <Text className="text-2xl text-[#15803d]">←</Text>
          </Pressable>

          <View className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 shadow-xs">
            <Text className="text-sm text-[#15803d]">
              {completedCount} / {totalTeammates} Teammates Completed ({progressPercent}%)
            </Text>
          </View>
        </View>

        {/* Title & Progress Bar */}
        <View className="gap-2">
          <Text className="text-3xl text-ink-900">{teamName} · Peer Assessment</Text>
          <View className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <View
              className="h-full rounded-full bg-gradient-to-r from-[#15803d] to-slate-200 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>

        {/* Guidance Banner */}
        <IntroPanel />

        {/* Teammate Stepper Tabs */}
        <View className="gap-2">
          <Text className="text-sm uppercase tracking-wider text-slate-500">
            Select Teammate to Evaluate:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {targets.data.map((target, idx) => {
              const selected = idx === activeTeammateIndex;
              const isDone = Boolean(
                formValues?.[idx]?.ratings?.cooperation &&
                formValues?.[idx]?.ratings?.conceptualContribution &&
                formValues?.[idx]?.ratings?.practicalContribution &&
                formValues?.[idx]?.ratings?.workEthic
              );

              return (
                <Pressable
                  key={target.user.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveTeammateIndex(idx)}
                  className={[
                    'flex-row items-center gap-2.5 rounded-2xl px-4 py-2.5 transition-all shadow-xs',
                    selected
                      ? 'liquid-glass-pill-active scale-105 border-slate-400'
                      : 'border border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Avatar user={target.user} size={28} />
                  <Text className={selected ? 'text-base text-[#15803d]' : 'text-base text-slate-700'}>
                    {fullName(target.user)}
                  </Text>
                  {isDone ? (
                    <View className="h-5 w-5 items-center justify-center rounded-full bg-slate-500">
                      <Text className="text-xs text-white">✓</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Active Teammate Card */}
        {fields.map((field, index) => {
          if (index !== activeTeammateIndex) return null;
          const target = targets.data[index];
          if (!target) return null;

          return (
            <View key={field.id} className="gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              {/* Teammate Header */}
              <View className="flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <View className="flex-row items-center gap-3.5">
                  <Avatar user={target.user} size={48} />
                  <View>
                    <Text className="text-2xl text-ink-900">{fullName(target.user)}</Text>
                    <Text className="text-xs font-medium text-slate-500">
                      {target.user.studentId ? `Student ID: ${target.user.studentId}` : target.user.email}
                    </Text>
                  </View>
                </View>
                <Badge
                  label={target.submitted ? 'Previously Submitted' : 'Pending Evaluation'}
                  tone={target.submitted ? 'success' : 'neutral'}
                />
              </View>

              {/* 4 Evaluation Dimensions */}
              <View className="gap-6">
                {EVAL_DIMENSIONS.map((dimension) => (
                  <View
                    key={dimension}
                    className="gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 transition-all"
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="text-lg">{DIMENSION_ICONS[dimension]}</Text>
                      <Text className="text-lg text-ink-900">
                        {DIMENSION_LABELS[dimension]}
                      </Text>
                    </View>

                    <Controller
                      control={control}
                      name={`evaluations.${index}.ratings.${dimension}` as const}
                      render={({ field: ratingField, fieldState }) => (
                        <RatingSelector
                          label=""
                          description={DIMENSION_DESCRIPTIONS[dimension]}
                          value={ratingField.value}
                          onChange={ratingField.onChange}
                          error={fieldState.error?.message}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name={`evaluations.${index}.comments.${dimension}` as const}
                      render={({ field: commentField, fieldState }) => (
                        <TextField
                          label="Qualitative Feedback (Optional)"
                          value={commentField.value ?? ''}
                          onChangeText={commentField.onChange}
                          placeholder={`Share feedback on ${fullName(target.user)}'s ${DIMENSION_LABELS[dimension].toLowerCase()}...`}
                          autoCapitalize="sentences"
                          multiline
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </View>
                ))}
              </View>

              {/* Stepper Navigation Buttons */}
              <View className="flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Pressable
                  accessibilityRole="button"
                  disabled={activeTeammateIndex === 0}
                  onPress={() => setActiveTeammateIndex((prev) => Math.max(0, prev - 1))}
                  className={[
                    'rounded-xl border border-slate-200 bg-white px-4 py-2.5 transition-all',
                    activeTeammateIndex === 0 ? 'opacity-40' : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Text className="text-base text-slate-700">← Previous Teammate</Text>
                </Pressable>

                {activeTeammateIndex < totalTeammates - 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActiveTeammateIndex((prev) => Math.min(totalTeammates - 1, prev + 1))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 hover:bg-slate-100 transition-all"
                  >
                    <Text className="text-base text-[#15803d]">Next Teammate →</Text>
                  </Pressable>
                ) : (
                  <View className="rounded-full bg-slate-50 px-3.5 py-1.5 border border-slate-200">
                    <Text className="text-sm text-slate-700">✓ All Teammates Reviewed</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {submit.isError ? (
          <Alert title="Submission Error">{(submit.error as Error).message}</Alert>
        ) : null}

        {/* Bottom Actions */}
        <View className={`gap-3 pt-2 ${isCompact ? 'flex-col' : 'flex-row-reverse'}`}>
          <View className={isCompact ? 'w-full' : 'flex-1'}>
            <GradientButton
              label="Submit All Evaluations"
              onPress={onSubmit}
              loading={submit.isPending || formState.isSubmitting}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            className={`h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 hover:bg-slate-50 transition-all ${
              isCompact ? 'w-full' : 'flex-1'
            }`}
          >
            <Text className="text-lg text-slate-700">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}
