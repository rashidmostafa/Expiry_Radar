import { Redirect, useLocalSearchParams } from 'expo-router';

/** Invite links (expiryradar://join?code=ABC234) open the household screen with the code filled in. */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <Redirect href={{ pathname: '/household', params: code ? { code } : {} }} />;
}
