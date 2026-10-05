// DUMMY accident cases for Cari Rujukan, until the real source of cases is decided.
// Each tindakan is a key of tariff_treatments (extractor/app/treatments.py), taken from the sample
// documents (RS Ubaya, RSUD Iskak, RSUD dr. Soedono). A key no current document prices is skipped on screen.
// The same tindakan often has a different key per hospital (each document words it differently), so a
// step lists every hospital's wording to reach them all.

export type AccidentStep = { label: string; keys: string[] };

export type AccidentCase = {
  id: string;
  name: string;
  /** What happened, in a line, as a claim officer would write it. */
  description: string;
  steps: AccidentStep[];
};

const GAWAT_DARURAT = "Gawat darurat";
const OPERASI = "Operasi";
const LANJUTAN = "Perawatan lanjutan";

export const ACCIDENT_CASES: AccidentCase[] = [
  {
    id: "cedera-kepala-berat",
    name: "Cedera kepala berat",
    description: "Pengendara motor terlempar, tidak sadar, perdarahan di dalam kepala.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["ENDOTRAKEAL INTUBASI", "ET INTUBASI PASANG", "AIRWAI BREATING INTUBASI KEGAWATAN", "INFUS PASANG", "KATETER PASANG"] },
      { label: OPERASI, keys: ["KRANIOTOMI REGIO TRAUMA TREPANASI", "KRANIOTOMI TRAUMA TREPANASI VENTRIKULOSTOMI", "BRAIN EDH EPIDURAL EVAKUASI HEMORHAGE KRANIOTOMI"] },
      { label: LANJUTAN, keys: ["TEMPORER TRAKEOSTOMI", "TRAKEA TRAKEOSTOMI", "RAWAT TRAKEOSTOMI", "NGT PASANG"] },
    ],
  },
  {
    id: "cedera-tulang-belakang",
    name: "Cedera tulang belakang",
    description: "Jatuh dari motor dengan punggung terbentur, kedua kaki lemah.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["INFUS PASANG", "KATETER PASANG"] },
      { label: OPERASI, keys: ["FRAKTUR SPINE STABILISASI", "DISLOKASI FRAKTUR REDUKSI SPINE STABILISASI TERBUKA"] },
    ],
  },
  {
    id: "trauma-dada",
    name: "Trauma dada",
    description: "Dada membentur setang, sesak napas, darah di rongga dada.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["PASANG WSD", "KEST PASANG TUBE", "MINI PASANG WSD", "PLEURA PUNGSI"] },
      { label: OPERASI, keys: ["HEMATOTORAKS TORAKOTOMI", "FIKSASI FRAKTUR KOSTA"] },
      { label: LANJUTAN, keys: ["HARI RAWAT WSD", "REPOSISI WSD"] },
    ],
  },
  {
    id: "trauma-perut",
    name: "Trauma perut",
    description: "Perut terbentur keras saat tabrakan, tanda perdarahan dalam.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["INFUS PASANG", "KATETER PASANG", "NGT PASANG", "NASOGASTRIK NGT PASANG TUBE"] },
      {
        label: OPERASI,
        keys: [
          "BLEDING GINJAL HEPAR INTERNAL LAIN LIEN RUPTUR SEBAB",
          "ABDOMEN DAMAGE HEMOSTASIS KONTROL LAPAROTOMI PAKING TRAUMA",
          "SPLEN SPLENEKTOMI TRAUMA",
          "ABDOMEN MULTIPLE ORGAN REPARASI TRAUMA",
        ],
      },
      { label: LANJUTAN, keys: ["ABDOMEN LAPAROTOMI REOPERASI TRAUMA", "LUKA PASKA RAWAT"] },
    ],
  },
  {
    id: "patah-tulang-paha",
    name: "Patah tulang paha",
    description: "Motor jatuh menimpa kaki, paha tidak bisa digerakkan.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["BIDAI PASANG SPALK", "INFUS PASANG", "PASANG SKIN TRAKSI", "SKELETAL TRAKSI", "PASANG SKELETAL TRAKSI"] },
      { label: OPERASI, keys: ["FEMUR FRAKTUR ORIF SHAFT", "FEMUR FIKSASI FRAKTUR INTERNAL NAIL", "DHS FEMUR FIKSASI FRAKTUR INTERNAL"] },
      { label: LANJUTAN, keys: ["GIPS KNE LONG PASANG", "AMBIL FEMUR INTRAMEDULARI NAIL TIBI"] },
    ],
  },
  {
    id: "patah-tulang-lengan",
    name: "Patah tulang lengan",
    description: "Tertabrak saat menyeberang, lengan bawah bengkok dan bengkak.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["BIDAI PASANG SPALK", "ARM PASANG SLING", "FRAKTUR IMOBILISASI KAST PLASTER REPOSISI TERTUTUP"] },
      {
        label: OPERASI,
        keys: ["FRAKTUR ORIF RADIUS SHAFT ULNA", "FIKSASI FRAKTUR INTERNAL RADIUS ULNA", "FOREARM FRAKTUR INTRAMEDULARI RADIUS ROD SHAFT ULNA", "FRAKTUR HUMERUS ORIF SHAFT"],
      },
      { label: LANJUTAN, keys: ["ARM GIPS LONG PASANG", "ARM GANTI GIPS LONG"] },
    ],
  },
  {
    id: "patah-tulang-panggul",
    name: "Patah tulang panggul",
    description: "Pejalan kaki tertabrak mobil, nyeri hebat di panggul.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["INFUS PASANG", "KATETER PASANG"] },
      { label: OPERASI, keys: ["EKSTERNAL FIKSASI PELVIS", "FIKSASI FRAKTUR INTERNAL PELVIS", "FIKSASI FRAKTUR PELVIS PLATE SKREW", "ASETABULUM FIKSASI FRAKTUR PELVIS"] },
      { label: LANJUTAN, keys: ["AMBIL IMPLANT PELVIS"] },
    ],
  },
  {
    id: "patah-tulang-terbuka",
    name: "Patah tulang terbuka",
    description: "Tulang kaki menembus kulit setelah tabrakan, luka kotor.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["DEBRIDEMEN", "NEKROTOMI", "BIDAI PASANG SPALK"] },
      { label: OPERASI, keys: ["FIKSASI FRAKTUR INTERNAL TIBI", "AMPUTASI", "ABOVE AMPUTASI KNE"] },
      { label: LANJUTAN, keys: ["KOTOR LUKA RAWAT", "GRAFT SKIN SPLIT STSG TIKNES"] },
    ],
  },
  {
    id: "dislokasi-sendi",
    name: "Dislokasi sendi panggul",
    description: "Lutut membentur dashboard, sendi panggul bergeser.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["DISLOKASI FEMUR REPOSISI", "DISLOKASI FEMUR REPOSISI SENDI"] },
      { label: OPERASI, keys: ["DISLOKASI REDUKSI TERBUKA"] },
    ],
  },
  {
    id: "patah-tulang-wajah",
    name: "Patah tulang wajah dan rahang",
    description: "Wajah menghantam dashboard mobil, rahang tidak bisa menutup.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["FRAKTUR NASAL REDUKSI TERTUTUP", "DISLOKASI MANDIBULA REPOSISI", "LUKSASI MANDIBULA REPOSISI"] },
      {
        label: OPERASI,
        keys: ["ARKBAR REDUKSI TERTUTUP", "FIKSASI FRAKTUR INTERNAL MANDIBULA", "ELEVASI FRAKTUR ZIGOMA", "DASAR FRAKTUR ORBITA REKONSTRUKSI"],
      },
    ],
  },
  {
    id: "luka-robek-wajah",
    name: "Luka robek di wajah",
    description: "Wajah tergores aspal, luka robek luas dan kotor.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["DIWAJAH JAHIT LUKA", "DEBRIDEMEN", "ASING BENDA EKSTRAKSI"] },
      { label: OPERASI, keys: ["JAHIT KERUSAKAN LUKA WAJAH"] },
      { label: LANJUTAN, keys: ["ANGKAT JAHIT LUKA WAJAH"] },
    ],
  },
  {
    id: "luka-robek",
    name: "Luka robek ringan",
    description: "Jatuh dari motor, luka robek di lengan dan lutut.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["JAHIT LUKA", "HEKTING LUKA", "HEKTING", "DEBRIDEMEN"] },
      { label: LANJUTAN, keys: ["LUKA RAWAT", "KOTOR LUKA RAWAT", "ANGKAT HEKTING", "ANGKAT JAHIT LUKA"] },
    ],
  },
  {
    id: "cedera-tendon-tangan",
    name: "Cedera tendon tangan",
    description: "Tangan tersayat pecahan kaca saat tabrakan, jari tidak bisa ditekuk.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["JAHIT LUKA", "HEKTING", "ASING BENDA EKSTRAKSI"] },
      { label: OPERASI, keys: ["REPARASI TENDON"] },
    ],
  },
  {
    id: "luka-bakar",
    name: "Luka bakar",
    description: "Terkena api dan knalpot saat motor terbakar.",
    steps: [
      { label: GAWAT_DARURAT, keys: ["INFUS PASANG", "BAKAR KALI LUKA RAWAT", "BAKAR LUKA RAWAT TERMASUK"] },
      { label: OPERASI, keys: ["ESKAROTOMI", "BURN FASIOTOMI KOMPARTMEN SINDROME", "BAKAR DEBRIDEMEN FASEAKUT GRAFT LUKA SKIN"] },
      { label: LANJUTAN, keys: ["GRAFT SKIN SPLIT STSG TIKNES", "BAKAR LUKA RAW RAWAT SURFASE"] },
    ],
  },
];

export const findAccidentCase = (id: string | undefined) => ACCIDENT_CASES.find((c) => c.id === id) ?? null;

export const accidentCaseKeys = (c: AccidentCase) => [...new Set(c.steps.flatMap((s) => s.keys))];
