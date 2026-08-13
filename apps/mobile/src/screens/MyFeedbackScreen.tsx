import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DIMENSION_LABELS, EvalDimension } from '@repo/types';
import { Text, View } from 'react-native';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, Loading, Screen } from '../components/Screen';
import { ScoreBar } from '../components/ScoreBar';
import { useMyFeedback } from '../hooks/useEvaluations';
import { score } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MyFeedback'>;

export function MyFeedbackScreen({ route }: Props) {
  const feedback = useMyFeedback(route.params?.teamId);

  if (feedback.isLoading) return <Loading label="Loading feedback…" />;
  if (feedback.isError) {
    return (
      <Screen title="Your feedback">
        <ErrorState
          message={(feedback.error as Error).message}
          onRetry={() => void feedback.refetch()}
        />
      </Screen>
    );
  }

  const data = feedback.data;
  if (!data || data.reviewCount === 0) {
    return (
      <Screen title="Your feedback">
        <EmptyState
          title="Nothing to show yet"
          message="Once your teammates submit their evaluations, your scores and their anonymous comments appear here."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Your feedback"
      subtitle={`${data.reviewCount} review${data.reviewCount === 1 ? '' : 's'} · overall ${score(data.overall)} / 7`}
      refreshing={feedback.isFetching}
      onRefresh={() => void feedback.refetch()}
    >
      <Card title="By dimension">
        <View className="gap-3">
          {Object.values(EvalDimension).map((d) => (
            <ScoreBar key={d} label={DIMENSION_LABELS[d]} value={data.averages[d]} />
          ))}
        </View>
      </Card>

      <Card
        title="Anonymous comments"
        subtitle="Reviewer identities are never sent to this screen."
      >
        {data.comments.length > 0 ? (
          <View className="gap-3">
            {data.comments.map((comment, index) => (
              <View
                key={`${index}-${comment.text.slice(0, 12)}`}
                className="gap-1 rounded-md border border-[#ccc] bg-white p-4"
              >
                <Text className="text-center text-sm uppercase tracking-wide text-muted">
                  {DIMENSION_LABELS[comment.dimension]}
                </Text>
                <Text className="text-center text-base text-quiet">{comment.text}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-ink-500">
            Your teammates rated you but did not leave written comments.
          </Text>
        )}
      </Card>
    </Screen>
  );
}
