"""
CLI entry point for training the multimodal rare-disease model on MIMIC-IV data.

Example:
python -m zebra-synapse.ml.train_mimic `
  --patients-path E:\\mimic\\hosp\\patients.csv.gz `
  --admissions-path E:\\mimic\\hosp\\admissions.csv.gz `
  --diagnoses-icd-path E:\\mimic\\hosp\\diagnoses_icd.csv.gz `
  --labevents-path E:\\mimic\\hosp\\labevents.csv.gz `
  --notes-path E:\\mimic-note\\note\\discharge.csv.gz `
  --mapping-path E:\\mappings\\icd_to_rare_disease.csv `
  --output-dir E:\\runs\\rare-disease-v1
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

import torch

if __package__ in {None, ""}:
    import sys

    CURRENT_DIR = Path(__file__).resolve().parent
    if str(CURRENT_DIR) not in sys.path:
        sys.path.insert(0, str(CURRENT_DIR))

    from clinical_multimodal_pipeline import (  # type: ignore
        ClinicalMultiModalModel,
        TrainingConfig,
        build_multilabel_weighted_sampler,
        create_data_loader,
        evaluate_model,
        set_seed,
        train_model,
    )
    from mimic_data import (  # type: ignore
        MIMICDatasetPaths,
        build_mimic_multimodal_dataset,
        save_prepared_dataset,
    )
else:
    from .clinical_multimodal_pipeline import (
        ClinicalMultiModalModel,
        TrainingConfig,
        build_multilabel_weighted_sampler,
        create_data_loader,
        evaluate_model,
        set_seed,
        train_model,
    )
    from .mimic_data import MIMICDatasetPaths, build_mimic_multimodal_dataset, save_prepared_dataset


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train multimodal rare-disease predictor on MIMIC-IV.")
    parser.add_argument("--patients-path", type=Path, required=True)
    parser.add_argument("--admissions-path", type=Path, required=True)
    parser.add_argument("--diagnoses-icd-path", type=Path, required=True)
    parser.add_argument("--labevents-path", type=Path, required=True)
    parser.add_argument("--notes-path", type=Path, required=True)
    parser.add_argument("--mapping-path", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--text-model-name", type=str, default="emilyalsentzer/Bio_ClinicalBERT")
    parser.add_argument("--text-max-length", type=int, default=256)
    parser.add_argument("--top-k-labs", type=int, default=64)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--focal-alpha", type=float, default=0.75)
    parser.add_argument("--focal-gamma", type=float, default=2.0)
    parser.add_argument("--prediction-threshold", type=float, default=0.5)
    parser.add_argument("--save-prepared-data", action="store_true")
    return parser.parse_args()


def build_training_config(args: argparse.Namespace, prepared_num_labels: int, num_continuous: int, categorical_cardinalities: Any) -> TrainingConfig:
    return TrainingConfig(
        num_labels=prepared_num_labels,
        num_continuous_features=num_continuous,
        categorical_cardinalities=categorical_cardinalities,
        text_model_name=args.text_model_name,
        text_max_length=args.text_max_length,
        batch_size=args.batch_size,
        epochs=args.epochs,
        learning_rate=args.learning_rate,
        weight_decay=args.weight_decay,
        focal_alpha=args.focal_alpha,
        focal_gamma=args.focal_gamma,
        prediction_threshold=args.prediction_threshold,
    )


def save_training_artifacts(
    output_dir: Path,
    model: ClinicalMultiModalModel,
    config: TrainingConfig,
    history: Dict[str, Any],
    metrics: Dict[str, float],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), output_dir / "model.pt")
    (output_dir / "training_config.json").write_text(
        json.dumps(config.__dict__, indent=2),
        encoding="utf-8",
    )
    (output_dir / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    set_seed(args.seed)

    dataset_paths = MIMICDatasetPaths(
        patients_path=args.patients_path,
        admissions_path=args.admissions_path,
        diagnoses_icd_path=args.diagnoses_icd_path,
        labevents_path=args.labevents_path,
        notes_path=args.notes_path,
        icd_to_rare_disease_map_path=args.mapping_path,
    )

    prepared = build_mimic_multimodal_dataset(
        dataset_paths,
        top_k_labs=args.top_k_labs,
        test_size=args.test_size,
        random_state=args.seed,
    )

    if args.save_prepared_data:
        save_prepared_dataset(prepared, args.output_dir / "prepared")

    config = build_training_config(
        args,
        prepared_num_labels=len(prepared.label_artifacts.label_to_index),
        num_continuous=len(prepared.continuous_feature_names),
        categorical_cardinalities=prepared.categorical_cardinalities,
    )

    train_label_tensor = torch.tensor([sample["labels"] for sample in prepared.train_samples], dtype=torch.float32)
    sampler = build_multilabel_weighted_sampler(train_label_tensor)

    train_loader = create_data_loader(
        prepared.train_samples,
        tokenizer_name=config.text_model_name,
        max_length=config.text_max_length,
        batch_size=config.batch_size,
        sampler=sampler,
    )
    val_loader = create_data_loader(
        prepared.val_samples,
        tokenizer_name=config.text_model_name,
        max_length=config.text_max_length,
        batch_size=config.batch_size,
    )

    model = ClinicalMultiModalModel(config=config, load_pretrained_text_encoder=True)
    history = train_model(model, train_loader, val_loader, config)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    criterion = torch.nn.BCEWithLogitsLoss()
    final_metrics = evaluate_model(
        model=model.to(device),
        data_loader=val_loader,
        criterion=criterion,
        device=device,
        threshold=config.prediction_threshold,
    )

    metadata = {
        "continuous_feature_names": prepared.continuous_feature_names,
        "categorical_feature_names": prepared.categorical_feature_names,
        "categorical_cardinalities": prepared.categorical_cardinalities,
        "label_to_index": prepared.label_artifacts.label_to_index,
        "label_to_name": prepared.label_artifacts.label_to_name,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    save_training_artifacts(args.output_dir, model, config, history, final_metrics)

    print("Training complete.")
    print(json.dumps(final_metrics, indent=2))


if __name__ == "__main__":
    main()
