import { Text, View } from 'react-native';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  testID?: string;
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  error,
  required = false,
  testID,
}: SelectFieldProps) {
  return (
    <View className="w-full gap-2">
      <Text className="text-sm font-semibold text-ink">
        {label}
        {required ? <Text className="text-blue-600"> *</Text> : null}
      </Text>
      <View
        className={[
          'w-full rounded-lg border bg-white px-3 h-12 justify-center',
          error ? 'border-blue-500' : 'border-divider',
        ].join(' ')}
      >
        <select
          test-id={testID}
          aria-label={label}
          value={value || ''}
          onChange={(e) => onValueChange(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            color: value ? '#0f172a' : '#9ca3af',
            cursor: 'pointer',
          }}
        >
          <option value="" disabled style={{ color: '#9ca3af' }}>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: '#0f172a' }}>
              {opt.label}
            </option>
          ))}
        </select>
      </View>
      {error ? <Text className="text-xs text-blue-600">{error}</Text> : null}
    </View>
  );
}
