import { MochiLoadingHop } from "@/components/illustrations/BukuDompetLogo";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FFFDF9]">
      <div className="rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] px-8 py-6 flex flex-col items-center text-center shadow-sm">
        <MochiLoadingHop
          message="Menyiapkan Jurnal Kas Mochi..."
          className="w-48"
        />
      </div>
    </div>
  );
}
