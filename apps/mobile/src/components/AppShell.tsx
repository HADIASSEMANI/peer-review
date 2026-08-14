import type { ReactNode } from 'react';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ORGANIZATIONS, orgLabel } from '../lib/orgs';
import { useLogout } from '../hooks/useAuth';
import { useAuthStore } from '../store/auth';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Role } from '@repo/types';
import { BottomNav } from './BottomNav';
import { NightModeToggle } from './NightModeToggle';

/** Institutional marks shown in the signed-out header, left to right. */
const INSTITUTION_LOGOS = [
  { uri: '/concordia-logo.svg', label: 'Concordia' },
  { uri: '/50th-anniversary.svg', label: 'Concordia 50th anniversary' },
  { uri: '/gina-cody-logo.png', label: 'Gina Cody School' },
] as const;

const ORG_REVERSE_MAP: Record<string, string> = {
  org1: 'Concordia University',
  org2: 'McGill University',
  org3: 'Université de Montréal',
  org4: 'Université du Québec à Montréal',
  org5: 'École de technologie supérieure',
  org6: 'Polytechnique Montréal',
};

function Header() {
  const user = useAuthStore((s) => s.user);
  const selectedOrg = useAuthStore((s) => s.selectedOrg);
  const setSelectedOrg = useAuthStore((s) => s.setSelectedOrg);
  const logout = useLogout();
  const signedIn = Boolean(user);
  const isInstructor = user?.role === Role.INSTRUCTOR;
  const { isTiny, isCompact } = useBreakpoint();

  return (
    <View className="z-10 min-h-[60px] w-full flex-row items-center justify-between bg-white px-4 shadow-bar sm:px-8">
      <View className="flex-row items-center gap-3 py-2">
        {/* Phones put the toggle at the top left; desktop floats it bottom
            right instead, so the header only carries it below 768px. */}
        {isCompact ? <NightModeToggle /> : null}
        {signedIn ? (
          <View className="flex-row items-center gap-3 sm:gap-4">
            {/* Instructors get a school switcher; students get the same chip
                rendered as static text, since they belong to one school and
                have nothing to switch between. Neither shows the team logo. */}
            {!isInstructor ? (
              <View className="hidden sm:flex flex-row items-center rounded-lg border border-[#d3d3d3] bg-[#f8f9fa] px-3 py-1.5 shadow-sm">
                <Text className="mr-2 text-sm">🏫</Text>
                <Text className="text-base text-ink">{orgLabel(user?.organizationId)}</Text>
              </View>
            ) : null}
            {isInstructor ? (
              <View className="hidden sm:flex flex-row items-center rounded-lg border border-[#d3d3d3] bg-[#f8f9fa] px-3 py-1.5 shadow-sm">
                <Text className="mr-2 text-sm">🏫</Text>
                <Text className="text-base text-ink font-semibold">{orgLabel(selectedOrg)}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View className="keep-bg flex-row flex-wrap items-center gap-2 sm:gap-4">
            {INSTITUTION_LOGOS.map(({ uri, label }) => (
              <Image
                key={uri}
                source={{ uri }}
                accessibilityLabel={label}
                style={{ height: isTiny ? 28 : 36, width: isTiny ? 70 : 100 }}
                resizeMode="contain"
              />
            ))}
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-3">
        {signedIn ? (
          <>
            <Text className="hidden text-sm text-muted sm:flex">{user?.email}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void logout()}
              className="ml-2 rounded-full border border-[#d3d3d3] bg-[#f8f9fa] px-4 py-1.5 transition-all liquid-glass-pill cursor-pointer"
            >
              <Text className="text-sm font-medium text-ink">Logout</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View className="w-full items-center bg-white px-4 py-3 shadow-bar sm:px-6">
      <Text className="text-center text-xs text-muted">
        SOEN 341 · Peer Assessment and Team Coordination Hub
      </Text>
    </View>
  );
}

/** Header + scrolling content + footer, matching the old page frame. */
export function AppShell({
  children,
  scroll = true,
  showHeader = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  showHeader?: boolean;
}) {
  const { isCompact } = useBreakpoint();
  const signedIn = Boolean(useAuthStore((s) => s.user));
  /* The bar is pinned over the bottom of the frame, so the scroll area needs
     matching padding or its last row sits underneath it. */
  const navPadding = isCompact && signedIn ? 'pb-24' : '';

  return (
    <View className="min-h-full flex-1 bg-white">
      {showHeader ? <Header /> : null}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`flex-grow px-3 py-4 sm:px-6 sm:py-6 ${navPadding}`}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 px-3 py-4 sm:px-6 sm:py-6 ${navPadding}`}>{children}</View>
      )}
      <Footer />
      {/* Desktop floats the toggle bottom-right, clear of the footer. Auth
          screens have no header at any width, so on a phone it floats at the
          top left to match where the header would have put it. */}
      {!isCompact ? (
        <View className="absolute bottom-16 right-5 z-30">
          <NightModeToggle />
        </View>
      ) : !showHeader ? (
        <View className="absolute left-5 top-5 z-30">
          <NightModeToggle />
        </View>
      ) : null}
      <BottomNav />
    </View>
  );
}
