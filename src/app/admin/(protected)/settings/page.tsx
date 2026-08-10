import { getTranslations } from "next-intl/server";

import { AdminUsersTable } from "@/components/admin/settings/admin-users-table";
import { AnnouncementSettingsForm } from "@/components/admin/settings/announcement-settings-form";
import { ContactSettingsForm } from "@/components/admin/settings/contact-settings-form";
import { HeroSettingsForm } from "@/components/admin/settings/hero-settings-form";
import { ShippingRatesForm } from "@/components/admin/settings/shipping-rates-form";
import { SocialWallSettingsForm } from "@/components/admin/settings/social-wall-settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminUser } from "@/lib/auth/get-admin-user";
import {
  getAdminShippingRates,
  getAdminStoreSettings,
  getAdminUsers,
} from "@/lib/data/admin-settings";

export default async function AdminSettingsPage() {
  const [admin, settings, rates, users, tSq, tEn] = await Promise.all([
    getAdminUser(),
    getAdminStoreSettings(),
    getAdminShippingRates(),
    getAdminUsers(),
    getTranslations({ locale: "sq", namespace: "home.hero" }),
    getTranslations({ locale: "en", namespace: "home.hero" }),
  ]);

  // The exact message-file fallbacks the real Hero component uses when a
  // field is left blank — passed down so the live preview can show the
  // genuine fallback, not a guess at what it might say.
  const heroDefaults = {
    sq: { title: tSq("title"), subtitle: tSq("subtitle"), ctaPrimary: tSq("ctaPrimary"), ctaSecondary: tSq("ctaSecondary") },
    en: { title: tEn("title"), subtitle: tEn("subtitle"), ctaPrimary: tEn("ctaPrimary"), ctaSecondary: tEn("ctaSecondary") },
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 font-display text-fg-primary">Settings</h1>

      {/* Five sections in one long scroll made everything hard to find —
          tabs, same convention as the product/category forms. */}
      <Tabs defaultValue="hero">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-6">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="social">Social wall</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="announcement">Announcement</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="admins">Admin users</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="pt-4">
          <HeroSettingsForm settings={settings} heroDefaults={heroDefaults} />
        </TabsContent>

        <TabsContent value="social" className="pt-4">
          <SocialWallSettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="shipping" className="pt-4">
          <ShippingRatesForm rates={rates} />
        </TabsContent>

        <TabsContent value="announcement" className="pt-4">
          <AnnouncementSettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="contact" className="pt-4">
          <ContactSettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="admins" className="pt-4">
          <AdminUsersTable
            users={users}
            currentAdminId={admin?.id ?? ""}
            isOwner={admin?.role === "owner"}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
