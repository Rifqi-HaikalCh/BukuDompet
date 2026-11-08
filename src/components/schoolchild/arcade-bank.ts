/**
 * Soal tambahan Arcade Sekolah (Versi 5.2), dikelompokkan per level kesulitan.
 * Format tiap soal: [pertanyaan, jawaban benar, ...pilihan salah].
 * L1/L2 melengkapi soal dasar yang sudah ada (dibagi dua: paruh awal = L1, paruh akhir = L2),
 * L3 s/d L5 sepenuhnya baru dan makin sulit (kelas 3 → kelas 5-6 SD).
 */
export type Raw = readonly [string, string, ...string[]];

export interface LevelExtras {
  l1: readonly Raw[];
  l2: readonly Raw[];
  l3: readonly Raw[];
  l4: readonly Raw[];
  l5: readonly Raw[];
}

const Q_SPELL = "Mana tulisan yang benar?";

export const BANK_EXTRAS: Record<string, LevelExtras> = {
  /* ───────────── Bahasa ───────────── */
  "l-english": {
    l1: [["Apa arti kata “dog”?", "Anjing", "Kucing", "Ikan"]],
    l2: [],
    l3: [
      ["Apa bahasa Inggris dari “sekolah”?", "School", "Street", "Station"],
      ["Apa arti kata “beautiful”?", "Cantik", "Jelek", "Tinggi"],
      ["Apa bahasa Inggris dari “tujuh”?", "Seven", "Seventeen", "Seventy"],
      ["Apa arti kata “friend”?", "Teman", "Musuh", "Guru"],
      ["Apa bahasa Inggris dari “hari Senin”?", "Monday", "Sunday", "Tuesday"],
    ],
    l4: [
      ["Lengkapi: “She ... a book every night.”", "reads", "read", "reading"],
      ["Apa arti kalimat “I am hungry”?", "Aku lapar", "Aku haus", "Aku lelah"],
      ["Apa bahasa Inggris dari “kemarin”?", "Yesterday", "Tomorrow", "Today"],
      ["Lawan kata “big” dalam bahasa Inggris adalah ...", "Small", "Tall", "Long"],
      ["“How are you?” biasanya dijawab dengan ...", "“I am fine, thank you.”", "“My name is Dina.”", "“I am ten years old.”"],
    ],
    l5: [
      ["Apa arti “Where do you live?”", "Kamu tinggal di mana?", "Kamu bekerja di mana?", "Kamu lahir kapan?"],
      ["Lengkapi: “They ... playing football now.”", "are", "is", "am"],
      ["Apa bahasa Inggris dari “bendera”?", "Flag", "Floor", "Flower"],
      ["Apa arti kata “borrow”?", "Meminjam", "Membeli", "Menjual"],
      ["“It is a quarter past three.” artinya pukul ...", "03.15", "03.45", "02.45"],
    ],
  },
  "l-antonym": {
    l1: [["Lawan kata “siang” adalah ...", "Malam", "Sore", "Pagi"]],
    l2: [],
    l3: [
      ["Lawan kata “rajin” adalah ...", "Malas", "Pandai", "Giat"],
      ["Lawan kata “murah” adalah ...", "Mahal", "Banyak", "Hemat"],
      ["Lawan kata “tebal” adalah ...", "Tipis", "Lebar", "Sempit"],
      ["Lawan kata “bersih” adalah ...", "Kotor", "Wangi", "Rapi"],
      ["Lawan kata “naik” adalah ...", "Turun", "Maju", "Terbang"],
    ],
    l4: [
      ["Lawan kata “berani” adalah ...", "Penakut", "Pemarah", "Kuat"],
      ["Lawan kata “jujur” adalah ...", "Bohong", "Adil", "Cerdik"],
      ["Lawan kata “maju” adalah ...", "Mundur", "Lari", "Naik"],
      ["Lawan kata “sempit” adalah ...", "Luas", "Pendek", "Tipis"],
      ["Lawan kata “awal” adalah ...", "Akhir", "Tengah", "Kemarin"],
    ],
    l5: [
      ["Lawan kata “hemat” adalah ...", "Boros", "Murah", "Kaya"],
      ["Lawan kata “rendah hati” adalah ...", "Sombong", "Pendiam", "Pemalu"],
      ["Lawan kata “melimpah” adalah ...", "Langka", "Sederhana", "Meriah"],
      ["Lawan kata “tumpul” adalah ...", "Tajam", "Kasar", "Berat"],
      ["Lawan kata “menerima” adalah ...", "Menolak", "Meminta", "Mengambil"],
    ],
  },
  "l-spelling": {
    l1: [[Q_SPELL, "Kemarin", "Kemaren", "Kemarinn"]],
    l2: [],
    l3: [
      [Q_SPELL, "Apotek", "Apotik", "Apoteck"],
      [Q_SPELL, "Risiko", "Resiko", "Risico"],
      [Q_SPELL, "Analisis", "Analisa", "Analisys"],
      [Q_SPELL, "Objek", "Obyek", "Objeck"],
      [Q_SPELL, "Kualitas", "Kwalitas", "Kualiteit"],
    ],
    l4: [
      [Q_SPELL, "Mereka bermain di taman.", "Mereka bermain ditaman.", "Mereka bermain di-taman."],
      [Q_SPELL, "Aku pergi ke sekolah.", "Aku pergi kesekolah.", "Aku pergi ke-sekolah."],
      ["Manakah kalimat yang memakai huruf kapital dengan benar?", "Ibu pergi ke Bandung.", "ibu pergi ke bandung.", "Ibu pergi ke bandung."],
      ["Tanda baca yang tepat di akhir kalimat tanya adalah ...", "Tanda tanya (?)", "Tanda seru (!)", "Titik (.)"],
      [Q_SPELL, "Praktik", "Praktek", "Praktic"],
    ],
    l5: [
      [Q_SPELL, "Metode", "Metoda", "Methode"],
      [Q_SPELL, "Izin", "Ijin", "Izzin"],
      [Q_SPELL, "Hakikat", "Hakekat", "Hakikad"],
      [Q_SPELL, "Standar", "Standard", "Setandar"],
      [Q_SPELL, "Aktivitas", "Aktifitas", "Aktivitaz"],
    ],
  },
  "l-proverb": {
    l1: [["Malu bertanya sesat di ...", "jalan", "rumah", "pasar"]],
    l2: [],
    l3: [
      ["Bagai air di atas daun ...", "talas", "pisang", "jati"],
      ["Tong kosong nyaring ...", "bunyinya", "harganya", "gunanya"],
      ["Gajah di pelupuk mata tidak tampak, semut di seberang lautan ...", "tampak", "hilang", "menari"],
      ["Seperti kacang lupa akan ...", "kulitnya", "tanahnya", "pohonnya"],
      ["Karena nila setitik, rusak susu ...", "sebelanga", "sebotol", "seember"],
    ],
    l4: [
      ["Pucuk dicinta ulam ...", "tiba", "datang", "hilang"],
      ["Buah jatuh tidak jauh dari ...", "pohonnya", "tanahnya", "batangnya"],
      ["Sambil menyelam minum ...", "air", "teh", "susu"],
      ["Lain ladang lain ...", "belalang", "tanaman", "ikan"],
      ["Ringan sama dijinjing, berat sama ...", "dipikul", "dibawa", "diangkat"],
    ],
    l5: [
      ["Peribahasa “Air tenang menghanyutkan” berarti ...", "Orang pendiam sering memiliki kemampuan besar", "Air sungai itu sangat deras", "Orang yang berisik biasanya pintar"],
      ["“Sekali dayung dua tiga pulau terlampaui” berarti ...", "Satu usaha mencapai beberapa tujuan", "Pergi ke banyak pulau naik perahu", "Mendayung itu sangat melelahkan"],
      ["“Bagai pinang dibelah dua” menggambarkan dua orang yang ...", "Sangat mirip", "Sangat bertengkar", "Sangat berbeda"],
      ["“Besar pasak daripada tiang” berarti ...", "Pengeluaran lebih besar daripada pendapatan", "Rumah yang sangat besar", "Tiang rumah yang sangat kuat"],
      ["“Berat sama dipikul, ringan sama dijinjing” mengajarkan kita untuk ...", "Bekerja sama", "Bersaing", "Bermalas-malasan"],
    ],
  },

  /* ───────────── Uang & Logika ───────────── */
  "m-denom": {
    l1: [["Satu lembar Rp10.000 sama dengan berapa lembar Rp5.000?", "2 lembar", "5 lembar", "10 lembar"]],
    l2: [],
    l3: [
      ["Tiga lembar Rp20.000 nilainya ...", "Rp60.000", "Rp50.000", "Rp80.000"],
      ["Berapa lembar Rp5.000 untuk membentuk Rp25.000?", "5 lembar", "4 lembar", "6 lembar"],
      ["Satu lembar Rp50.000 ditukar dengan uang Rp10.000. Kamu mendapat ...", "5 lembar", "4 lembar", "10 lembar"],
      ["Dua lembar Rp10.000 ditambah satu lembar Rp5.000 nilainya ...", "Rp25.000", "Rp20.000", "Rp35.000"],
      ["Urutan nilai uang dari yang terkecil adalah ...", "Rp2.000, Rp5.000, Rp10.000", "Rp10.000, Rp5.000, Rp2.000", "Rp5.000, Rp2.000, Rp10.000"],
    ],
    l4: [
      ["Rp100.000 sama dengan berapa lembar Rp20.000?", "5 lembar", "4 lembar", "10 lembar"],
      ["Uangmu satu lembar Rp50.000 dan dua lembar Rp10.000. Jumlahnya ...", "Rp70.000", "Rp60.000", "Rp80.000"],
      ["Koin Rp500 ada 6 keping. Nilainya ...", "Rp3.000", "Rp2.000", "Rp5.000"],
      ["Uang Rp75.000 dapat dibentuk dari ...", "satu Rp50.000, satu Rp20.000, satu Rp5.000", "satu Rp50.000 dan satu Rp10.000", "satu Rp50.000 dan dua Rp10.000"],
      ["Berapa selisih Rp50.000 dan Rp35.000?", "Rp15.000", "Rp25.000", "Rp5.000"],
    ],
    l5: [
      ["Tiga lembar Rp50.000, satu lembar Rp20.000, dan dua lembar Rp5.000. Jumlah uangnya ...", "Rp180.000", "Rp170.000", "Rp190.000"],
      ["Adik punya Rp200.000 dalam lembaran Rp20.000. Berapa lembar uangnya?", "10 lembar", "5 lembar", "20 lembar"],
      ["Uang Rp135.000 dapat dibentuk dari ...", "satu Rp100.000, satu Rp20.000, satu Rp10.000, satu Rp5.000", "satu Rp100.000 dan dua Rp20.000", "dua Rp50.000, satu Rp20.000, satu Rp5.000"],
      ["Uang Rp5.000 ditabung selama 12 hari. Total tabungannya ...", "Rp60.000", "Rp50.000", "Rp65.000"],
      ["Satu koin Rp1.000 sama dengan dua koin Rp500. Berapa koin Rp500 untuk Rp5.000?", "10 koin", "5 koin", "20 koin"],
    ],
  },
  "m-compare": {
    l1: [
      ["Pensil A Rp2.000 dan pensil B Rp3.000 dengan kualitas sama. Mana yang lebih murah?", "Pensil A", "Pensil B", "Sama saja"],
      ["Apel A Rp8.000 per kilogram. Apel B Rp10.000 per kilogram. Mana yang lebih hemat?", "Apel A", "Apel B", "Sama saja"],
    ],
    l2: [["Promo beli 1 gratis 1: roti Rp4.000 per buah. Kamu mendapat 2 roti, berapa bayarnya?", "Rp4.000", "Rp8.000", "Rp2.000"]],
    l3: [
      ["Susu A: 2 kotak Rp10.000. Susu B: 3 kotak Rp13.500. Mana yang lebih hemat per kotak?", "Susu B", "Susu A", "Sama saja"],
      ["Tas Rp80.000 diskon 20%. Berapa harga setelah diskon?", "Rp64.000", "Rp60.000", "Rp70.000"],
      ["Kamu punya Rp20.000. Beli buku Rp7.500 dan penggaris Rp3.500. Sisa uangmu?", "Rp9.000", "Rp11.000", "Rp8.000"],
      ["Sepatu A Rp120.000 awet 2 tahun. Sepatu B Rp70.000 awet 1 tahun. Mana yang lebih hemat per tahun?", "Sepatu A", "Sepatu B", "Sama saja"],
      ["Es krim Rp3.000 dibeli 4 buah dengan uang Rp20.000. Berapa kembaliannya?", "Rp8.000", "Rp7.000", "Rp12.000"],
    ],
    l4: [
      ["Buku Rp45.000 diskon 10%. Kamu membayar ...", "Rp40.500", "Rp35.000", "Rp41.500"],
      ["Minyak A: 2 liter Rp34.000. Minyak B: 3 liter Rp48.000. Mana yang lebih hemat per liter?", "Minyak B", "Minyak A", "Sama saja"],
      ["Kamu belanja Rp28.000, Rp15.500, dan Rp6.500. Totalnya ...", "Rp50.000", "Rp48.500", "Rp52.000"],
      ["Mainan Rp36.000 diskon 50%. Harga akhirnya ...", "Rp18.000", "Rp26.000", "Rp16.000"],
      ["Uang sakumu Rp25.000. Kamu belanja Rp9.750 dan Rp8.250. Sisa uangmu?", "Rp7.000", "Rp8.000", "Rp6.000"],
    ],
    l5: [
      ["Toko A: baju Rp90.000 diskon 30%. Toko B: baju yang sama Rp70.000 tanpa diskon. Mana yang lebih murah?", "Toko A", "Toko B", "Sama saja"],
      ["Harga Rp200.000, diskon 25%, lalu potongan tambahan Rp10.000. Kamu membayar ...", "Rp140.000", "Rp150.000", "Rp130.000"],
      ["Paket A: 6 buku Rp72.000. Paket B: 8 buku Rp88.000. Mana yang lebih hemat per buku?", "Paket B", "Paket A", "Sama saja"],
      ["Kamu menabung Rp12.500 tiap minggu. Berapa tabunganmu dalam 8 minggu?", "Rp100.000", "Rp90.000", "Rp110.000"],
      ["Sepeda Rp600.000. Kamu sudah punya Rp245.000. Kekurangannya ...", "Rp355.000", "Rp345.000", "Rp365.000"],
    ],
  },
  "m-needwant": {
    l1: [["Sikat gigi adalah ...", "Kebutuhan", "Keinginan"]],
    l2: [],
    l3: [
      ["Seragam sekolah baru karena yang lama sudah sobek adalah ...", "Kebutuhan", "Keinginan"],
      ["Jam tangan mewah padahal sudah punya jam adalah ...", "Keinginan", "Kebutuhan"],
      ["Vitamin dari dokter saat sedang sakit adalah ...", "Kebutuhan", "Keinginan"],
      ["Langganan game premium bulanan adalah ...", "Keinginan", "Kebutuhan"],
      ["Buku pelajaran yang diwajibkan guru adalah ...", "Kebutuhan", "Keinginan"],
    ],
    l4: [
      ["Sepeda untuk berangkat sekolah yang jauh dan tidak ada kendaraan lain adalah ...", "Kebutuhan", "Keinginan"],
      ["Sepeda baru berwarna emas padahal sepeda lama masih bagus adalah ...", "Keinginan", "Kebutuhan"],
      ["Makan siang di restoran mahal setiap hari adalah ...", "Keinginan", "Kebutuhan"],
      ["Menabung untuk dana darurat adalah ...", "Kebutuhan", "Keinginan"],
      ["Kacamata baru karena mata minus bertambah adalah ...", "Kebutuhan", "Keinginan"],
    ],
    l5: [
      ["Ponsel untuk belajar daring ketika sekolah ditutup karena wabah adalah ...", "Kebutuhan", "Keinginan"],
      ["Ponsel model terbaru padahal ponsel lama masih lancar adalah ...", "Keinginan", "Kebutuhan"],
      ["Membayar iuran listrik rumah adalah ...", "Kebutuhan", "Keinginan"],
      ["Membeli tiket konser demi bersenang-senang adalah ...", "Keinginan", "Kebutuhan"],
      ["Tas baru karena tas lama robek dan tidak bisa dipakai lagi adalah ...", "Kebutuhan", "Keinginan"],
    ],
  },

  /* ───────────── Empati, Karakter & Emosi ───────────── */
  "e-feeling": {
    l1: [
      ["Nina dipeluk ibunya saat sedang sedih. Perasaannya menjadi ...", "Tenang", "Marah", "Takut"],
      ["Doni mendengar petir keras di malam hari. Perasaannya ...", "Takut", "Bangga", "Senang"],
    ],
    l2: [["Wati diajak bermain oleh teman barunya. Perasaannya ...", "Senang", "Marah", "Sedih"]],
    l3: [
      ["Rani tidak terpilih menjadi pemain inti padahal sudah berlatih keras. Perasaannya ...", "Kecewa", "Bangga", "Lega"],
      ["Bayu lupa membawa buku PR dan guru memanggil namanya. Perasaannya ...", "Malu", "Bangga", "Gembira"],
      ["Tita akhirnya menemukan kucingnya yang hilang. Perasaannya ...", "Lega", "Cemas", "Iri"],
      ["Eko melihat temannya dapat sepeda baru, sedangkan sepedanya rusak. Perasaannya bisa ...", "Iri", "Bangga", "Tenang"],
      ["Salma ditegur karena berbicara keras di perpustakaan. Perasaannya ...", "Malu", "Bangga", "Senang"],
    ],
    l4: [
      ["Arman menang lomba, tetapi sahabatnya kalah dan menangis. Perasaan Arman ...", "Senang tetapi merasa kasihan", "Marah dan iri", "Takut dan bosan"],
      ["Putri menunggu hasil ujian dan jantungnya berdebar. Perasaannya ...", "Tegang", "Bosan", "Bangga"],
      ["Kakak memarahi adik, lalu sadar adik tidak sengaja. Perasaan kakak ...", "Menyesal", "Bangga", "Bosan"],
      ["Dika diejek temannya karena salah membaca. Perasaan Dika ...", "Terluka dan malu", "Bangga", "Bersemangat"],
      ["Mira melihat teman sekelas sendirian saat istirahat. Perasaan Mira yang baik ...", "Prihatin", "Iri", "Bosan"],
    ],
    l5: [
      ["Temanmu murung setelah nilai ujiannya jelek. Tindakan yang menunjukkan empati ...", "Mendengarkan dan menyemangatinya", "Menertawakannya", "Pura-pura tidak melihat"],
      ["Adikmu menangis karena es krimnya jatuh. Sebaiknya kamu ...", "Menenangkan dan membagi sedikit esmu", "Mengatakan dia ceroboh", "Meninggalkannya"],
      ["Sahabatmu marah karena kamu lupa janji. Sebaiknya kamu ...", "Minta maaf dan menjelaskan dengan tenang", "Balas marah", "Menghindarinya"],
      ["Saat sangat marah, hal pertama yang baik dilakukan adalah ...", "Menarik napas dan menenangkan diri", "Berteriak sekeras mungkin", "Memukul meja"],
      ["Temanmu bercerita rahasia yang membuatnya sedih. Sebaiknya kamu ...", "Menjaga rahasianya dan menemaninya", "Menceritakan ke semua orang", "Menyuruhnya diam"],
    ],
  },
  "e-honesty": {
    l1: [
      ["Kamu tidak sengaja menjatuhkan es krim temanmu. Apa yang kamu lakukan?", "Meminta maaf", "Pura-pura tidak tahu", "Lari menjauh"],
      ["Kamu belum belajar tetapi ditanya, “Sudah belajar?” Jawabanmu ...", "“Belum, aku mulai sekarang.”", "“Sudah.”", "“Nanti saja.”"],
    ],
    l2: [["Kamu melihat temanmu menyontek saat ulangan. Sebaiknya ...", "Mengingatkannya dengan baik", "Ikut menyontek", "Mengejeknya di depan kelas"]],
    l3: [
      ["Nenek memberi uang jajan lebih karena salah hitung. Sebaiknya ...", "Memberi tahu nenek", "Menyimpannya diam-diam", "Membelanjakannya"],
      ["Kamu memecahkan vas tetangga saat bermain bola. Sebaiknya ...", "Minta maaf dan bertanggung jawab", "Kabur", "Menyalahkan angin"],
      ["Nilai ulanganmu 60 dan orang tuamu bertanya. Jawabanmu ...", "“Nilaiku 60, aku akan belajar lagi.”", "“Nilaiku 100.”", "“Aku lupa.”"],
      ["Kamu menemukan jam tangan di lapangan sekolah. Sebaiknya ...", "Menyerahkannya ke guru piket", "Memakainya", "Menjualnya"],
      ["Temanmu memintamu berbohong kepada guru demi dia. Sebaiknya ...", "Menolak dengan sopan", "Menurut saja", "Marah-marah"],
    ],
    l4: [
      ["Kamu menjaga warung ibu dan pelanggan membayar kelebihan Rp10.000. Sebaiknya ...", "Mengembalikan kelebihannya", "Memasukkannya ke saku", "Diam saja"],
      ["Temanmu mengajak membolos dan bilang tidak akan ketahuan. Sebaiknya ...", "Menolak karena berbohong itu salah", "Ikut karena tidak ketahuan", "Ikut tetapi cepat pulang"],
      ["Kamu tidak sengaja merobek buku perpustakaan. Sebaiknya ...", "Melapor kepada petugas", "Menaruhnya diam-diam di rak", "Memasukkannya ke tasmu"],
      ["Gambarmu dipuji, padahal kakak ikut membantu. Sebaiknya ...", "Mengakui bahwa kakak membantu", "Diam saja agar dipuji", "Bilang itu karyamu sendiri"],
      ["Kejujuran membuat kita ...", "Dipercaya orang lain", "Selalu menang", "Tidak pernah salah"],
    ],
    l5: [
      ["Kamu tahu teman sekelas mengambil uang kas. Langkah paling bijak ...", "Memberi tahu guru atau orang dewasa tepercaya", "Ikut meminta bagian", "Mengejeknya di grup"],
      ["Ibu bertanya apakah kamu memakai ponselnya tanpa izin, ternyata ya. Jawabanmu ...", "“Iya, Bu, maaf. Lain kali aku izin.”", "“Tidak.”", "“Mungkin adik.”"],
      ["Kamu berjanji menolong teman, tetapi ternyata tidak bisa. Sebaiknya ...", "Memberi tahu lebih awal dan minta maaf", "Menghilang", "Berpura-pura sakit"],
      ["Nilaimu tertulis lebih tinggi karena salah koreksi. Sebaiknya ...", "Memberi tahu guru", "Diam dan senang", "Memamerkannya ke teman"],
      ["Orang yang jujur tetap berbuat benar walau tidak ada yang melihat. Contohnya ...", "Tetap membuang sampah pada tempatnya saat sendirian", "Membuang sampah saat tidak ada yang melihat", "Menyuruh orang lain membuangnya"],
    ],
  },
  "e-share": {
    l1: [
      ["Temanmu terjatuh saat bermain. Apa yang bisa kamu bagi?", "Bantuan dan semangat", "Tertawaan", "Rasa cuek"],
      ["Kamu punya dua pensil, temanmu tidak punya. Sebaiknya ...", "Meminjamkan satu", "Menyimpan keduanya", "Menyembunyikan pensilmu"],
    ],
    l2: [["Ada satu pizza untuk lima orang di rumah. Sebaiknya ...", "Memotong sama besar", "Mengambil potongan paling besar", "Memakannya diam-diam"]],
    l3: [
      ["Panen jeruk di rumahmu melimpah, tetangga tidak punya. Sebaiknya ...", "Membagikan sebagian", "Menjual semuanya", "Membuangnya"],
      ["Kamu mendapat hadiah dua buku yang sama. Temanmu gemar membaca. Sebaiknya ...", "Memberikan satu ke temanmu", "Menyimpan keduanya", "Menukarnya dengan uang"],
      ["Saat kerja kelompok, satu temanmu belum mengerti. Sebaiknya ...", "Menjelaskan dengan sabar", "Mengerjakan semua tanpa menjelaskan", "Mengabaikannya"],
      ["Kamu punya Rp10.000 dan temanmu butuh Rp2.000 untuk fotokopi. Sebaiknya ...", "Meminjamkan dan mengingatkan nanti", "Pura-pura tidak punya", "Menyuruhnya meminta orang lain"],
      ["Dalam permainan, ada anak yang selalu kalah. Sebaiknya ...", "Bergantian dan memberi semangat", "Mengejeknya", "Mengeluarkannya dari permainan"],
    ],
    l4: [
      ["Kamu menabung untuk sepeda, tetapi tetangga kebanjiran dan butuh bantuan. Pilihan yang peduli ...", "Menyumbang sebagian tabungan", "Pura-pura tidak tahu", "Pamer sepeda impian"],
      ["Sekolah mengumpulkan baju layak pakai. Kamu sebaiknya ...", "Menyumbangkan baju yang masih bagus", "Menyumbangkan baju yang sobek", "Tidak ikut"],
      ["Hasil tabungan kelompok dibagi sama rata karena semua ikut bekerja. Ini disebut ...", "Adil", "Curang", "Pelit"],
      ["Berbagi tidak harus uang. Contohnya ...", "Waktu, tenaga, dan perhatian", "Hanya barang mahal", "Hanya makanan"],
      ["Berbagi dengan ikhlas berarti ...", "Tidak mengharapkan imbalan", "Mengharapkan pujian", "Menagih balasan"],
    ],
    l5: [
      ["Uang sakumu Rp20.000. Kamu ingin menabung, jajan, dan berbagi. Pembagian yang bijak ...", "Menabung Rp10.000, jajan Rp7.000, berbagi Rp3.000", "Jajan semuanya", "Berbagi semuanya tanpa menabung"],
      ["Temanmu butuh bantuan, tetapi kamu juga sedang kesulitan. Sikap yang bijak ...", "Membantu sesuai kemampuan tanpa memaksakan diri", "Memaksa membantu dengan berutang", "Menolak dengan kasar"],
      ["Ada anak baru yang kesulitan memahami pelajaran. Bentuk berbagi yang tahan lama ...", "Mengajaknya belajar bersama", "Memberinya contekan", "Menyuruh orang tuanya mengajari"],
      ["Panitia bazar kekurangan relawan dan kamu bisa membantu. Sebaiknya ...", "Mendaftar dan datang tepat waktu", "Berjanji tetapi tidak datang", "Hanya menonton"],
      ["Lingkungan rumah kotor setelah banjir. Berbagi tenaga artinya ...", "Ikut gotong royong membersihkan", "Hanya memotret", "Pulang ke rumah"],
    ],
  },

  /* ───────────── Memori, Sains & Kreativitas ───────────── */
  "s-nature": {
    l1: [["Hewan yang bisa terbang adalah ...", "Burung", "Ikan", "Sapi"]],
    l2: [],
    l3: [
      ["Proses tumbuhan membuat makanan disebut ...", "Fotosintesis", "Respirasi", "Metamorfosis"],
      ["Perubahan ulat menjadi kupu-kupu disebut ...", "Metamorfosis", "Fotosintesis", "Penguapan"],
      ["Alat pernapasan manusia adalah ...", "Paru-paru", "Lambung", "Ginjal"],
      ["Planet terdekat dari Matahari adalah ...", "Merkurius", "Venus", "Bumi"],
      ["Benda cair yang berubah menjadi gas disebut ...", "Menguap", "Membeku", "Mencair"],
    ],
    l4: [
      ["Rantai makanan selalu diawali oleh ...", "Tumbuhan", "Hewan pemakan daging", "Pengurai"],
      ["Gaya yang menarik benda ke arah bumi adalah ...", "Gravitasi", "Magnet", "Gesekan"],
      ["Bagian bunga yang menghasilkan serbuk sari adalah ...", "Benang sari", "Putik", "Mahkota"],
      ["Hewan yang dapat hidup di dua alam disebut ...", "Amfibi", "Reptil", "Mamalia"],
      ["Sumber energi utama bagi bumi adalah ...", "Matahari", "Bulan", "Angin"],
    ],
    l5: [
      ["Air hujan yang meresap ke dalam tanah disebut ...", "Air tanah", "Embun", "Uap"],
      ["Energi yang dimiliki benda yang bergerak disebut energi ...", "Kinetik", "Potensial", "Kimia"],
      ["Gas yang kita hirup untuk bernapas adalah ...", "Oksigen", "Karbon dioksida", "Helium"],
      ["Benda yang dapat ditarik magnet adalah ...", "Paku besi", "Plastik", "Kayu"],
      ["Peristiwa Bulan menutupi Matahari disebut gerhana ...", "Matahari", "Bulan", "Planet"],
    ],
  },
  "s-weekly": {
    l1: [["Berapa hasil 5 + 6?", "11", "10", "12"]],
    l2: [],
    l3: [
      ["Lambang negara Indonesia adalah ...", "Garuda Pancasila", "Harimau Sumatra", "Komodo"],
      ["Berapa hasil 6 × 7?", "42", "36", "48"],
      ["Satu jam sama dengan berapa menit?", "60 menit", "100 menit", "30 menit"],
      ["Negara tetangga Indonesia di bagian utara Pulau Kalimantan adalah ...", "Malaysia", "Jepang", "Thailand"],
      ["Hari Pahlawan diperingati setiap tanggal ...", "10 November", "17 Agustus", "28 Oktober"],
    ],
    l4: [
      ["Berapa hasil 144 ÷ 12?", "12", "14", "11"],
      ["Sumpah Pemuda diikrarkan pada tahun ...", "1928", "1945", "1908"],
      ["Rumah adat Minangkabau disebut ...", "Rumah Gadang", "Joglo", "Honai"],
      ["Manakah bilangan prima?", "7", "9", "15"],
      ["Keliling persegi dengan sisi 8 cm adalah ...", "32 cm", "64 cm", "16 cm"],
    ],
    l5: [
      ["Luas persegi panjang dengan panjang 9 cm dan lebar 4 cm adalah ...", "36 cm²", "26 cm²", "13 cm²"],
      ["Proklamasi Kemerdekaan Indonesia dibacakan pada tahun ...", "1945", "1949", "1928"],
      ["Bilangan Romawi untuk 14 adalah ...", "XIV", "XVI", "XLI"],
      ["Tarian tradisional Bali yang terkenal adalah ...", "Pendet", "Saman", "Jaipong"],
      ["Berapa hasil 15 × 6 − 20?", "70", "90", "60"],
    ],
  },
};
