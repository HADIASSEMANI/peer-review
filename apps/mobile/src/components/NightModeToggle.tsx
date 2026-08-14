import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

export function NightModeToggle() {
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('night-mode');
      const active = stored === 'true';
      setIsNightMode(active);
    }
  }, []);

  const toggle = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    if (typeof window !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('night-mode');
      } else {
        document.documentElement.classList.remove('night-mode');
      }
      localStorage.setItem('night-mode', String(next));
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Toggle Night Mode"
      onPress={toggle}
      className="h-9 w-9 items-center justify-center rounded-full bg-slate-800 shadow-lg hover:bg-slate-700 cursor-pointer"
    >
      <Text className="text-xl">{isNightMode ? '☀️' : '🌙'}</Text>
    </Pressable>
  );
}
