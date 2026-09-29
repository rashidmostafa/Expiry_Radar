import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';

import { BottomNav, tabs } from '@/components/bottom-nav';

export default function TabLayout() {
  return (
    <Tabs style={{ flex: 1 }}>
      {/* TabSlot's container is flexShrink: 0 by default; let it shrink so screens scroll above the nav. */}
      <TabSlot style={{ flexShrink: 1, minHeight: 0 }} />
      {/* Route config only; BottomNav renders the Stitch tab bar with its own triggers. */}
      <TabList style={{ display: 'none' }}>
        {tabs.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
        ))}
      </TabList>
      <BottomNav />
    </Tabs>
  );
}
