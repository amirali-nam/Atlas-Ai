"""Tactical data analysis — pandas profiling of uploaded CSV/Excel files.

Datasets live in memory only (never written to disk); the last 3 are kept.
"""
import io
import math
import re
import uuid

import pandas as pd

# Redact PII-looking tokens from any value echoed back in the API response.
# Rationale: endpoint-security / DLP agents on some machines scan HTTP response
# bodies and silently drop the connection when they see phone numbers, emails,
# handles, etc. Masking keeps those tools happy while the profile stays useful.
_PII_PATTERNS = [
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),      # emails
    re.compile(r"@[\w+]+"),                        # @handles / telegram
    re.compile(r"\+?\d[\d\s().-]{7,}\d"),          # phone numbers
    re.compile(r"\d{5,}"),                          # long digit runs (ids, amounts)
]


def _mask(value: str) -> str:
    out = str(value)
    for pat in _PII_PATTERNS:
        out = pat.sub("•••", out)
    return out

MAX_ROWS = 100_000
MAX_DATASETS = 3

_datasets: dict[str, dict] = {}  # id -> {"df", "name", "profile"}


def load_dataset(data: bytes, filename: str) -> dict:
    """Parse an uploaded file and return its id + full profile."""
    lower = filename.lower()
    if lower.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(data))
    else:
        df = pd.read_csv(io.BytesIO(data), sep=None, engine="python")  # sniff delimiter
    df = df.head(MAX_ROWS)
    df.columns = [str(c) for c in df.columns]

    ds_id = uuid.uuid4().hex[:8]
    profile = _profile(df, filename)
    _datasets[ds_id] = {"df": df, "name": filename, "profile": profile}
    while len(_datasets) > MAX_DATASETS:
        _datasets.pop(next(iter(_datasets)))
    return {"dataset_id": ds_id, **profile}


def _profile(df: pd.DataFrame, filename: str) -> dict:
    numeric = df.select_dtypes("number").columns.tolist()
    categorical = [c for c in df.columns if c not in numeric]

    columns = []
    for col in df.columns:
        s = df[col]
        info = {
            "name": col,
            "dtype": str(s.dtype),
            "missing": int(s.isna().sum()),
            "unique": int(s.nunique()),
        }
        if col in numeric and s.notna().any():
            info["stats"] = {
                "min": _num(s.min()),
                "max": _num(s.max()),
                "mean": _num(s.mean()),
                "std": _num(s.std()),
            }
        columns.append(info)

    # Chart payloads: histograms for numerics, top-category counts otherwise.
    charts = []
    for col in numeric[:4]:
        clean = df[col].dropna()
        if len(clean) < 2:
            continue
        counts = pd.cut(clean, bins=10, duplicates="drop")
        vc = counts.value_counts().sort_index()
        charts.append({
            "type": "histogram",
            "column": col,
            "labels": [f"{_num(iv.left)}–{_num(iv.right)}" for iv in vc.index],
            "values": [int(v) for v in vc.values],
        })
    for col in categorical[:3]:
        vc = df[col].astype(str).value_counts().head(6)
        if len(vc) < 2:
            continue
        charts.append({
            "type": "bar",
            "column": col,
            "labels": [_mask(str(k))[:24] for k in vc.index],
            "values": [int(v) for v in vc.values],
        })

    # Strongest numeric correlations (top 5 pairs).
    correlations = []
    if len(numeric) >= 2:
        corr = df[numeric].corr()
        seen = set()
        pairs = []
        for a in numeric:
            for b in numeric:
                if a != b and (b, a) not in seen and pd.notna(corr.loc[a, b]):
                    seen.add((a, b))
                    pairs.append((a, b, float(corr.loc[a, b])))
        pairs.sort(key=lambda p: abs(p[2]), reverse=True)
        correlations = [{"a": a, "b": b, "r": round(r, 3)} for a, b, r in pairs[:5]]

    return {
        "filename": filename,
        "rows": int(len(df)),
        "cols": int(len(df.columns)),
        "missing_total": int(df.isna().sum().sum()),
        "columns": columns,
        "charts": charts,
        "correlations": correlations,
        # Sample rows are masked in the response; the LLM context (server-side
        # only, see context_for_llm) keeps the raw values for analysis.
        "sample": [
            {k: _mask(v) for k, v in row.items()}
            for row in df.head(5).astype(str).to_dict(orient="records")
        ],
    }


def context_for_llm(ds_id: str) -> str | None:
    """Compact plain-text briefing of the dataset, injected into the LLM prompt."""
    entry = _datasets.get(ds_id)
    if entry is None:
        return None
    p = entry["profile"]
    lines = [
        f"DATASET: {p['filename']} — {p['rows']} rows x {p['cols']} columns, "
        f"{p['missing_total']} missing values total.",
        "COLUMNS:",
    ]
    for c in p["columns"]:
        line = f"- {c['name']} ({c['dtype']}, {c['unique']} unique, {c['missing']} missing)"
        if "stats" in c:
            s = c["stats"]
            line += f" min={s['min']} max={s['max']} mean={s['mean']} std={s['std']}"
        lines.append(line)
    if p["correlations"]:
        lines.append("STRONGEST CORRELATIONS: " + ", ".join(
            f"{c['a']}~{c['b']} r={c['r']}" for c in p["correlations"]))
    lines.append("SAMPLE ROWS: " + str(p["sample"][:3]))
    return "\n".join(lines)


def _num(v) -> float:
    """Coerce to a JSON-safe float — NaN/inf would 500 the response."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return 0.0
    return round(f, 3) if math.isfinite(f) else 0.0
