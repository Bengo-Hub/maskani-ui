'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/page-header';
import { CatalogueSettings } from '@/components/settings/catalogue-settings';
import { GeneralSettings } from '@/components/settings/general-settings';
import { ModuleSettings } from '@/components/settings/module-settings';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="How Maskani runs for your estate" />
      <Tabs defaultValue="general">
        <TabsList className="scrollbar-hide w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
        </TabsList>
        <Card className="mt-4">
          <CardContent>
            <TabsContent value="general"><GeneralSettings /></TabsContent>
            <TabsContent value="modules"><ModuleSettings /></TabsContent>
            <TabsContent value="lists"><CatalogueSettings /></TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
