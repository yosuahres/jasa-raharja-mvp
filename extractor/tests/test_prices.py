import pytest

from app.prices import parse_idr


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("1.500.000", 1_500_000),
        ("Rp 1.500.000,-", 1_500_000),
        ("Rp. 250.000,00", 250_000),
        ("1,500,000", 1_500_000),
        ("1,500,000.00", 1_500_000),
        ("75000", 75_000),
        ("150rb", 150_000),
        ("1,5 jt", 1_500_000),
        ("2.5jt", 2_500_000),
        ("12.000", 12_000),
        ("Rp450.000,00", 450_000),
        ("275,000,00", None),  # typo in the source: left for review, not repaired
        ("-", None),
        ("", None),
        (None, None),
        ("hubungi kasir", None),
    ],
)
def test_parse_idr(raw, expected):
    assert parse_idr(raw) == expected
