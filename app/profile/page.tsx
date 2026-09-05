import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { AppTabs } from "../app-tabs";
import { ProfileView } from "../profile-view";

// O233 (founder-directed): the Profile tab's route. Hidden from crawlers for the same reason `/`
// is — it is a surface of a deployment the founder has said is for testing — and it holds nothing
// a crawler could read anyway, since everything on it comes from this device's own session.
export const metadata: Metadata = {
  alternates: { canonical: "/profile" },
  robots: ROBOTS_META,
  title: "Your details",
  description: "What this device is holding for you: the words you described, the suburb you gave, and the controls over both.",
};

export default function ProfilePage() {
  return (
    <>
      <ProfileView />
      <AppTabs />
    </>
  );
}
