import pytest

from app.masterdata import detect, icd9_of


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("INJECTION INTO PERIPHERAL NERVE (04.8)", ("04.8", "INJECTION INTO PERIPHERAL NERVE")),
        ("DECOMPRESSION OF TRIGEMINAL NERVE ROOT (04.41 )", ("04.41", "DECOMPRESSION OF TRIGEMINAL NERVE ROOT")),
        ("MUSCLE (UPPER LIMB), RUPTURE (83.74)", ("83.74", "MUSCLE (UPPER LIMB), RUPTURE")),
        ("AMPUTATION (84.09. 84.20)", None),  # two codes: a person decides
        ("EXCISION BIOPSY (77.", None),  # cut off
        ("Kamar Kelas III", None),
    ],
)
def test_icd9_of(name, expected):
    assert icd9_of(name) == expected


def _row(name, page=1, section=None, parents=()):
    return {"raw_name": name, "page": page, "section": section, "parents": list(parents), "facility": None}


def test_detect_prefers_the_row_name_as_evidence():
    rows = [
        _row("Kamar", page=3, parents=["Rawat Inap ICU"]),
        _row("Perawatan ICU / hari", page=7),
    ]
    assert detect(rows, [{"id": "icu", "name": "ICU", "keywords": []}]) == [
        {"id": "icu", "rows": 2, "page": 7, "evidence": "Perawatan ICU / hari"}
    ]


def test_detect_matches_whole_words_and_keywords():
    rows = [_row("PICUNG"), _row("MSCT Kepala"), _row("Kamar Operasi Besar")]
    items = [
        {"id": "icu", "name": "ICU", "keywords": []},
        {"id": "ct-scan", "name": "CT Scan", "keywords": ["MSCT"]},
        {"id": "ok", "name": "Kamar Operasi (OK)", "keywords": []},
    ]
    assert [d["id"] for d in detect(rows, items)] == ["ct-scan", "ok"]
