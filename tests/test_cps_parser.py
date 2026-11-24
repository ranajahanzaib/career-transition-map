import gzip

from scripts.data_pipeline import parse_cps_transition_records


def _record(*, status: str, answer: str, current: str, previous: str, weight: str) -> bytes:
    row = bytearray(b" " * 1222)
    row[859:863] = current.encode()
    row[1170:1174] = previous.encode()
    row[1176:1178] = answer.encode()
    row[1200:1202] = status.encode()
    row[1202:1212] = weight.encode()
    return bytes(row) + b"\n"


def test_cps_parser_uses_documented_fields_and_implied_weight_scale(tmp_path):
    source = tmp_path / "cps.gz"
    with gzip.open(source, "wb") as stream:
        stream.write(_record(status=" 2", answer=" 1", current="2310", previous="  -1", weight="  12345678"))
        stream.write(_record(status=" 2", answer=" 2", current="2310", previous="1010", weight="  12345678"))
        stream.write(_record(status=" 1", answer=" 2", current="2310", previous="1010", weight="  12345678"))

    rows = parse_cps_transition_records(source)

    assert rows == [
        {"origin": "2310", "destination": "2310", "weight": 1234.5678, "eligible": True, "occupational_changer": False},
        {"origin": "1010", "destination": "2310", "weight": 1234.5678, "eligible": True, "occupational_changer": True},
    ]
