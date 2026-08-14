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
    <View className={`w-full gap-2 ${error ? 'z-30' : ''}`}>
      <Text className="text-base text-ink">
        {label}
        {required ? <Text className="text-amber-600"> *</Text> : null}
      </Text>
      <View
        className={[
          'field-shell w-full rounded-lg border bg-white px-3 h-12 justify-center',
          error ? 'border-slate-400' : 'border-divider',
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
      {/* Floated, not reserved. `position: absolute` takes the message out of
          flow so an error cannot change the field's height or push the form
          around; it hovers just below the input instead. */}
      {error ? (
        <View
          style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20 }}
          pointerEvents="none"
        >
          <View className="mt-1 self-start rounded-md border border-amber-200 bg-amber-50 px-2 py-1 shadow-sm">
            <Text className="text-sm text-amber-700">{error}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
