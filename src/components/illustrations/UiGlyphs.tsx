"use client";

/**
 * UiGlyphs — nama-nama ikon antarmuka (X, Check, Plus, ...) yang dulu berasal dari Lucide,
 * kini digambar oleh GlyphIcons (gaya BukuDompet). Sengaja memakai nama yang sama agar
 * pemakaian di JSX tetap singkat: <X className="w-4 h-4" />.
 */
import { GlyphIcon, type GlyphName } from "./GlyphIcons";

export interface UiGlyphProps {
  className?: string;
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
}

function make(name: GlyphName) {
  const Comp = (props: UiGlyphProps) => <GlyphIcon name={name} {...props} />;
  Comp.displayName = `UiGlyph(${name})`;
  return Comp;
}

export const X = make("close");
export const Check = make("check");
export const Plus = make("plus");
export const Minus = make("minus");
export const ChevronUp = make("chevron_up");
export const ChevronDown = make("chevron_down");
export const ChevronLeft = make("chevron_left");
export const ChevronRight = make("chevron_right");
export const Trash2 = make("trash");
export const Pencil = make("pencil");
export const PenLine = make("pen");
export const Send = make("send");
export const Volume2 = make("volume_on");
export const VolumeX = make("volume_off");
export const User = make("user");
export const UserPlus = make("user_plus");
export const LocateFixed = make("locate");
export const Target = make("locate");
export const Archive = make("archive");
export const Delete = make("delete_key");
export const ImagePlus = make("image_plus");
export const ShieldCheck = make("shield_check");
export const RefreshCw = make("refresh");
export const CheckCircle2 = make("check_circle");
export const Sparkles = make("sparkle");
export const Gift = make("gift");
export const Heart = make("heart");
export const Snowflake = make("snowflake");
export const ShoppingBag = make("shop_bag");
export const Lightbulb = make("bulb");
export const MessageCircle = make("chat");
export const MessageCircleHeart = make("chat");
export const Users = make("users");
export const Square = make("square");
export const CheckSquare = make("check_square");
