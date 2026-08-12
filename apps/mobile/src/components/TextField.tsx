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
}: TextFieldProps) {
  return (
    <View className={['w-full gap-2', className].filter(Boolean).join(' ')}>
      {label ? (
        <Text className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">
          {label}
          {required ? <Text className="text-blue-600"> *</Text> : null}
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
        className={[
          'rounded-xl border bg-white px-3.5 py-3 text-base text-ink placeholder:text-muted focus:border-brand-500 focus:bg-white',
          error ? 'border-blue-500' : 'border-divider',
        ].join(' ')}
      />
      {error ? <Text className="text-xs text-blue-600">{error}</Text> : null}
    </View>
  );
}
