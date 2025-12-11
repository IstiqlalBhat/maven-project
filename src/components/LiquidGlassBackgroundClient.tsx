'use client';

import dynamic from 'next/dynamic';

const LiquidGlassBackground = dynamic(
  () => import('@/components/LiquidGlassBackground'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-amber-50 to-amber-200" />
    ),
  }
);

type Props = {
  variant?: 'yellow' | 'amber' | 'gold' | 'sunset';
  className?: string;
};

export default function LiquidGlassBackgroundClient(props: Props) {
  return <LiquidGlassBackground {...props} />;
}




