import type { PublicUser } from '@repo/types';
import { Text, View } from 'react-native';
import { initials } from '../lib/format';

export function Avatar({ user, size = 40 }: { user: PublicUser; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full bg-brand-100"
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-brand-700" style={{ fontSize: size * 0.36 }}>
        {initials(user)}
      </Text>
    </View>
  );
}
