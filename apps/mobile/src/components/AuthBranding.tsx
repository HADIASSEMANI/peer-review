import { Image, Text, View } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';

/**
 * The branding column shared by Login and Register: the team logo (one asset
 * per theme) , the product line, and the rule that separates it from the form
 * card. Both screens rendered this verbatim, so it lives here to stop the two
 * copies drifting apart.
 *
 * `keep-bg` marks the images as exempt from the night-mode
 * `background-image: none` reset — react-native-web paints <Image> as a CSS
 * background, so without it the logos vanish in night mode.
 */
export function AuthBranding() {
  const { isWide } = useBreakpoint();
  const logoSize = { width: isWide ? 335 : 240, height: isWide ? 100 : 70 };

  return (
    <>
      <View
        className={`logo-container items-center justify-center gap-6 p-4 ${
          isWide ? 'max-w-sm' : 'w-full max-w-md'
        }`}
      >
        <Image
          source={{ uri: '/team-logo.svg' }}
          accessibilityLabel="Team logo"
          className="light-mode-only keep-bg"
          style={logoSize}
          resizeMode="contain"
        />
        <Image
          source={{ uri: '/team-logo-night-mode.svg' }}
          accessibilityLabel="Team logo (Night Mode)"
          className="night-mode-only keep-bg"
          style={logoSize}
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

      <View
        className={
          isWide ? 'h-[320px] w-px bg-[#d3d3d3]' : 'h-px w-full max-w-md bg-[#d3d3d3] my-2'
        }
      />
    </>
  );
}
