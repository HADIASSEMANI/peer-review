import { Text, TextInput, View } from 'react-native';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'email-address';
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
    <View className={['w-full gap-2', className].filter(Boolean).join(' ')}>
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
        // Enter submits. Multiline fields keep Enter for newlines.
        onSubmitEditing={multiline ? undefined : onSubmitEditing}
        blurOnSubmit={!multiline}
        returnKeyType={multiline ? undefined : 'go'}
        className={[
          'rounded-xl border bg-white px-3.5 py-3 text-base text-ink placeholder:text-muted focus:border-brand-500 focus:bg-white',
          error ? 'border-amber-500' : 'border-divider',
        ].join(' ')}
      />
      {/* Fixed-height slot: the message appears and disappears without moving
          anything below it, which otherwise makes the whole form jump. */}
      <View className="h-5 justify-center">
        {error ? <Text className="text-sm text-amber-700">{error}</Text> : null}
      </View>
    </View>
  );
}
