"""
Utilities for building a multimodal rare-disease training dataset from MIMIC-IV.

Expected inputs:
- MIMIC-IV core tables: patients.csv.gz, admissions.csv.gz, diagnoses_icd.csv.gz
- MIMIC-IV hosp table: labevents.csv.gz
- MIMIC-IV-Note table: discharge.csv.gz or radiology.csv.gz
- User-provided ICD-to-rare-disease mapping CSV

The mapping CSV keeps rare-disease supervision explicit and reviewable. A minimal mapping file:

icd_code,icd_version,disease_id,disease_name
D761,10,MONDO:0018882,Hemophagocytic lymphohistiocytosis
M3214,10,MONDO:0019282,Systemic lupus erythematosus with organ involvement
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split


@dataclass
class MIMICDatasetPaths:
    patients_path: Path
    admissions_path: Path
    diagnoses_icd_path: Path
    labevents_path: Path
    notes_path: Path
    icd_to_rare_disease_map_path: Path


@dataclass
class LabelMappingArtifacts:
    label_to_index: Dict[str, int]
    index_to_label: Dict[int, str]
    label_to_name: Dict[str, str]


@dataclass
class PreparedSplit:
    train_samples: List[Dict[str, Any]]
    val_samples: List[Dict[str, Any]]
    continuous_feature_names: List[str]
    categorical_feature_names: List[str]
    categorical_cardinalities: List[int]
    label_artifacts: LabelMappingArtifacts


def _normalize_icd_code(value: Any) -> str:
    return str(value).strip().upper().replace(".", "")


def load_label_mapping(mapping_path: Path) -> Tuple[pd.DataFrame, LabelMappingArtifacts]:
    mapping_df = pd.read_csv(mapping_path)
    required_columns = {"icd_code", "icd_version", "disease_id", "disease_name"}
    missing = required_columns - set(mapping_df.columns)
    if missing:
        raise ValueError(f"Mapping file is missing required columns: {sorted(missing)}")

    mapping_df = mapping_df.copy()
    mapping_df["icd_code"] = mapping_df["icd_code"].map(_normalize_icd_code)
    mapping_df["icd_version"] = mapping_df["icd_version"].astype(int)
    mapping_df["disease_id"] = mapping_df["disease_id"].astype(str)
    mapping_df["disease_name"] = mapping_df["disease_name"].astype(str)
    mapping_df = mapping_df.drop_duplicates(subset=["icd_code", "icd_version", "disease_id"])

    ordered_labels = sorted(mapping_df["disease_id"].unique().tolist())
    label_to_index = {label: idx for idx, label in enumerate(ordered_labels)}
    index_to_label = {idx: label for label, idx in label_to_index.items()}
    label_to_name = (
        mapping_df[["disease_id", "disease_name"]]
        .drop_duplicates(subset=["disease_id"])
        .set_index("disease_id")["disease_name"]
        .to_dict()
    )

    return mapping_df, LabelMappingArtifacts(
        label_to_index=label_to_index,
        index_to_label=index_to_label,
        label_to_name=label_to_name,
    )


def _load_patients(patients_path: Path) -> pd.DataFrame:
    columns = ["subject_id", "gender", "anchor_age"]
    patients = pd.read_csv(patients_path, usecols=columns)
    patients["anchor_age"] = patients["anchor_age"].fillna(patients["anchor_age"].median())
    return patients


def _load_admissions(admissions_path: Path) -> pd.DataFrame:
    columns = [
        "subject_id",
        "hadm_id",
        "admission_type",
        "insurance",
        "language",
        "marital_status",
        "race",
    ]
    admissions = pd.read_csv(admissions_path, usecols=columns)
    for column in ["admission_type", "insurance", "language", "marital_status", "race"]:
        admissions[column] = admissions[column].fillna("UNKNOWN").astype(str)
    return admissions


def _load_notes(notes_path: Path, max_characters: int = 4000) -> pd.DataFrame:
    notes = pd.read_csv(notes_path, usecols=["subject_id", "hadm_id", "text"])
    notes["text"] = notes["text"].fillna("").astype(str).str.replace(r"\s+", " ", regex=True).str.strip()
    notes = notes[notes["hadm_id"].notna() & (notes["text"] != "")]
    notes["hadm_id"] = notes["hadm_id"].astype(int)
    notes["text"] = notes["text"].str.slice(0, max_characters)
    aggregated = (
        notes.groupby(["subject_id", "hadm_id"], as_index=False)["text"]
        .apply(lambda values: " ".join(values.tolist()))
        .reset_index(drop=True)
    )
    return aggregated


def _select_lab_item_ids(labevents: pd.DataFrame, top_k_labs: int) -> List[int]:
    top_items = labevents["itemid"].value_counts().head(top_k_labs).index.tolist()
    return [int(item_id) for item_id in top_items]


def _load_lab_features(
    labevents_path: Path,
    selected_item_ids: Optional[Sequence[int]] = None,
    top_k_labs: int = 64,
) -> pd.DataFrame:
    columns = ["subject_id", "hadm_id", "itemid", "valuenum"]
    labs = pd.read_csv(labevents_path, usecols=columns)
    labs = labs[labs["hadm_id"].notna()]
    labs = labs[labs["valuenum"].notna()]
    labs["hadm_id"] = labs["hadm_id"].astype(int)
    labs["itemid"] = labs["itemid"].astype(int)

    if selected_item_ids is None:
        selected_item_ids = _select_lab_item_ids(labs, top_k_labs=top_k_labs)
    selected_item_ids = [int(item_id) for item_id in selected_item_ids]

    labs = labs[labs["itemid"].isin(selected_item_ids)]
    grouped = (
        labs.groupby(["subject_id", "hadm_id", "itemid"], as_index=False)["valuenum"]
        .mean()
        .rename(columns={"valuenum": "lab_mean"})
    )
    pivot = grouped.pivot_table(
        index=["subject_id", "hadm_id"],
        columns="itemid",
        values="lab_mean",
        aggfunc="mean",
    )
    pivot.columns = [f"lab_item_{int(column)}" for column in pivot.columns]
    pivot = pivot.reset_index()
    return pivot


def _build_multilabel_targets(
    diagnoses_icd_path: Path,
    mapping_df: pd.DataFrame,
    label_artifacts: LabelMappingArtifacts,
) -> pd.DataFrame:
    diagnoses = pd.read_csv(
        diagnoses_icd_path,
        usecols=["subject_id", "hadm_id", "icd_code", "icd_version"],
    )
    diagnoses = diagnoses[diagnoses["hadm_id"].notna()].copy()
    diagnoses["hadm_id"] = diagnoses["hadm_id"].astype(int)
    diagnoses["icd_code"] = diagnoses["icd_code"].map(_normalize_icd_code)
    diagnoses["icd_version"] = diagnoses["icd_version"].astype(int)

    merged = diagnoses.merge(mapping_df, on=["icd_code", "icd_version"], how="inner")
    merged["label_index"] = merged["disease_id"].map(label_artifacts.label_to_index)

    if merged.empty:
        raise ValueError(
            "No diagnoses matched the rare-disease mapping file. "
            "Check ICD code normalization and ensure the mapping overlaps with your MIMIC cohort."
        )

    grouped = (
        merged.groupby(["subject_id", "hadm_id"])["label_index"]
        .apply(lambda values: sorted(set(int(value) for value in values)))
        .reset_index()
    )
    return grouped


def _encode_categorical_columns(
    df: pd.DataFrame,
    categorical_columns: Sequence[str],
    train_indices: Sequence[int],
) -> Tuple[pd.DataFrame, Dict[str, Dict[str, int]], List[int]]:
    encoded_df = df.copy()
    category_maps: Dict[str, Dict[str, int]] = {}
    cardinalities: List[int] = []

    train_df = encoded_df.iloc[list(train_indices)]
    for column in categorical_columns:
        categories = sorted(train_df[column].fillna("UNKNOWN").astype(str).unique().tolist())
        category_map = {value: idx for idx, value in enumerate(categories)}
        unknown_index = len(category_map)
        category_maps[column] = category_map
        cardinalities.append(unknown_index + 1)
        encoded_df[column] = (
            encoded_df[column]
            .fillna("UNKNOWN")
            .astype(str)
            .map(lambda value: category_map.get(value, unknown_index))
            .astype(int)
        )

    return encoded_df, category_maps, cardinalities


def _normalize_continuous_columns(
    df: pd.DataFrame,
    continuous_columns: Sequence[str],
    train_indices: Sequence[int],
) -> Tuple[pd.DataFrame, Dict[str, Dict[str, float]]]:
    normalized_df = df.copy()
    normalization_stats: Dict[str, Dict[str, float]] = {}
    train_df = normalized_df.iloc[list(train_indices)]

    for column in continuous_columns:
        train_values = train_df[column].astype(float)
        mean = float(train_values.mean())
        std = float(train_values.std(ddof=0))
        if std < 1e-6:
            std = 1.0
        normalization_stats[column] = {"mean": mean, "std": std}
        normalized_df[column] = (normalized_df[column].astype(float) - mean) / std

    return normalized_df, normalization_stats


def _samples_from_dataframe(
    df: pd.DataFrame,
    continuous_columns: Sequence[str],
    categorical_columns: Sequence[str],
    label_artifacts: LabelMappingArtifacts,
) -> List[Dict[str, Any]]:
    num_labels = len(label_artifacts.label_to_index)
    samples: List[Dict[str, Any]] = []

    for row in df.itertuples(index=False):
        labels = [0.0] * num_labels
        for label_index in row.label_indices:
            labels[int(label_index)] = 1.0

        sample = {
            "continuous": [float(getattr(row, column)) for column in continuous_columns],
            "categorical": [int(getattr(row, column)) for column in categorical_columns],
            "text": str(row.text),
            "labels": labels,
            "subject_id": int(row.subject_id),
            "hadm_id": int(row.hadm_id),
        }
        samples.append(sample)

    return samples


def build_mimic_multimodal_dataset(
    paths: MIMICDatasetPaths,
    *,
    top_k_labs: int = 64,
    selected_lab_item_ids: Optional[Sequence[int]] = None,
    test_size: float = 0.2,
    random_state: int = 42,
) -> PreparedSplit:
    mapping_df, label_artifacts = load_label_mapping(paths.icd_to_rare_disease_map_path)
    patients = _load_patients(paths.patients_path)
    admissions = _load_admissions(paths.admissions_path)
    notes = _load_notes(paths.notes_path)
    lab_features = _load_lab_features(
        paths.labevents_path,
        selected_item_ids=selected_lab_item_ids,
        top_k_labs=top_k_labs,
    )
    labels = _build_multilabel_targets(paths.diagnoses_icd_path, mapping_df, label_artifacts)

    dataset_df = (
        labels.merge(admissions, on=["subject_id", "hadm_id"], how="inner")
        .merge(patients, on="subject_id", how="left")
        .merge(notes, on=["subject_id", "hadm_id"], how="inner")
        .merge(lab_features, on=["subject_id", "hadm_id"], how="inner")
    )

    if dataset_df.empty:
        raise ValueError(
            "No patient encounters remained after joining labels, notes, admissions, patients, and labs."
        )

    lab_feature_columns = sorted([column for column in dataset_df.columns if column.startswith("lab_item_")])
    for column in lab_feature_columns:
        dataset_df[column] = dataset_df[column].astype(float)
        dataset_df[column] = dataset_df[column].fillna(dataset_df[column].median())

    dataset_df["anchor_age"] = dataset_df["anchor_age"].fillna(dataset_df["anchor_age"].median())

    categorical_columns = ["gender", "admission_type", "insurance", "language", "marital_status", "race"]
    continuous_columns = ["anchor_age", *lab_feature_columns]

    all_indices = np.arange(len(dataset_df))
    train_indices, val_indices = train_test_split(
        all_indices,
        test_size=test_size,
        random_state=random_state,
        shuffle=True,
    )

    encoded_df, _, categorical_cardinalities = _encode_categorical_columns(
        dataset_df, categorical_columns, train_indices
    )
    normalized_df, _ = _normalize_continuous_columns(encoded_df, continuous_columns, train_indices)

    train_df = normalized_df.iloc[list(train_indices)].reset_index(drop=True)
    val_df = normalized_df.iloc[list(val_indices)].reset_index(drop=True)

    return PreparedSplit(
        train_samples=_samples_from_dataframe(
            train_df, continuous_columns, categorical_columns, label_artifacts
        ),
        val_samples=_samples_from_dataframe(
            val_df, continuous_columns, categorical_columns, label_artifacts
        ),
        continuous_feature_names=list(continuous_columns),
        categorical_feature_names=list(categorical_columns),
        categorical_cardinalities=categorical_cardinalities,
        label_artifacts=label_artifacts,
    )


def save_prepared_dataset(prepared: PreparedSplit, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "train_samples.json").write_text(
        json.dumps(prepared.train_samples, indent=2),
        encoding="utf-8",
    )
    (output_dir / "val_samples.json").write_text(
        json.dumps(prepared.val_samples, indent=2),
        encoding="utf-8",
    )

    metadata = {
        "continuous_feature_names": prepared.continuous_feature_names,
        "categorical_feature_names": prepared.categorical_feature_names,
        "categorical_cardinalities": prepared.categorical_cardinalities,
        "label_artifacts": {
            "label_to_index": prepared.label_artifacts.label_to_index,
            "index_to_label": prepared.label_artifacts.index_to_label,
            "label_to_name": prepared.label_artifacts.label_to_name,
        },
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

