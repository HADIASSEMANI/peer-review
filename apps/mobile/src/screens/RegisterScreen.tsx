import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Role, registerSchema, type RegisterInput } from '@repo/types';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { AppShell } from '../components/AppShell';
import { AuthBranding } from '../components/AuthBranding';
import { GradientButton } from '../components/GradientButton';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useRegister } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';
import { ButtonGroup } from '../components/ButtonGroup';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const ORGANIZATIONS = [
  { label: 'Concordia University', value: 'org1' },
  { label: 'McGill University', value: 'org2' },
  { label: 'Université de Montréal', value: 'org3' },
  { label: 'Université du Québec à Montréal', value: 'org4' },
  { label: 'École de technologie supérieure', value: 'org5' },
  { label: 'Polytechnique Montréal', value: 'org6' },
];

/**
 * Six fields would make this card twice the height of the login card, so they
 * are split across three steps of two. The step body is a fixed height, which
 * is what actually keeps the card from resizing between steps — without it the
 * shortest step would collapse and the card would jump as you advance.
 */
const STEPS = [
  { title: 'Role and school', hint: 'Who are you signing up as?' },
  { title: 'Your name', hint: 'How you appear to teammates' },
  { title: 'Your details', hint: 'How we identify you' },
  { title: 'Password', hint: 'Used to sign in from now on' },
] as const;

/** Fields validated before each step is allowed to advance. */
const STEP_FIELDS: Array<Array<keyof RegisterInput>> = [
  [],
  ['firstName', 'lastName'],
  ['studentId', 'email'],
  ['password'],
];

export function RegisterScreen({ navigation }: Props) {
  const register = useRegister();
  const { isWide } = useBreakpoint();
  const [step, setStep] = useState(0);
  const [organizationId, setOrganizationId] = useState<string>('org1');
  const [orgError, setOrgError] = useState<string>('');

  const { control, handleSubmit, watch, setValue, trigger, clearErrors } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
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
  const isLast = step === STEPS.length - 1;

  /** Errors belong to the step that produced them; moving clears them. */
  const resetStepErrors = () => {
    clearErrors();
    setOrgError('');
  };

  const goNext = async () => {
    if (step === 0 && !organizationId) {
      setOrgError('Please select an organization');
      return;
    }
    // Only block on the current step's fields; later ones are still empty.
    const ok = await trigger(STEP_FIELDS[step] ?? []);
    if (ok) {
      resetStepErrors();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const goBack = () => {
    if (step === 0) {
      navigation.navigate('Login');
      return;
    }
    resetStepErrors();
    setStep((s) => Math.max(s - 1, 0));
  };

  /** Enter advances the step, or submits on the last one. */
  const onFieldSubmit = () => {
    if (isLast) onSubmit();
    else void goNext();
  };

  const onSubmit = handleSubmit(({ confirmPassword: _ignored, ...payload }) => {
    if (!organizationId) {
      setOrgError('Please select an organization');
      setStep(0);
      return;
    }
    setOrgError('');
    register.mutate({
      ...payload,
      organizationId,
      studentId: payload.studentId || undefined,
    });
  });

  return (
    <AppShell showHeader={false}>
      <View
        className={`flex-1 items-center justify-center gap-6 py-4 z-0 ${
          isWide ? 'flex-row gap-12' : 'flex-col'
        }`}
      >
        <AuthBranding />

        {/* Form Card — same box as Login's */}
        <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card sm:p-8 gap-2">
          <View className="mb-4 gap-1 border-b border-[#d3d3d3] pb-3">
            <Text className="text-2xl text-ink-900">Create your Account</Text>
            <Text className="text-sm text-slate-500">
              Step {step + 1} of {STEPS.length} · {STEPS[step]?.hint}
            </Text>
          </View>

          {/* Progress bar — one segment per step, filled up to the current one */}
          <View className="mb-4 flex-row gap-1.5">
            {STEPS.map((s, i) => (
              <Pressable
                key={s.title}
                accessibilityRole="button"
                accessibilityLabel={`Step ${i + 1}: ${s.title}`}
                // Backwards only: jumping ahead would skip validation.
                disabled={i > step}
                onPress={() => {
                  resetStepErrors();
                  setStep(i);
                }}
                className={[
                  'h-1.5 flex-1 rounded-full',
                  i <= step ? 'accent-fill' : 'progress-track bg-slate-200',
                ].join(' ')}
              />
            ))}
          </View>

          {/* Fixed height so the card does not resize between steps and matches Login card */}
          <View className="relative z-50 min-h-[232px] justify-start gap-y-4">
            {step === 0 ? (
              <View className="py-3 gap-5">
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
              </View>
            ) : null}

            {step === 1 ? (
              <>
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
                      onSubmitEditing={onFieldSubmit}
                      required
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
                      onSubmitEditing={onFieldSubmit}
                      required
                    />
                  )}
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                {role === Role.STUDENT ? (
                  <Controller
                    control={control}
                    name="studentId"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Enter your student ID:"
                        placeholder="Student ID"
                        value={field.value ?? ''}
                        onChangeText={(val) => {
                          // Strip non-digit characters on input
                          field.onChange(val.replace(/\D/g, ''));
                        }}
                        keyboardType="numeric"
                        error={fieldState.error?.message}
                        onSubmitEditing={onFieldSubmit}
                      />
                    )}
                  />
                ) : null}
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
                      onSubmitEditing={onFieldSubmit}
                      required
                    />
                  )}
                />
              </>
            ) : null}

            {step === 3 ? (
              <>
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
                        // Confirmation is mirrored, so the schema's refine passes.
                        setValue('confirmPassword', val);
                      }}
                      secureTextEntry
                      error={fieldState.error?.message}
                      onSubmitEditing={onFieldSubmit}
                      required
                    />
                  )}
                />
              </>
            ) : null}
          </View>

          <View className="gap-2.5 border-t border-[#d3d3d3] z-0 mt-4 pt-4">
            {register.isError ? (
              <View className="rounded-lg border border-red-200 bg-red-50 p-2.5">
                <Text className="text-xs font-medium text-red-700">
                  {(register.error as Error).message}
                </Text>
              </View>
            ) : null}

            <View className="pt-2 z-0">
              <ButtonGroup
                items={[
                  {
                    label: step === 0 ? 'Back to sign in' : 'Back',
                    loading: register.isPending,
                    onPress: isLast ? onSubmit : goBack,
                  },
                  {
                    label: isLast ? 'Create Account' : 'Next',
                    primary: true,
                    onPress: () => {
                      isLast ? onSubmit() : goNext();
                      if (!isLast) clearErrors();
                    },
                  },
                ]}
                height={56}
              />
            </View>
          </View>
        </View>
      </View>
    </AppShell>
  );
}
