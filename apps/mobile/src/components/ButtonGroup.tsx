import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export interface GroupItem {
  label: string;
  onPress: () => void;
  /** Renders as the raised glass capsule. At most one item should set this. */
  primary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  testID?: string;
}

interface ButtonGroupProps {
  items: GroupItem[];
  height?: number;
  /** Stacks the glyph above the label. */
  stacked?: boolean;
  /**
   * `sm` is sized to its labels rather than the container, for compact rows
   * that should read at the same weight as nearby body text.
   */
  size?: 'sm' | 'md';
  /**
   * Give every item its own capsule instead of sharing one track. Use when the
   * actions are independent shortcuts rather than alternatives within a set —
   * a shared track implies "pick one of these", which is wrong for, say, two
   * unrelated autofill buttons.
   */
  separated?: boolean;
}

const SIZE = {
  sm: { height: 30, pad: 'px-2.5', text: 'text-xs', icon: 'text-xs', gap: 'gap-1' },
  md: { height: 56, pad: 'px-3', text: 'text-base', icon: 'text-base', gap: 'gap-2' },
} as const;

export function ButtonGroup({
  items,
  height,
  stacked = false,
  size = 'md',
  separated = false,
}: ButtonGroupProps) {
  const s = SIZE[size];
  const rowHeight = height ?? s.height;
  const compact = size === 'sm';

  const segment = (item: GroupItem) => {
    const inactive = item.disabled || item.loading;
    return (
      <Pressable
        key={item.label}
        testID={item.testID}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: inactive, busy: item.loading }}
        disabled={inactive}
        onPress={item.onPress}
        style={{ height: rowHeight }}
        className={[
          'glass-seg items-center justify-center rounded-full',
          s.pad,
          // Standalone capsules always hug their label; inside a shared track
          // the segments split the width unless the group is compact.
          separated || compact ? 'shrink-0' : 'flex-1',
          stacked ? `flex-col ${s.gap}` : `flex-row ${s.gap}`,
          item.primary ? 'glass-seg-active' : '',
          inactive ? 'opacity-45' : '',
        ].join(' ')}
      >
        {item.loading ? (
          <ActivityIndicator size="small" color="#0f172a" />
        ) : item.icon ? (
          <Text className={stacked ? 'text-lg' : s.icon}>{item.icon}</Text>
        ) : null}
        <Text
          className={[
            'text-center',
            stacked ? 'text-sm' : s.text,
            item.primary ? 'text-ink-900' : 'text-slate-600',
          ].join(' ')}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  if (separated) {
    return (
      <View
        className={[
          'flex-row flex-wrap items-center gap-2',
          compact ? 'justify-center' : 'w-full',
        ].join(' ')}
      >
        {items.map((item) => (
          // Each capsule is its own track, so each keeps the glass frame.
          <View key={item.label} className="glass-group flex-row items-center rounded-full p-1">
            {segment(item)}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      className={[
        'glass-group flex-row items-center rounded-full',
        compact ? 'self-center gap-1 p-1' : 'w-full gap-1.5 p-1.5',
      ].join(' ')}
    >
      {items.map(segment)}
    </View>
  );
}
