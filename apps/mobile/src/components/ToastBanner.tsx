import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface ToastBannerProps {
  message: string;
  onClose: () => void;
}

export function ToastBanner({ message, onClose }: ToastBannerProps) {
  const [visible, setVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setIsLeaving(false);
      const timer = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(timer);
    } else if (visible) {
      handleDismiss();
    }
  }, [message]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setVisible(false);
    const timer = setTimeout(() => {
      setIsLeaving(false);
      setDisplayMessage('');
      onClose();
    }, 300);
    return () => clearTimeout(timer);
  };

  if (!displayMessage && !visible && !isLeaving) return null;

  return (
    <View
      className={[
        'fixed top-5 right-5 z-[9999] max-w-sm flex-row items-center gap-3.5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 ease-out',
        visible && !isLeaving
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-4 scale-95 pointer-events-none',
      ].join(' ')}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
        <Text className="text-lg text-slate-600">✓</Text>
      </View>
      <View className="flex-1 pr-1">
        <Text className="text-xs uppercase tracking-wider text-slate-700">Success</Text>
        <Text className="text-sm text-slate-800 leading-snug">{displayMessage}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close notification"
        onPress={handleDismiss}
        className="h-6 w-6 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-all"
      >
        <Text className="text-sm text-slate-500">✕</Text>
      </Pressable>
    </View>
  );
}
