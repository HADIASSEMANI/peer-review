import { Text, TextInput, View } from 'react-native';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'number-pad';
  multiline?: boolean;
  numberOfLines?: number;
  required?: boolean;
  testID?: string;
  editable?: boolean;
  className?: string;
  /** Fired when Enter is pressed in a single-line field. */
  onSubmitEditing?: () => void;
}

/**
 * Matches the original `.inputBox` styling — 48px tall, 8px radius, grey
 * border — but full-width instead of a fixed 400px so it works on a phone.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  required = false,
  testID,
  editable = true,
  className,
  onSubmitEditing,
}: TextFieldProps) {
  return (
    <View
      className={['relative w-full gap-2 pt-2.5', error ? 'z-50' : 'z-10', className]
        .filter(Boolean)
        .join(' ')}
    >
      {label ? (
        <Text className="text-base text-ink-700">
          {label}
          {required ? <Text className="text-amber-600"> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        selectionColor="#0f172a"
        // Enter submits. Multiline fields keep Enter for newlines.
        onSubmitEditing={multiline ? undefined : onSubmitEditing}
        returnKeyType={multiline ? undefined : 'go'}
        className={[
          'min-h-[48px] rounded-xl border bg-white px-3.5 py-2 text-base text-inkfocus:border-brand-500 focus:bg-white',
          error ? 'border-red-500 bg-red-50/20' : 'border-divider',
        ].join(' ')}
      />
      {/* Floating Pop-up error notification badge */}
      {error ? (
        <View
          style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}
          pointerEvents="none"
        >
          <View className="mt-1 self-start rounded-md border border-red-200 bg-red-50 px-2.5 py-1 shadow-sm">
            <Text className="text-xs font-medium text-red-700">{error}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
