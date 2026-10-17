"""Acoustic Feature Clustering: real K-Means over frame-level features of the uploaded audio."""
from __future__ import annotations

import librosa
import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from .errors import ApiError

FRAME = 512  # 32 ms at 16 kHz
HOP = 160  # 10 ms hop -> ~69 % frame overlap
FEATURE_NAMES = (
    ["rms_db", "zero_crossing_rate", "spectral_centroid_hz", "spectral_bandwidth_hz",
     "spectral_rolloff_hz", "spectral_flatness"] + [f"mfcc_{i}" for i in range(1, 7)]
)
SUMMARY_FEATURES = ["rms_db", "zero_crossing_rate", "spectral_centroid_hz", "spectral_flatness"]
MIN_K, MAX_K = 2, 8


def frame_features(y: np.ndarray, sr: int) -> np.ndarray:
    kw = dict(n_fft=FRAME, hop_length=HOP)
    rms = librosa.feature.rms(y=y, frame_length=FRAME, hop_length=HOP)[0]
    zcr = librosa.feature.zero_crossing_rate(y, frame_length=FRAME, hop_length=HOP)[0]
    cent = librosa.feature.spectral_centroid(y=y, sr=sr, **kw)[0]
    bw = librosa.feature.spectral_bandwidth(y=y, sr=sr, **kw)[0]
    roll = librosa.feature.spectral_rolloff(y=y, sr=sr, **kw)[0]
    flat = librosa.feature.spectral_flatness(y=y, **kw)[0]
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=7, n_mels=40, **kw)[1:7]
    rows = [20 * np.log10(rms + 1e-6), zcr, cent, bw, roll, flat, *mfcc]
    return np.vstack(rows).T  # (frames, features)


def run_kmeans(y: np.ndarray, sr: int, k: int, seed: int = 42) -> dict:
    if not (MIN_K <= k <= MAX_K):
        raise ApiError(422, "invalid_k", f"Number of clusters must be between {MIN_K} and {MAX_K}.")
    feats = frame_features(y, sr)
    feats = feats[np.isfinite(feats).all(axis=1)]
    n = len(feats)
    if n < k * 10:
        raise ApiError(
            422, "too_few_frames",
            f"Only {n} analysis frames are available, which is too few for {k} clusters.",
        )

    X = StandardScaler().fit_transform(feats)
    km = KMeans(n_clusters=k, n_init=10, random_state=seed).fit(X)
    labels = km.labels_

    # Stable ordering: cluster 0 = lowest mean frame energy.
    order = np.argsort([feats[labels == c, 0].mean() for c in range(k)])
    remap = {int(old): new for new, old in enumerate(order)}
    labels = np.array([remap[int(l)] for l in labels])

    silhouette, silhouette_note = None, None
    if len(np.unique(labels)) >= 2 and n > k:
        silhouette = round(float(
            silhouette_score(X, labels, sample_size=min(n, 3000), random_state=seed)), 4)
    else:
        silhouette_note = "Silhouette score is undefined (fewer than two non-empty clusters)."

    # Run-length encoded timeline
    hop_s = HOP / sr
    segments, start = [], 0
    for i in range(1, n + 1):
        if i == n or labels[i] != labels[start]:
            segments.append({"start_s": round(start * hop_s, 3), "end_s": round(i * hop_s, 3),
                             "cluster": int(labels[start])})
            start = i

    clusters = []
    for c in range(k):
        m = labels == c
        stats = {name: round(float(feats[m, FEATURE_NAMES.index(name)].mean()), 4)
                 for name in SUMMARY_FEATURES} if m.any() else {}
        clusters.append({"cluster": c, "size_frames": int(m.sum()),
                         "fraction": round(float(m.mean()), 4),
                         "duration_s": round(float(m.sum() * hop_s), 3), "feature_means": stats})

    pca = PCA(n_components=2, random_state=seed).fit(X)
    proj = pca.transform(X)
    stride = max(1, n // 500)
    idx = np.arange(0, n, stride)
    points = [{"x": round(float(proj[i, 0]), 3), "y": round(float(proj[i, 1]), 3),
               "cluster": int(labels[i])} for i in idx]

    return {
        "analysis": "Acoustic Feature Clustering",
        "disclaimer": "Clusters are unsupervised groupings of acoustic frames. They are not verified "
        "emotion classes.",
        "measured": True,
        "source": "scikit-learn KMeans on librosa frame-level features",
        "parameters": {"k": k, "seed": seed, "frame_ms": round(FRAME / sr * 1000, 1),
                       "hop_ms": round(HOP / sr * 1000, 1), "features": FEATURE_NAMES,
                       "standardized": True, "n_init": 10},
        "n_frames": int(n),
        "silhouette_score": silhouette,
        "silhouette_note": silhouette_note,
        "inertia": round(float(km.inertia_), 3),
        "duration_s": round(n * hop_s, 3),
        "timeline": segments,
        "clusters": clusters,
        "projection": {"method": "PCA (2 components)",
                       "explained_variance": [round(float(v), 4) for v in pca.explained_variance_ratio_],
                       "points": points, "n_points_shown": len(points)},
    }
