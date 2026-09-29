import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/components/avatar';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetOption } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { daysBetween, formatShort, today } from '@/domain/dates';
import { lookupBarcode } from '@/services/barcode';
import { draftsFromReceipt, readReceipt, ReceiptReadError, ReceiptServiceUnavailable } from '@/services/receipt';
import { draftFromName, useItems } from '@/store/pantry';
import { addEntry, clearSession, entryKey, getSession, startSession, useScanSession } from '@/store/scan-session';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';

type Mode = 'receipt' | 'barcode';
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function ScanScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const { colors, scheme } = useTheme();
  // The viewfinder stays dark in both themes (scan_groceries vs scan_groceries_dark_mode).
  const viewfinder =
    scheme === 'dark'
      ? { base: '#0e1210', ink: '#F2F0EA', accent: colors.primary }
      : { base: colors['inverse-surface'], ink: colors['inverse-on-surface'], accent: colors['primary-fixed'] };
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const session = useScanSession();
  const items = useItems();

  const [mode, setMode] = useState<Mode>(params.mode ?? 'barcode');
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();
  const [receiptSheet, setReceiptSheet] = useState<'signed-out' | 'not-configured' | undefined>();
  const [historySheet, setHistorySheet] = useState(false);
  const seen = useRef(new Set<string>());

  const detected = session.source === 'barcode' ? session.entries : [];

  const onBarcode = async ({ data }: BarcodeScanningResult) => {
    if (busy || seen.current.has(data)) return;
    seen.current.add(data);
    if (getSession().source !== 'barcode') startSession({ source: 'barcode' });
    setBusy(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const draft = await lookupBarcode(data);
      addEntry(
        draft
          ? { key: entryKey(), draft, selected: true }
          : { key: entryKey(), draft: draftFromName('Unknown item', { barcode: data, source: 'barcode' }), selected: true, unknown: true }
      );
      setNotice(draft ? undefined : `Code ${data} isn't in the product database — you can name it on review.`);
    } catch {
      seen.current.delete(data);
      setNotice('Could not reach the product database. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const captureReceipt = async (fromGallery: boolean) => {
    setBusy(true);
    setNotice(undefined);
    try {
      let image: { uri: string; base64?: string } | undefined;
      if (fromGallery) {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
        if (!result.canceled) image = { uri: result.assets[0].uri, base64: result.assets[0].base64 ?? undefined };
      } else {
        const photo = await camera.current?.takePictureAsync({ base64: true, quality: 0.6 });
        if (photo) image = { uri: photo.uri, base64: photo.base64 };
      }
      if (!image) return;
      const receipt = await readReceipt(image);
      startSession({
        source: 'receipt',
        store: receipt.store ?? undefined,
        date: receipt.date ?? undefined,
        entries: draftsFromReceipt(receipt).map(({ draft, excluded }) => ({ key: entryKey(), draft, selected: !excluded, excluded })),
      });
      router.replace('/scan-review');
    } catch (error) {
      if (error instanceof ReceiptServiceUnavailable) setReceiptSheet(error.reason);
      else if (error instanceof ReceiptReadError) setNotice(error.message);
      else setNotice('That receipt was hard to read. Try again in brighter light, or scan barcodes instead.');
    } finally {
      setBusy(false);
    }
  };

  const shutter = () => {
    if (mode === 'receipt') return captureReceipt(false);
    if (detected.length > 0) router.replace('/scan-review');
    else setNotice('Point the camera at a barcode — items are picked up automatically.');
  };

  const close = () => {
    if (session.entries.length === 0) clearSession();
    router.back();
  };

  // Recent scans for History + the "last receipt" tray card.
  const scanned = useMemo(
    () => items.filter((item) => item.source !== 'manual').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items]
  );
  const lastBatchDay = scanned[0]?.createdAt.slice(0, 10);
  const lastBatch = scanned.filter((item) => item.createdAt.slice(0, 10) === lastBatchDay);
  const expiringNextWeek = lastBatch.filter((item) => item.status === 'active' && daysBetween(today(), item.expiresOn) <= 7).length;

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-surface/85 dark:bg-surface/90" style={[{ paddingTop: insets.top }, shadow('header')]}>
        <View className="h-16 px-space-md flex-row items-center justify-between">
          <View className="flex-row items-center gap-space-sm">
            <Pressable accessibilityLabel="Close scanner" onPress={close} className="w-11 h-11 -ml-2 rounded-full items-center justify-center">
              <Icon name="arrow_back_ios_new" className="text-[22px] text-on-surface" />
            </Pressable>
            <Logo size={32} />
            <Text className="font-headline-md text-headline-md text-on-surface">Scan</Text>
          </View>
          <Pressable accessibilityLabel="Profile" onPress={() => router.navigate('/profile')}>
            <Avatar size={36} />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-4" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Viewfinder */}
        <View className="relative w-full rounded-3xl overflow-hidden bg-inverse-surface dark:bg-[#0e1210] dark:border dark:border-[#2E3733] items-center min-h-[580px]" style={{ boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)' }}>
          {permission?.granted && (
            <CameraView
              ref={camera}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={mode === 'barcode' ? onBarcode : undefined}
            />
          )}
          <LinearGradient
            colors={[`${viewfinder.base}cc`, 'transparent', `${viewfinder.base}e6`]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}
          />
          <View className="absolute inset-0 items-center justify-center opacity-10" style={{ pointerEvents: 'none' }}>
            <Svg width={288} height={288} viewBox="0 0 200 200">
              <Circle cx={100} cy={100} r={90} fill="none" stroke={viewfinder.ink} strokeDasharray="6,6" strokeWidth={1.5} />
              <Circle cx={100} cy={100} r={60} fill="none" stroke={viewfinder.ink} strokeWidth={2} />
              <Circle cx={100} cy={100} r={30} fill="none" stroke={viewfinder.ink} strokeWidth={1.5} />
            </Svg>
          </View>

          {/* Top bar controls */}
          <View className="relative z-20 w-full px-4 pt-4 flex-row items-center justify-between">
            <GlassButton icon={torch ? 'flash_on' : 'flash_off'} label="Toggle flash" onPress={() => setTorch(!torch)} />
            <View className="flex-row items-center bg-surface-variant/25 p-1 rounded-full">
              <ModeButton icon="receipt_long" label="Receipt" active={mode === 'receipt'} onPress={() => setMode('receipt')} />
              <ModeButton icon="barcode_scanner" label="Barcode" active={mode === 'barcode'} onPress={() => setMode('barcode')} />
            </View>
            <GlassButton icon="photo_library" label="Import receipt photo" onPress={() => captureReceipt(true)} />
          </View>

          {/* Scanning target frame */}
          <View className="relative z-10 flex-1 w-full items-center justify-center px-6 py-4">
            <View className="mb-4 flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-variant/30 max-w-[85%]">
              <View className="w-2 h-2 rounded-full bg-primary-fixed dark:bg-primary" />
              <Text numberOfLines={1} className="font-label-sm text-label-sm text-inverse-on-surface dark:text-[#F2F0EA]">
                {mode === 'receipt' ? 'Align receipt edges within the frame' : 'Center the barcode inside the frame'}
              </Text>
            </View>
            <View className="relative w-full max-w-[270px] h-[310px] rounded-3xl overflow-hidden justify-between p-3 bg-surface/5">
              <View className="absolute top-2 left-2 w-5 h-5 rounded-tl-xl bg-primary-fixed/80 dark:bg-primary/80" />
              <View className="absolute top-2 right-2 w-5 h-5 rounded-tr-xl bg-primary-fixed/80 dark:bg-primary/80" />
              <View className="absolute bottom-2 left-2 w-5 h-5 rounded-bl-xl bg-primary-fixed/80 dark:bg-primary/80" />
              <View className="absolute bottom-2 right-2 w-5 h-5 rounded-br-xl bg-primary-fixed/80 dark:bg-primary/80" />
              <LinearGradient
                colors={['transparent', viewfinder.accent, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', left: 4, right: 4, top: '45%', height: 2, boxShadow: `0px 0px 12px ${viewfinder.accent}` }}
              />
              <View className="relative z-10 flex-col gap-2 pt-6">
                {detected.slice(0, 3).map((entry, index) => (
                  <View
                    key={entry.key}
                    className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-lowest/90 ${index % 2 ? 'self-end' : 'self-start'}`}
                    style={[shadow('card'), { transform: [{ rotate: index % 2 ? '1deg' : '-1deg' }] }]}>
                    <Icon name={entry.unknown ? 'help' : 'check_circle'} className={`text-[14px] ${entry.unknown ? 'text-secondary' : 'text-primary'}`} />
                    <Text numberOfLines={1} className="font-label-sm text-label-sm font-semibold text-on-surface max-w-[180px]">
                      {entry.draft.name} • {formatShort(entry.draft.expiresOn)}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="relative z-10 self-center mb-1">
                <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-inverse-surface/90 dark:bg-[#0e1210]/90" style={shadow('card')}>
                  {busy ? <ActivityIndicator size="small" color={viewfinder.accent} /> : <Icon name="document_scanner" className="text-[18px] text-primary-fixed dark:text-primary" />}
                  <Text className="font-label-md text-label-md font-medium text-white">
                    {busy ? 'Looking it up…' : mode === 'receipt' ? 'Auto-detecting grocery items & dates' : 'Scanning for barcodes'}
                  </Text>
                </View>
              </View>
            </View>
            {detected.length > 0 && (
              <View className="mt-4 flex-row items-center gap-2 px-3 py-1 rounded-full bg-primary-container" style={shadow('card')}>
                <Icon name="magic_button" className="text-[16px] text-on-primary-container" />
                <Text className="font-label-sm text-label-sm tracking-wide text-on-primary-container">
                  {detected.length} {detected.length === 1 ? 'item' : 'items'} detected — tap the shutter to review
                </Text>
              </View>
            )}
            {notice && (
              <View className="mt-3 px-3 py-1.5 rounded-xl bg-inverse-surface/90 dark:bg-[#0e1210]/90 max-w-[90%]">
                <Text className="font-label-sm text-label-sm text-inverse-on-surface dark:text-[#F2F0EA] text-center">{notice}</Text>
              </View>
            )}
          </View>

          {/* Bottom shutter & controls */}
          <View className="relative z-20 w-full px-6 pb-6 pt-2 items-center gap-4">
            <View className="flex-row items-center justify-between w-full max-w-[280px]">
              <RoundAccessory icon="history" label="History" onPress={() => setHistorySheet(true)} />
              <Pressable accessibilityLabel={mode === 'receipt' ? 'Take photo' : 'Review scanned items'} onPress={shutter} disabled={busy} className="items-center justify-center active:scale-95">
                <View className="w-[72px] h-[72px] rounded-full bg-surface-container-lowest/30 p-1.5 items-center justify-center" style={shadow('card')}>
                  <View className="w-full h-full rounded-full bg-primary items-center justify-center">
                    <Icon name={mode === 'receipt' ? 'camera' : detected.length > 0 ? 'done_all' : 'camera'} className="text-[30px] text-on-primary" />
                  </View>
                </View>
              </Pressable>
              <RoundAccessory
                icon="library_add"
                label="Review"
                badge={detected.length || undefined}
                onPress={() => (detected.length > 0 ? router.replace('/scan-review') : setNotice('Scan a few barcodes first, then review them together.'))}
              />
            </View>
            <Pressable onPress={() => router.replace('/add-item')} className="flex-row items-center gap-1.5 px-4 py-2 rounded-full active:bg-surface-variant/20">
              <Icon name="edit_note" className="text-[18px] text-inverse-on-surface dark:text-[#F2F0EA]" />
              <Text className="font-label-md text-label-md text-inverse-on-surface dark:text-[#F2F0EA]">Can’t scan? Enter item manually</Text>
            </Pressable>
          </View>

          {permission && !permission.granted && (
            <View className="absolute inset-0 z-30 items-center justify-center px-8 gap-3 bg-inverse-surface dark:bg-[#0e1210]">
              <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-1">
                <Icon name="photo_camera" className="text-[32px] text-primary-fixed dark:text-primary" />
              </View>
              <Text className="font-headline-sm text-headline-sm text-inverse-on-surface dark:text-[#F2F0EA] text-center">Point, scan, done</Text>
              <Text className="font-body-md text-body-md text-inverse-on-surface dark:text-[#F2F0EA] text-center opacity-80">
                Expiry Radar uses your camera to read barcodes and receipts. Nothing is recorded or uploaded without you.
              </Text>
              <Pressable onPress={requestPermission} className="mt-2 px-6 h-12 rounded-full bg-primary items-center justify-center active:scale-95">
                <Text className="font-label-lg text-label-lg text-on-primary">Allow Camera</Text>
              </Pressable>
              <Pressable onPress={() => router.replace('/add-item')} className="px-4 py-2">
                <Text className="font-label-md text-label-md text-inverse-on-surface dark:text-[#F2F0EA]">Enter items manually instead</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Recent discoveries tray */}
        {lastBatch.length > 0 && (
          <Pressable onPress={() => router.dismissTo('/inventory')} className="mt-4 p-4 rounded-2xl bg-surface-container-low dark:bg-surface-container flex-row items-center justify-between" style={shadow('sm')}>
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-xl bg-secondary-fixed dark:bg-[#3B2312] items-center justify-center">
                <Icon name="shopping_bag" className="text-[22px] text-on-secondary-container dark:text-secondary" />
              </View>
              <View className="flex-col flex-1">
                <Text className="font-label-md text-label-md text-on-surface font-semibold">
                  Last scan · {formatShort(lastBatchDay!)}
                </Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">
                  Added {lastBatch.length} {lastBatch.length === 1 ? 'grocery' : 'groceries'} • {expiringNextWeek} expiring next week
                </Text>
              </View>
            </View>
            <Icon name="chevron_right" className="text-[22px] text-on-surface-variant" />
          </Pressable>
        )}
      </ScrollView>

      <Sheet
        visible={!!receiptSheet}
        onClose={() => setReceiptSheet(undefined)}
        title={receiptSheet === 'signed-out' ? 'Sign in to read receipts' : 'Receipt reading is almost here'}
        subtitle={
          receiptSheet === 'signed-out'
            ? 'Receipts are read by our AI service, which needs a free account. Your pantry stays on this device either way.'
            : 'Reading receipts uses our AI service, which isn’t connected in this build yet.'
        }>
        {receiptSheet === 'signed-out' && (
          <SheetOption icon="login" label="Log in or create an account" detail="Takes less than a minute" onPress={() => { setReceiptSheet(undefined); router.push('/auth/login'); }} />
        )}
        <SheetOption icon="barcode_scanner" label="Scan barcodes instead" detail="Works right now, item by item" onPress={() => { setReceiptSheet(undefined); setMode('barcode'); }} />
        <SheetOption icon="edit_note" label="Add items manually" detail="Smart defaults fill in the dates" onPress={() => { setReceiptSheet(undefined); router.replace('/add-item'); }} />
      </Sheet>

      <Sheet visible={historySheet} onClose={() => setHistorySheet(false)} title="Recent scans" subtitle={scanned.length === 0 ? 'Nothing scanned yet.' : undefined}>
        {scanned.slice(0, 6).map((item) => (
          <SheetOption
            key={item.id}
            icon={item.source === 'receipt' ? 'receipt_long' : 'barcode_scanner'}
            label={item.name}
            detail={`Scanned ${formatShort(item.createdAt.slice(0, 10))} • ${item.status === 'active' ? `expires ${formatShort(item.expiresOn)}` : item.status}`}
            onPress={() => { setHistorySheet(false); router.replace(`/item/${item.id}`); }}
          />
        ))}
      </Sheet>
    </View>
  );
}

function GlassButton({ icon, label, onPress }: { icon: 'flash_on' | 'flash_off' | 'photo_library'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} className="w-11 h-11 rounded-full bg-surface-variant/20 items-center justify-center active:scale-95">
      <Icon name={icon} className="text-[22px] text-inverse-on-surface dark:text-[#F2F0EA]" />
    </Pressable>
  );
}

function ModeButton({ icon, label, active, onPress }: { icon: 'receipt_long' | 'barcode_scanner'; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${active ? 'bg-primary' : ''}`}>
      <Icon name={icon} className={`text-[16px] ${active ? 'text-on-primary' : 'text-inverse-on-surface dark:text-[#F2F0EA]'}`} />
      <Text className={`font-label-md text-label-md ${active ? 'text-on-primary' : 'text-inverse-on-surface dark:text-[#F2F0EA]'}`}>{label}</Text>
    </Pressable>
  );
}

function RoundAccessory({ icon, label, onPress, badge }: { icon: 'history' | 'library_add'; label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable onPress={onPress} className="w-12 h-12 rounded-full bg-surface-variant/20 items-center justify-center active:scale-95">
      <Icon name={icon} className="text-[20px] text-inverse-on-surface dark:text-[#F2F0EA]" />
      <Text className="font-label-sm text-[10px] leading-tight text-inverse-on-surface dark:text-[#F2F0EA] opacity-80">{label}</Text>
      {badge !== undefined && (
        <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary-fixed dark:bg-primary items-center justify-center">
          <Text className="text-[11px] font-bold text-on-primary-fixed dark:text-on-primary">{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}
