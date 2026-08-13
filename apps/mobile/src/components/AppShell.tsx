import type { ReactNode } from 'react';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ORGANIZATIONS, orgLabel } from '../lib/orgs';
import { useLogout } from '../hooks/useAuth';
import { useAuthStore } from '../store/auth';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Role } from '@repo/types';

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
  const { isTiny } = useBreakpoint();

  return (
    <View className="z-10 min-h-[60px] w-full flex-row items-center justify-between bg-white px-4 shadow-bar sm:px-8">
      <View className="flex-row items-center py-2">
        {signedIn ? (
          <View className="flex-row items-center gap-3 sm:gap-4">
            {/* Instructors get a school switcher; students get the same chip
                rendered as static text, since they belong to one school and
                have nothing to switch between. Neither shows the team logo. */}
            {!isInstructor ? (
              <View className="flex-row items-center rounded-lg border border-[#d3d3d3] bg-[#f8f9fa] px-3 py-1.5 shadow-sm">
                <Text className="mr-2 text-sm">🏫</Text>
                <Text className="text-base text-ink">{orgLabel(user?.organizationId)}</Text>
              </View>
            ) : null}
            {isInstructor ? (
              <View className="hidden sm:flex flex-row items-center rounded-lg border border-[#d3d3d3] bg-[#f8f9fa] px-3 py-1.5 shadow-sm">
                <Text className="mr-2 text-sm">🏫</Text>
                <select
                  aria-label="Select School"
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    color: '#0f172a',
                    fontWeight: '600',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {ORGANIZATIONS.map((org) => (
                    <option key={org.value} value={org.value} style={{ color: '#0f172a' }}>
                      {org.label}
                    </option>
                  ))}
                </select>
              </View>
            ) : null}
          </View>
        ) : (
          <View className="flex-row flex-wrap items-center gap-2 sm:gap-4">
            <Image
              source={{ uri: '/concordia-logo.svg' }}
              accessibilityLabel="Concordia"
              style={{ height: isTiny ? 28 : 36, width: isTiny ? 70 : 100 }}
              resizeMode="contain"
            />
            <Image
              source={{ uri: '/50th-anniversary.svg' }}
              accessibilityLabel="Concordia 50th anniversary"
              style={{ height: isTiny ? 28 : 36, width: isTiny ? 70 : 100 }}
              resizeMode="contain"
            />
            <Image
              source={{ uri: '/gina-cody-logo.png' }}
              accessibilityLabel="Gina Cody School"
              style={{ height: isTiny ? 28 : 36, width: isTiny ? 70 : 100 }}
              resizeMode="contain"
            />
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
              className="ml-2 rounded-md border border-[#d3d3d3] bg-[#f8f9fa] px-3.5 py-1.5 hover:bg-slate-100"
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
  return (
    <View className="min-h-full flex-1 bg-white">
      {showHeader ? <Header /> : null}
      {scroll ? (
        <ScrollView className="flex-1" contentContainerClassName="flex-grow px-3 py-4 sm:px-6 sm:py-6">
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-3 py-4 sm:px-6 sm:py-6">{children}</View>
      )}
      <Footer />
    </View>
  );
}

