import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface Column<T> {
  key: string;
  header: string;
  /** Flex weight on wide screens. Comments get a wider column, as before. */
  width?: number;
  render: (row: T) => ReactNode;
  /** Hidden in the stacked card layout — usually the row's own title. */
  primary?: boolean;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  emptyMessage?: string;
  /** Highlights the row matching this key. */
  selectedKey?: string | null;
}

/**
 * The original UI leaned on dense Mantine tables. Those work on a laptop and
 * are miserable on a phone, so this renders the same columns two ways:
 * a bordered striped table on >=768px, and one card per row below that, with
 * each cell labelled by its column header. No horizontal scrolling either way.
 */
export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowPress,
  emptyMessage = 'Nothing to show.',
  selectedKey = null,
}: DataTableProps<T>) {
  const { isCompact } = useBreakpoint();

  if (rows.length === 0) {
    return (
      <View className="items-center rounded-md border border-hair bg-surface px-4 py-8">
        <Text className="text-sm text-muted">{emptyMessage}</Text>
      </View>
    );
  }

  if (isCompact) {
    return (
      <View className="gap-3">
        {rows.map((row) => {
          const selected = selectedKey === keyExtractor(row);
          const primary = columns.find((c) => c.primary);
          const rest = columns.filter((c) => !c.primary);
          const RowComponent = onRowPress ? Pressable : View;
          return (
            <RowComponent
              key={keyExtractor(row)}
              accessibilityRole={onRowPress ? 'button' : undefined}
              onPress={onRowPress ? () => onRowPress(row) : undefined}
              className={[
                'rounded-lg border bg-white p-3',
                selected ? 'border-primary bg-primary-soft' : 'border-hair',
                onRowPress ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              {primary ? (
                <View className="mb-2 border-b border-hair pb-2">
                  {typeof primary.render(row) === 'string' || typeof primary.render(row) === 'number' ? (
                    <Text className="text-base font-semibold text-ink text-left cursor-default">{primary.render(row)}</Text>
                  ) : (
                    primary.render(row)
                  )}
                </View>
              ) : null}
              <View className="gap-1.5">
                {rest.map((col) => (
                  <View key={col.key} className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-xs uppercase tracking-wide text-muted text-left">
                      {col.header}
                    </Text>
                    <View className="flex-[2] items-start justify-center">
                      {typeof col.render(row) === 'string' || typeof col.render(row) === 'number' ? (
                        <Text className="text-left text-sm text-ink cursor-default">{col.render(row)}</Text>
                      ) : (
                        col.render(row)
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </RowComponent>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView horizontal={false} className="rounded-md border border-hair">
      <View className="w-full">
        <View className="flex-row items-center border-b border-hair bg-surface">
          {columns.map((col) => (
            <View
              key={col.key}
              className="border-r border-hair px-3 py-2.5 justify-center min-h-[44px]"
              style={{ flex: col.width ?? 1 }}
            >
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink text-left">
                {col.header}
              </Text>
            </View>
          ))}
        </View>

        {rows.map((row, index) => {
          const selected = selectedKey === keyExtractor(row);
          const RowComponent = onRowPress ? Pressable : View;
          return (
            <RowComponent
              key={keyExtractor(row)}
              accessibilityRole={onRowPress ? 'button' : undefined}
              onPress={onRowPress ? () => onRowPress(row) : undefined}
              className={[
                'flex-row items-center border-b border-hair transition-all',
                selected ? 'liquid-glass-active' : index % 2 === 1 ? 'bg-surface' : 'bg-white',
                onRowPress ? 'hover:bg-blue-50/50 cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              {columns.map((col) => (
                <View
                  key={col.key}
                  className="border-r border-hair px-3 py-2.5 justify-center min-h-[52px]"
                  style={{ flex: col.width ?? 1 }}
                >
                  {typeof col.render(row) === 'string' || typeof col.render(row) === 'number' ? (
                    <Text className="text-sm text-ink text-left cursor-default">{col.render(row)}</Text>
                  ) : (
                    col.render(row)
                  )}
                </View>
              ))}
            </RowComponent>
          );
        })}
      </View>
    </ScrollView>
  );
}
