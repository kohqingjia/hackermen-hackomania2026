"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOnboarding } from "@/lib/api";

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    getOnboarding()
      .then((result) => {
        const userId = String(result.user_id ?? result.UserID ?? "").trim();
        const householdId = String(result.household_id ?? result.HouseholdID ?? "").trim();
        const postalCode = String(result.postal_code ?? result.PostalCode ?? result.Postal_Code ?? "").trim();

        if (householdId) {
          localStorage.setItem("blockbattles_household_id", householdId);
        }
        if (postalCode) {
          localStorage.setItem("blockbattles_postal_code", postalCode);
        }

        if (userId) {
          localStorage.setItem("blockbattles_user_id", userId);
          router.replace("/dashboard");
        } else {
          localStorage.removeItem("blockbattles_user_id");
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        localStorage.removeItem("blockbattles_user_id");
        router.replace("/onboarding");
      });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-sp-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
