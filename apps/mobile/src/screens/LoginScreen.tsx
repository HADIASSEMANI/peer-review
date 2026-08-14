import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loginSchema, type LoginInput } from '@repo/types';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { AppShell } from '../components/AppShell';
import { AuthBranding } from '../components/AuthBranding';
import { ButtonGroup } from '../components/ButtonGroup';
import { TextField } from '../components/TextField';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLogin } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const login = useLogin();
  const { isWide } = useBreakpoint();

  const { control, handleSubmit, setValue, clearErrors } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const clearAllErrors = () => {
    clearErrors();
    if (login.isError) {
      login.reset();
    }
  };

  const onSubmit = handleSubmit((values) => {
    login.mutate(values);
  });

  return (
    <AppShell showHeader={false}>
      <View
        className={`flex-1 items-center justify-center gap-6 py-4 ${
          isWide ? 'flex-row gap-12' : 'flex-col'
        }`}
      >
        <AuthBranding />

        {/* Form Card */}
        <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <View className="gap-10">
            {/* Main credentials and primary actions unit */}
            <View className="gap-5">
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <TextField
                    testID="login-email"
                    label="Enter your email address:"
                    placeholder="Email Address"
                    value={field.value}
                    onChangeText={(val) => {
                      field.onChange(val);
                      clearAllErrors();
                    }}
                    keyboardType="email-address"
                    error={fieldState.error?.message}
                    onSubmitEditing={onSubmit}
                    required
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <TextField
                    testID="login-password"
                    label="Password"
                    placeholder="Password"
                    value={field.value}
                    onChangeText={(val) => {
                      field.onChange(val);
                      clearAllErrors();
                    }}
                    secureTextEntry
                    error={fieldState.error?.message}
                    onSubmitEditing={onSubmit}
                    required
                  />
                )}
              />

              {login.isError ? (
                <View className="rounded-lg border border-red-200 bg-red-50 p-2.5">
                  <Text className="text-xs font-medium text-red-700">
                    {(login.error as Error).message}
                  </Text>
                </View>
              ) : null}

              {/* Sign in and sign up share one capsule */}
              <View className="pt-2">
                <ButtonGroup
                  items={[
                    {
                      label: 'Login',
                      testID: 'login-submit',
                      primary: true,
                      loading: login.isPending,
                      onPress: onSubmit,
                    },
                    {
                      label: 'Create new account',
                      onPress: () => {
                        clearAllErrors();
                        navigation.navigate('Register');
                      },
                    },
                  ]}
                  height={56}
                />
              </View>
            </View>

            {/* Demo autofill section */}
            <View className="gap-2.5 pt-3 border-t border-[#d3d3d3]">
              <Text className="text-center text-xs font-medium text-muted">
                Click a demo account below to autofill login credentials:
              </Text>
              {/* Small and inline, so the pills sit at the same weight and
                  reading order as the hint line directly above them. */}
              <ButtonGroup
                size="sm"
                separated
                items={[
                  {
                    label: 'instructor',
                    icon: '👨‍🏫',
                    onPress: () => {
                      setValue('email', 'instructor@peerreview.dev');
                      setValue('password', 'Password123');
                      clearAllErrors();
                    },
                  },
                  {
                    label: 'student',
                    icon: '🎓',
                    onPress: () => {
                      setValue('email', 'student@peerreview.dev');
                      setValue('password', 'Password123');
                      clearAllErrors();
                    },
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </AppShell>
  );
}
