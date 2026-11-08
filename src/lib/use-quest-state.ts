"use client";

import { useMemo } from "react";
import { useBukuDompetStore, type ProfileData } from "@/store/useBukuDompetStore";
import { buildMetricInputs, useFamilyStore } from "@/store/useFamilyStore";
import {
  evaluateMedals,
  getActiveQuests,
  type ActiveQuest,
  type MedalProgress,
  type MetricInputs,
  type QuestAudience,
} from "@/lib/quest-engine";
import { localDateStr } from "@/lib/dates";

export interface QuestState {
  audience: QuestAudience;
  inputs: MetricInputs;
  daily: ActiveQuest[];
  weekly: ActiveQuest[];
  medals: MedalProgress[];
  /** Misi selesai tetapi hadiahnya belum diklaim. */
  claimableCount: number;
  /** Medali tercapai tetapi hadiah tonggaknya belum diklaim. */
  claimableMedals: number;
}

export function audienceOf(profile: ProfileData): QuestAudience {
  return profile.role === "schoolchild" ? "schoolchild" : "user";
}

/** Status misi & medali reaktif untuk satu profil anak/user. */
export function useQuestState(profile: ProfileData): QuestState {
  const transactions = useBukuDompetStore((s) => s.transactions);
  const stories = useFamilyStore((s) => s.stories);
  const arcadePlays = useFamilyStore((s) => s.arcadePlays);
  const questClaims = useFamilyStore((s) => s.questClaims);
  const medalClaims = useFamilyStore((s) => s.medalClaims);

  return useMemo(() => {
    const audience = audienceOf(profile);
    const inputs = buildMetricInputs(
      profile,
      { stories, arcadePlays },
      localDateStr(),
      transactions.filter((t) => t.user_id === profile.id)
    );
    const { daily, weekly } = getActiveQuests(profile.id, audience, inputs, questClaims);
    const medals = evaluateMedals(audience, inputs);
    return {
      audience,
      inputs,
      daily,
      weekly,
      medals,
      claimableCount: [...daily, ...weekly].filter((q) => q.done && !q.claimed).length,
      claimableMedals: medals.filter(
        (m) => m.earned && !medalClaims[`${profile.id}:${m.def.id}`]
      ).length,
    };
  }, [profile, transactions, stories, arcadePlays, questClaims, medalClaims]);
}
