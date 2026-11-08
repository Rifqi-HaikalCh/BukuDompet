"use client";

/**
 * Beranda Keluarga (feed ala Threads/X):
 * - Composer teks + foto (otomatis dikompres ke WebP).
 * - Siaran otomatis (streak, pet baru/naik fase, cerita) tersimpan sebagai postingan.
 * - Siaran "belum mencatat hari ini" dihitung langsung dari data (tidak disimpan) + tombol Ingatkan.
 * - Like, komentar, dan hadiah Poin (+5/+10) pada setiap postingan.
 * Seluruh feed direset otomatis tiap 7 hari tanpa menyentuh poin, medali, cerita, atau tabungan.
 */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Gift, ImagePlus, X, Send } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore, isChildRole, type ProfileData } from "@/store/useBukuDompetStore";
import { useFamilyStore, shortName, feedCycleInfo } from "@/store/useFamilyStore";
import type { FeedPost } from "@/lib/family-types";
import { CustomizablePetAvatar, type GrowthStage } from "@/components/illustrations/PetAvatarSystem";
import { EmotionWheelIcon } from "@/components/illustrations/DetectiveAndStoryAssets";
import { CozyIcon, type IconName } from "@/components/illustrations/CozyIcons";
import { CozyCard, TactileButton } from "@/components/ui/CozyPrimitives";
import { PointTransferModal } from "@/components/ui/PointTransferModal";
import { FamilyAvatar, ROLE_LABEL } from "@/components/family/FamilyAvatar";
import { convertImageToWebp, WEBP_INDICATOR_TEXT } from "@/lib/webp-converter";
import { localDateStr, longDateLabel } from "@/lib/dates";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

/* ───────────────────────── Util ───────────────────────── */

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

const KIND_META: Record<FeedPost["kind"], { label: string; icon: IconName | null; tone: string }> = {
  user: { label: "Postingan", icon: null, tone: "" },
  streak: { label: "Streak Menyala", icon: "flame_streak", tone: "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]" },
  pet_new: { label: "Pet Baru", icon: "egg_nest", tone: "bg-[#F8F0FF] border-[#E2C6FF] text-[#8A3FC2]" },
  pet_phase: { label: "Pet Naik Fase", icon: "pet_paw", tone: "bg-[#F8F0FF] border-[#E2C6FF] text-[#8A3FC2]" },
  story: { label: "Cerita Baru", icon: "missions_scroll", tone: "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" },
  pride: { label: "Bangga", icon: "parent_heart", tone: "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]" },
  saving: { label: "Menabung", icon: "cat_saving", tone: "bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]" },
};

/* ───────────────────────── Lencana siklus 7 hari ───────────────────────── */

export function FeedResetBadge() {
  const start = useFamilyStore((s) => s.feedCycleStartDate);
  const { daysLeft } = feedCycleInfo(start);
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF8FF] border-2 border-[#BCE3FF] text-[11px] sm:text-xs font-display font-extrabold text-[#1565C0] leading-snug">
      <GlyphInline name="refresh" /> Beranda Keluarga di-reset otomatis setiap 7 hari (Sisa {daysLeft} hari)
    </div>
  );
}

/* ───────────────────────── Composer ───────────────────────── */

function Composer({ viewer }: { viewer: ProfileData }) {
  const addFeedPost = useFamilyStore((s) => s.addFeedPost);
  const [text, setText] = useState<string>("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await convertImageToWebp(file);
      setImage(res.dataUrl);
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Foto gagal diproses." });
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const res = addFeedPost({ authorId: viewer.id, text, imageDataUrl: image ?? undefined });
    setNotice({ ok: res.success, text: res.message });
    if (res.success) {
      soundEffects.coinChime();
      setText("");
      setImage(null);
    }
  };

  return (
    <CozyCard tone="white" className="p-4 space-y-3 min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <FamilyAvatar profile={viewer} size={46} />
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            value={text}
            maxLength={500}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Apa kabarmu hari ini, ${shortName(viewer.display_name)}?`}
            aria-label="Tulis postingan untuk keluarga"
            className="w-full resize-none px-3.5 py-2.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] focus:border-[#38B6FF] focus:outline-none text-sm font-bold text-[#3D352E] leading-relaxed"
          />
          {image && (
            <div className="relative inline-block max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL lokal hasil WebP, tidak perlu optimasi Next */}
              <img src={image} alt="Pratinjau foto postingan" className="max-h-52 rounded-2xl border-2 border-[#E6DFD2] object-contain" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Hapus foto"
                className="absolute -top-2 -right-2 p-1 rounded-full bg-white border-2 border-[#E6DFD2] text-[#3D352E] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-[11px] font-bold text-[#2E6F00]">{WEBP_INDICATOR_TEXT}</p>
          {notice && (
            <p role="status" className={cn("text-xs font-bold leading-snug", notice.ok ? "text-[#2E6F00]" : "text-[#C83E2B]")}>
              {notice.text}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPick} aria-label="Pilih foto" />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[2px] disabled:opacity-60 font-display text-xs font-extrabold text-[#3D352E] flex items-center gap-1.5 cursor-pointer"
              >
                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                {busy ? "Memproses..." : "Foto"}
              </button>
              <span className="text-[11px] font-bold text-[#7A6E65] tabular-nums">{text.length}/500</span>
            </div>
            <TactileButton variant="matcha" size="sm" onClick={submit} disabled={busy || (!text.trim() && !image)}>
              <Send className="w-4 h-4" aria-hidden="true" /> Kirim
            </TactileButton>
          </div>
        </div>
      </div>
    </CozyCard>
  );
}

/* ───────────────────────── Siaran "belum mencatat" ───────────────────────── */

function PendingBroadcasts({ viewer }: { viewer: ProfileData }) {
  const profiles = useBukuDompetStore((s) => s.profiles);
  const transactions = useBukuDompetStore((s) => s.transactions);
  const stories = useFamilyStore((s) => s.stories);
  const reminders = useFamilyStore((s) => s.reminders);
  const sendReminder = useFamilyStore((s) => s.sendReminder);
  const [notice, setNotice] = useState<string>("");
  const today = localDateStr();

  const pending = useMemo(
    () =>
      profiles.filter((p) => {
        if (!isChildRole(p.role) || p.id === viewer.id) return false;
        if (p.role === "schoolchild") return !stories.some((s) => s.userId === p.id && s.date === today);
        return !transactions.some((t) => t.user_id === p.id && t.type !== "saving" && t.transaction_date === today);
      }),
    [profiles, transactions, stories, viewer.id, today]
  );

  if (pending.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {pending.map((p) => {
        const already = reminders.some((r) => r.fromId === viewer.id && r.toId === p.id && r.day === today);
        const what = p.role === "schoolchild" ? "cerita" : "catatan";
        return (
          <div key={p.id} className="rounded-3xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] p-3.5 flex items-center gap-3 flex-wrap min-w-0">
            <FamilyAvatar profile={p} size={44} />
            <p className="flex-1 min-w-[10rem] text-xs sm:text-sm font-bold text-[#4A3500] leading-relaxed break-words">
              ({shortName(p.display_name)} belum membuat {what} hari ini. Jangan sampai Streak-nya padam!)
            </p>
            <button
              type="button"
              disabled={already}
              onClick={() => {
                const res = sendReminder(viewer.id, p.id);
                setNotice(res.message);
                if (res.success) soundEffects.coinChime();
                else soundEffects.tactileClick();
              }}
              className="px-3.5 py-2 rounded-2xl bg-[#FFC800] hover:bg-[#FFD22B] disabled:bg-[#EFE6C9] disabled:text-[#7A6E65] text-[#4A3500] border-b-[4px] border-b-[#E5A400] disabled:border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[2px] font-display text-xs font-extrabold cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {already ? <><GlyphInline name="check_circle" /> Sudah Diingatkan</> : <><GlyphInline name="smile" /> Ingatkan Sekarang</>}
            </button>
          </div>
        );
      })}
      {notice && (
        <p role="status" className="text-xs font-bold text-[#7A6E65] px-1">
          {notice}
        </p>
      )}
    </div>
  );
}

/** Pengingat dari anggota keluarga untuk pemilik akun (hari ini). */
function IncomingReminders({ viewer }: { viewer: ProfileData }) {
  const profiles = useBukuDompetStore((s) => s.profiles);
  const reminders = useFamilyStore((s) => s.reminders);
  const today = localDateStr();
  const mine = reminders.filter((r) => r.toId === viewer.id && r.day === today);
  if (mine.length === 0) return null;
  return (
    <div className="space-y-2">
      {mine.map((r) => {
        const from = profiles.find((p) => p.id === r.fromId);
        return (
          <div key={r.id} className="rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#8F2A1B] leading-relaxed break-words">
            <GlyphInline name="smile" /> {from ? shortName(from.display_name) : "Keluargamu"} mengingatkanmu untuk mencatat hari ini. Yuk jaga Streak-mu!
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Kartu postingan ───────────────────────── */

function PostCard({ post, viewer }: { post: FeedPost; viewer: ProfileData }) {
  const profiles = useBukuDompetStore((s) => s.profiles);
  const toggleLike = useFamilyStore((s) => s.toggleLike);
  const addComment = useFamilyStore((s) => s.addComment);
  const giftPoints = useFamilyStore((s) => s.giftPoints);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [giftOpen, setGiftOpen] = useState<boolean>(false);
  const [giftAmount, setGiftAmount] = useState<5 | 10>(5);

  const author = profiles.find((p) => p.id === post.authorId);
  if (!author) return null;
  const meta = KIND_META[post.kind];
  const liked = post.likes.includes(viewer.id);
  const isAuthor = post.authorId === viewer.id;
  const canGift = isChildRole(viewer.role) && !isAuthor;
  const giftedTotal = post.gifts.reduce((s, g) => s + g.amount, 0);

  const viewerBalance = profiles.find((p) => p.id === viewer.id)?.points_balance ?? viewer.points_balance;
  const openGift = (amount: 5 | 10) => {
    soundEffects.tactileClick();
    setGiftAmount(amount);
    setGiftOpen(true);
  };

  return (
    <article className="rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-4 space-y-3 min-w-0 overflow-hidden">
      {canGift && (
        <PointTransferModal
          open={giftOpen}
          onClose={() => setGiftOpen(false)}
          mode="gift"
          from={{ name: shortName(viewer.display_name), visual: <FamilyAvatar profile={viewer} size={64} /> }}
          to={{ name: shortName(author.display_name), visual: <FamilyAvatar profile={author} size={64} /> }}
          amount={giftAmount}
          amountOptions={[5, 10]}
          onAmountChange={(n) => setGiftAmount(n === 10 ? 10 : 5)}
          fromBalance={viewerBalance}
          execute={() => {
            const res = giftPoints(post.id, viewer.id, giftAmount);
            setNotice(res.message);
            return res;
          }}
          confirmLabel={`Kirim ${giftAmount} Poin`}
        />
      )}
      <header className="flex items-start gap-3 min-w-0">
        <FamilyAvatar profile={author} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-display text-sm font-extrabold text-[#3D352E] break-words">{shortName(author.display_name)}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-[#F7F3EB] border border-[#E6DFD2] text-[10px] font-display font-extrabold text-[#7A6E65]">{ROLE_LABEL[author.role]}</span>
            {meta.icon && (
              <span className={cn("px-2 py-0.5 rounded-lg border text-[10px] font-display font-extrabold inline-flex items-center gap-1", meta.tone)}>
                <CozyIcon name={meta.icon} size={13} /> {meta.label}
              </span>
            )}
          </div>
          <p className="text-[11px] font-bold text-[#7A6E65]">{timeAgo(post.createdAt)}</p>
        </div>
      </header>

      {post.text && <p className="text-sm font-bold text-[#3D352E] leading-relaxed break-words whitespace-pre-line">{post.text}</p>}

      {post.kind === "streak" && post.streak !== undefined && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] font-display text-sm font-extrabold text-[#4A3500] tabular-nums">
          <CozyIcon name="flame_streak" size={22} animated /> Streak ke-{post.streak}
        </div>
      )}

      {post.petPreview && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6DFD2] p-2.5 min-w-0">
          <div className="w-24 h-24 shrink-0">
            <CustomizablePetAvatar
              species={post.petPreview.species}
              stage={Math.min(8, Math.max(1, post.petPreview.stage)) as GrowthStage}
              mood="happy"
              equippedAccessories={post.petPreview.accessories}
              className="w-full h-full"
            />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-extrabold text-[#3D352E] break-words">{post.petPreview.name}</p>
            <p className="text-xs font-bold text-[#7A6E65]">Fase {post.petPreview.stage}/8</p>
          </div>
        </div>
      )}

      {post.kind === "story" && post.storyTitle && (
        <div className="flex items-center gap-2 rounded-2xl bg-[#EFFBE6] border-2 border-[#C3EFA4] p-2.5 min-w-0">
          {post.emotion && <EmotionWheelIcon emotion={post.emotion} size={32} />}
          <p className="text-xs font-display font-extrabold text-[#2E6F00] leading-snug break-words">Judul: &ldquo;{post.storyTitle}&rdquo;</p>
        </div>
      )}

      {post.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL lokal hasil WebP, tidak perlu optimasi Next
        <img src={post.imageDataUrl} alt={`Foto dari ${shortName(author.display_name)}`} loading="lazy" className="w-full max-h-96 object-contain rounded-2xl border-2 border-[#E6DFD2] bg-[#F7F3EB]" />
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          type="button"
          aria-pressed={liked}
          onClick={() => {
            soundEffects.tactileClick();
            toggleLike(post.id, viewer.id);
          }}
          className={cn(
            "px-3 py-1.5 rounded-2xl border-2 text-xs font-display font-extrabold flex items-center gap-1.5 cursor-pointer tabular-nums transition-colors",
            liked ? "bg-[#FFF2F0] border-[#FFA89C] text-[#C83E2B]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFF2F0]"
          )}
        >
          <Heart className={cn("w-4 h-4", liked && "fill-[#FF6B5B] text-[#FF6B5B]")} aria-hidden="true" /> {post.likes.length}
          <span className="sr-only">suka</span>
        </button>
        <button
          type="button"
          aria-expanded={showComments}
          onClick={() => {
            soundEffects.tactileClick();
            setShowComments((v) => !v);
          }}
          className="px-3 py-1.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] text-xs font-display font-extrabold text-[#3D352E] flex items-center gap-1.5 cursor-pointer tabular-nums hover:bg-[#EEF8FF]"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" /> {post.comments.length}
          <span className="sr-only">komentar</span>
        </button>
        {canGift && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Gift className="w-4 h-4 text-[#E5A400]" aria-hidden="true" />
            {([5, 10] as const).map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => openGift(amt)}
                aria-label={`Hadiahi ${amt} Poin`}
                className="px-2.5 py-1.5 rounded-2xl bg-[#FFC800] hover:bg-[#FFD22B] border-b-[3px] border-b-[#E5A400] active:border-b-[1px] active:translate-y-[2px] text-[#4A3500] text-xs font-display font-extrabold cursor-pointer"
              >
                <GlyphInline name="gift" /> +{amt}
              </button>
            ))}
          </div>
        )}
      </div>

      {giftedTotal > 0 && (
        <p className="text-[11px] font-bold text-[#4A3500] tabular-nums"><GlyphInline name="gift" /> Total hadiah diterima: {giftedTotal} Poin dari {post.gifts.length} hadiah</p>
      )}
      {notice && (
        <p role="status" className="text-xs font-bold text-[#7A6E65]">
          {notice}
        </p>
      )}

      {showComments && (
        <div className="space-y-2 pt-2 border-t-2 border-dashed border-[#E6DFD2]">
          {post.comments.map((c) => {
            const ca = profiles.find((p) => p.id === c.authorId);
            return (
              <div key={c.id} className="flex items-start gap-2 min-w-0">
                {ca && <FamilyAvatar profile={ca} size={32} />}
                <div className="min-w-0 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] px-3 py-1.5">
                  <p className="text-[11px] font-display font-extrabold text-[#3D352E]">{ca ? shortName(ca.display_name) : "Anggota"}</p>
                  <p className="text-xs font-bold text-[#3D352E] leading-snug break-words">{c.text}</p>
                </div>
              </div>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (addComment(post.id, viewer.id, comment)) {
                soundEffects.tactileClick();
                setComment("");
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={comment}
              maxLength={240}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tulis komentar..."
              aria-label="Tulis komentar"
              className="flex-1 min-w-0 px-3 py-2 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] focus:border-[#38B6FF] focus:outline-none text-xs font-bold text-[#3D352E]"
            />
            <button type="submit" disabled={!comment.trim()} className="px-3 py-2 rounded-2xl bg-[#38B6FF] disabled:bg-[#D4C9B4] text-white font-display text-xs font-extrabold cursor-pointer disabled:cursor-not-allowed">
              Kirim
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

/* ───────────────────────── Feed ───────────────────────── */

export function FamilyFeed({ viewer }: { viewer: ProfileData }) {
  const posts = useFamilyStore((s) => s.feedPosts);
  return (
    <div className="space-y-4 min-w-0">
      <IncomingReminders viewer={viewer} />
      <Composer viewer={viewer} />
      <PendingBroadcasts viewer={viewer} />
      {posts.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-1">
          <p className="font-display text-base font-extrabold text-[#3D352E]">Beranda masih sepi</p>
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
            Catat kas atau tulis cerita hari ini ({longDateLabel(localDateStr())}), dan siarannya akan muncul di sini otomatis.
          </p>
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} viewer={viewer} />)
      )}
    </div>
  );
}
