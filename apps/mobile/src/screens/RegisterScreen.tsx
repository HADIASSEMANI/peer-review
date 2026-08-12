import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Role, registerSchema, type RegisterInput } from '@repo/types';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { AppShell } from '../components/AppShell';
import { GradientButton } from '../components/GradientButton';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useRegister } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const ORGANIZATIONS = [
  { label: 'Concordia University', value: 'org1' },
  { label: 'McGill University', value: 'org2' },
  { label: 'Université de Montréal', value: 'org3' },
  { label: 'Université du Québec à Montréal', value: 'org4' },
  { label: 'École de technologie supérieure', value: 'org5' },
  { label: 'Polytechnique Montréal', value: 'org6' },
];

export function RegisterScreen({ navigation }: Props) {
  const register = useRegister();
  const [organizationId, setOrganizationId] = useState<string>('org1');
  const [orgError, setOrgError] = useState<string>('');

  const { control, handleSubmit, watch, setValue } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: 'Password123',
      firstName: '',
      lastName: '',
      studentId: '',
      role: Role.STUDENT,
    },
  });

  const role = watch('role');

  const onSubmit = handleSubmit(({ confirmPassword: _ignored, ...payload }) => {
    if (!organizationId) {
      setOrgError('Please select an organization');
      return;
    }
    setOrgError('');
    register.mutate({ ...payload, studentId: payload.studentId || undefined });
  });

  return (
    <AppShell>
      <View className="mx-auto w-full max-w-[540px] gap-6 py-6">
        <View className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-10">
          <View className="mb-6 gap-1 border-b border-slate-100 pb-4">
            <Text className="text-2xl font-extrabold text-ink-900">Create your Account</Text>
            <Text className="text-sm font-medium text-slate-500">
              Complete the information below to get started with Peer Assessment
            </Text>
          </View>

          <View className="gap-6">
            {/* Role Select Dropdown (Full Width Top) */}
            <SelectField
              label="Role"
              placeholder="Select a Role"
              value={role}
              onValueChange={(val) => setValue('role', val as Role)}
              options={[
                { label: 'student', value: Role.STUDENT },
                { label: 'instructor', value: Role.INSTRUCTOR },
              ]}
              required
            />

            {/* Perfectly Balanced Two-Column Grid */}
            <View className="flex-col sm:flex-row gap-6">
              {/* Left Column: Personal & Academic Details (3 Fields) */}
              <View className="flex-1 gap-4">
                <SelectField
                  label={
                    role === Role.INSTRUCTOR
                      ? 'Choose your organizations'
                      : 'Choose your organization'
                  }
                  placeholder="Select Organization"
                  value={organizationId}
                  onValueChange={(val) => {
                    setOrganizationId(val);
                    setOrgError('');
                  }}
                  options={ORGANIZATIONS}
                  error={orgError}
                />
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Enter your first name:"
                      placeholder="First Name"
                      value={field.value}
                      onChangeText={field.onChange}
                      autoCapitalize="words"
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Enter your last name:"
                      placeholder="Last Name"
                      value={field.value}
                      onChangeText={field.onChange}
                      autoCapitalize="words"
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>

              {/* Right Column: Credentials & Organization (3 Fields) */}
              <View className="flex-1 gap-4">
                {role === Role.STUDENT ? (
                  <Controller
                    control={control}
                    name="studentId"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Enter your student ID:"
                        placeholder="Student ID"
                        value={field.value ?? ''}
                        onChangeText={field.onChange}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                ) : (
                  <TextField
                    label="Enter your student ID:"
                    placeholder="Student ID"
                    value=""
                    onChangeText={() => {}}
                    editable={false}
                    className="opacity-0 pointer-events-none"
                  />
                )}

                <Controller
                  control={control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Enter your email address:"
                      placeholder="Email Address"
                      value={field.value}
                      onChangeText={field.onChange}
                      keyboardType="email-address"
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Password"
                      placeholder="Password"
                      value={field.value}
                      onChangeText={(val) => {
                        field.onChange(val);
                        setValue('confirmPassword', val);
                      }}
                      secureTextEntry
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
            </View>

            {/* Bottom Actions Spanning Both Columns */}
            <View className="gap-4 border-t border-slate-100 pt-4">
              {register.isError ? (
                <Text className="text-sm font-semibold text-blue-600">
                  {(register.error as Error).message}
                </Text>
              ) : null}

              <GradientButton
                label="Create Account"
                tone="green"
                onPress={onSubmit}
                loading={register.isPending}
                height={52}
              />

              <View className="my-1 h-px w-full bg-slate-200" />

              <GradientButton
                label="Return to Login"
                tone="blue"
                leftSection={<Text className="text-xl font-bold text-white">←</Text>}
                onPress={() => navigation.navigate('Login')}
                height={48}
              />
            </View>
          </View>
        </View>
      </View>
    </AppShell>
  );
}
