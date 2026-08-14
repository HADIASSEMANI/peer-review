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
                'rounded-2xl border bg-white p-4 transition-all shadow-card',
                selected ? 'liquid-glass-active' : 'border-slate-200',
                onRowPress ? 'liquid-glass-row cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              {primary ? (
                <View className="mb-2 border-b border-hair pb-2">
                  {typeof primary.render(row) === 'string' || typeof primary.render(row) === 'number' ? (
                    <Text
                      className={[
                        'text-lg text-ink text-left',
                        onRowPress ? 'cursor-pointer' : 'cursor-default',
                      ].join(' ')}
                    >
                      {primary.render(row)}
                    </Text>
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
                        <Text
                          className={[
                            'text-left text-sm text-ink',
                            onRowPress ? 'cursor-pointer' : 'cursor-default',
                          ].join(' ')}
                        >
                          {col.render(row)}
                        </Text>
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
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card">
      <View className="w-full">
        <View className="flex-row items-center rounded-xl border-b border-slate-200 bg-slate-50/80 mb-1">
          {columns.map((col, i) => (
            <View
              key={col.key}
              className={[
                'px-4 py-3 justify-center min-h-[46px]',
                i < columns.length - 1 ? 'border-r border-slate-200' : '',
              ].join(' ')}
              style={{ flex: col.width ?? 1 }}
            >
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                {col.header}
              </Text>
            </View>
          ))}
        </View>

        {rows.map((row, index) => {
          const selected = selectedKey === keyExtractor(row);
          const RowComponent = onRowPress ? Pressable : View;
          const isLast = index === rows.length - 1;
          return (
            <RowComponent
              key={keyExtractor(row)}
              accessibilityRole={onRowPress ? 'button' : undefined}
              onPress={onRowPress ? () => onRowPress(row) : undefined}
              className={[
                'flex-row items-center rounded-xl my-0.5 transition-all overflow-hidden',
                !isLast && !selected ? 'border-b border-slate-100' : '',
                selected ? 'liquid-glass-active' : index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white',
                onRowPress ? 'liquid-glass-row cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              {columns.map((col, i) => (
                <View
                  key={col.key}
                  className={[
                    'px-4 py-3.5 justify-center min-h-[52px]',
                    onRowPress ? 'cursor-pointer' : '',
                    i < columns.length - 1 ? 'border-r border-slate-100' : '',
                  ].join(' ')}
                  style={{ flex: col.width ?? 1 }}
                >
                  {typeof col.render(row) === 'string' || typeof col.render(row) === 'number' ? (
                    <Text
                      className={[
                        'text-sm font-normal text-slate-800 text-left',
                        onRowPress ? 'cursor-pointer' : 'cursor-default',
                      ].join(' ')}
                    >
                      {col.render(row)}
                    </Text>
                  ) : (
                    col.render(row)
                  )}
                </View>
              ))}
            </RowComponent>
          );
        })}
      </View>
    </View>
  );
}
