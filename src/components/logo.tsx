import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Expiry Radar app mark, from stitch_expiry_radar_app_system/expiry_radar_logo. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Rect width={120} height={120} rx={30} fill="#2D9D6F" />
      <Circle cx={60} cy={60} r={44} stroke="#FAF8F3" strokeOpacity={0.25} strokeWidth={2.5} strokeDasharray="4 4" />
      <Circle cx={60} cy={60} r={32} stroke="#FAF8F3" strokeOpacity={0.45} strokeWidth={2.5} />
      <Circle cx={60} cy={60} r={20} stroke="#FAF8F3" strokeOpacity={0.75} strokeWidth={2.5} />
      <Path d="M60 38C52 46 48 54 52 64C56 74 68 76 74 68C80 60 76 48 60 38Z" fill="#FAF8F3" />
      <Path d="M57 60C62 55 67 50 71 44" stroke="#2D9D6F" strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={60} cy={60} r={4} fill="#F4A261" />
    </Svg>
  );
}
