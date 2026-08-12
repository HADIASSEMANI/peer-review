import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loginSchema, type LoginInput } from '@repo/types';
import { Controller, useForm } from 'react-hook-form';
import { Image, Pressable, Text, View } from 'react-native';
import { AppShell } from '../components/AppShell';
import { GradientButton } from '../components/GradientButton';
import { TextField } from '../components/TextField';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLogin } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const login = useLogin();
  const { isWide } = useBreakpoint();

  const { control, handleSubmit, setValue } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

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
        {/* Left / Top branding section */}
        <View
          className={`items-center justify-center gap-6 p-4 ${
            isWide ? 'max-w-sm' : 'w-full max-w-md'
          }`}
        >
          <Image
            source={{ uri: '/team-logo.svg' }}
            accessibilityLabel="Team logo"
            style={{ width: isWide ? 335 : 240, height: isWide ? 100 : 70 }}
            resizeMode="contain"
          />
          <Text
            className={`text-center font-normal text-ink ${
              isWide ? 'text-[28px] leading-10' : 'text-xl sm:text-2xl'
            }`}
          >
            Web-based Peer Assessment{'\n'}and Team Coordination Hub
          </Text>
        </View>

        {/* Divider */}
        <View
          className={
            isWide
              ? 'h-[320px] w-px bg-[#d3d3d3]'
              : 'h-px w-full max-w-md bg-[#d3d3d3] my-2'
          }
        />

        {/* Form Card */}
        <View className="w-full max-w-md rounded-lg bg-white p-6 shadow-card sm:p-8">
          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <TextField
                  testID="login-email"
                  label="Enter your email address:"
                  placeholder="Email Address"
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="email-address"
                  error={fieldState.error?.message}
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
                  onChangeText={field.onChange}
                  secureTextEntry
                  error={fieldState.error?.message}
                  required
                />
              )}
            />

            {login.isError ? (
              <Text className="text-sm text-blue-600">{(login.error as Error).message}</Text>
            ) : null}

            <View className="pt-2">
              <GradientButton
                testID="login-submit"
                label="Login"
                tone="blue"
                onPress={onSubmit}
                loading={login.isPending}
                height={56}
              />
            </View>

            <View className="my-2 h-px w-full bg-[#d3d3d3]" />

            <GradientButton
              label="Create new account"
              tone="green"
              onPress={() => navigation.navigate('Register')}
              height={50}
            />

            <View className="gap-2 pt-2 border-t border-[#d3d3d3]">
              <Text className="text-center text-xs font-medium text-muted">
                Click a demo account below to autofill login credentials:
              </Text>
              <View className="flex-row flex-wrap items-center justify-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setValue('email', 'instructor@peerreview.dev');
                    setValue('password', 'Password123');
                  }}
                  className="rounded-full liquid-glass-pill-active px-3 py-1.5 hover:scale-105 transition-all"
                >
                  <Text className="text-xs font-bold text-[#2563eb]">
                    👨‍🏫 instructor@peerreview.dev
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setValue('email', 'student@peerreview.dev');
                    setValue('password', 'Password123');
                  }}
                  className="rounded-full liquid-glass-pill-active px-3 py-1.5 hover:scale-105 transition-all"
                >
                  <Text className="text-xs font-bold text-emerald-700">
                    🎓 student@peerreview.dev
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </AppShell>
  );
}


