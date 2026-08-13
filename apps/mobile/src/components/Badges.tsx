import { EVAL_DIMENSIONS, RATING_MAX, type DimensionAverage, type EvalDimension } from '@repo/types';
import { Text, View } from 'react-native';

interface BadgeDef {
  emoji: string;
  label: string;
}

/**
 * Recreates the original app's emoji badges. It used Mantine Tooltips, which
 * do not exist on touch devices — the meaning is exposed as an accessibility
 * label instead so it survives on phones and screen readers.
 */
const STUDENT_BADGES: Record<EvalDimension, BadgeDef> = {
  cooperation: { emoji: '👑', label: 'Leader: Perfect score in Cooperation' },
  conceptualContribution: {
    emoji: '🌟',
    label: 'Visionary: Perfect score in Conceptual Contribution',
  },
  practicalContribution: {
    emoji: '🔨',
    label: 'Master Builder: Perfect score in Practical Contribution',
  },
  workEthic: { emoji: '⭐', label: 'Role Model: Perfect score in Work Ethic' },
};

const STAR_PERFORMER: BadgeDef = { emoji: '🏆', label: 'Star Performer: Perfect average score' };
const NONE: BadgeDef = { emoji: '⏳', label: 'Keep working to earn badges!' };

function BadgeRow({ badges }: { badges: BadgeDef[] }) {
  const shown = badges.length > 0 ? badges : [NONE];
  return (
    <View className="flex-row flex-wrap items-center gap-1">
      {shown.map((b) => (
        <Text key={b.label} accessibilityLabel={b.label} className="text-base">
          {b.emoji}
        </Text>
      ))}
    </View>
  );
}

/**
 * A badge per criterion scored a perfect 7, plus Star Performer for a perfect
 * overall — and only once more than one review is in, so a single generous
 * teammate cannot mint badges.
 */
export function StudentBadges({
  averages,
  overall,
  reviewCount,
}: {
  averages: DimensionAverage;
  overall: number;
  reviewCount: number;
}) {
  if (reviewCount <= 1) return <BadgeRow badges={[]} />;
  const earned = EVAL_DIMENSIONS.filter((d) => averages[d] === RATING_MAX).map(
    (d) => STUDENT_BADGES[d],
  );
  if (overall === RATING_MAX) earned.push(STAR_PERFORMER);
  return <BadgeRow badges={earned} />;
}

/** Full House once every expected evaluation has been submitted. */
export function TeamBadges({
  submittedCount,
  expectedCount,
}: {
  submittedCount: number;
  expectedCount: number;
}) {
  const full = expectedCount > 0 && submittedCount >= expectedCount;
  return (
    <BadgeRow
      badges={full ? [{ emoji: '✅', label: 'Full House: All members submitted feedback' }] : []}
    />
  );
}
