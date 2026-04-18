"""
Multi-modal rare disease prediction pipeline.

This module combines:
- Tabular lab/vital-sign features via an MLP encoder
- Clinical text via a Transformer encoder
- Late fusion for multi-label rare disease classification

Dependencies:
- torch
- transformers
- scikit-learn
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import average_precision_score, f1_score, precision_score, recall_score
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from transformers import AutoModel, AutoTokenizer, BertConfig, BertModel


def set_seed(seed: int = 42) -> None:
    torch.manual_seed(seed)
    np.random.seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


@dataclass
class TrainingConfig:
    num_labels: int
    num_continuous_features: int
    categorical_cardinalities: Sequence[int]
    text_model_name: str = "emilyalsentzer/Bio_ClinicalBERT"
    text_max_length: int = 256
    tabular_hidden_dims: Sequence[int] = (128, 64)
    fusion_hidden_dims: Sequence[int] = (256, 128)
    categorical_embedding_dim: int = 16
    text_dropout: float = 0.1
    fusion_dropout: float = 0.3
    learning_rate: float = 2e-5
    weight_decay: float = 1e-4
    batch_size: int = 8
    epochs: int = 10
    focal_alpha: float = 0.75
    focal_gamma: float = 2.0
    prediction_threshold: float = 0.5


class LabReportDataset(Dataset):
    """
    Expected sample format:
    {
        "continuous": [float, ...],
        "categorical": [int, ...],
        "text": "clinical note",
        "labels": [0/1, ...]
    }
    """

    def __init__(self, samples: Sequence[Dict[str, Any]]) -> None:
        self.samples = list(samples)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> Dict[str, Any]:
        sample = self.samples[index]
        return {
            "continuous": torch.tensor(sample["continuous"], dtype=torch.float32),
            "categorical": torch.tensor(sample["categorical"], dtype=torch.long),
            "text": str(sample["text"]),
            "labels": torch.tensor(sample["labels"], dtype=torch.float32),
        }


class ClinicalBatchCollator:
    def __init__(self, tokenizer_name: str, max_length: int = 256) -> None:
        self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
        self.max_length = max_length

    def __call__(self, batch: Sequence[Dict[str, Any]]) -> Dict[str, torch.Tensor]:
        texts = [item["text"] for item in batch]
        tokenized = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )
        return {
            "continuous": torch.stack([item["continuous"] for item in batch]),
            "categorical": torch.stack([item["categorical"] for item in batch]),
            "labels": torch.stack([item["labels"] for item in batch]),
            "input_ids": tokenized["input_ids"],
            "attention_mask": tokenized["attention_mask"],
        }


class MLPBlock(nn.Module):
    def __init__(self, in_dim: int, out_dim: int, dropout: float) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Linear(in_dim, out_dim),
            nn.BatchNorm1d(out_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class TabularEncoder(nn.Module):
    def __init__(
        self,
        num_continuous_features: int,
        categorical_cardinalities: Sequence[int],
        embedding_dim: int = 16,
        hidden_dims: Sequence[int] = (128, 64),
        dropout: float = 0.2,
    ) -> None:
        super().__init__()
        self.has_categorical = len(categorical_cardinalities) > 0
        self.embedding_layers = nn.ModuleList(
            [nn.Embedding(cardinality, embedding_dim) for cardinality in categorical_cardinalities]
        )
        cat_dim = len(categorical_cardinalities) * embedding_dim
        input_dim = num_continuous_features + cat_dim

        layers: List[nn.Module] = []
        current_dim = input_dim
        for hidden_dim in hidden_dims:
            layers.append(MLPBlock(current_dim, hidden_dim, dropout))
            current_dim = hidden_dim

        self.encoder = nn.Sequential(*layers)
        self.output_dim = current_dim

    def forward(
        self, continuous_features: torch.Tensor, categorical_features: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        features = [continuous_features]
        if self.has_categorical and categorical_features is not None:
            embeddings = [
                embedding_layer(categorical_features[:, idx])
                for idx, embedding_layer in enumerate(self.embedding_layers)
            ]
            features.append(torch.cat(embeddings, dim=1))

        x = torch.cat(features, dim=1)
        return self.encoder(x)


class ClinicalTextEncoder(nn.Module):
    def __init__(
        self,
        model_name: str,
        dropout: float = 0.1,
        load_pretrained: bool = True,
        hidden_size_override: int = 256,
        num_hidden_layers_override: int = 2,
        num_attention_heads_override: int = 4,
        intermediate_size_override: int = 512,
    ) -> None:
        super().__init__()
        if load_pretrained:
            self.transformer = AutoModel.from_pretrained(model_name)
        else:
            config = BertConfig(
                vocab_size=30522,
                hidden_size=hidden_size_override,
                num_hidden_layers=num_hidden_layers_override,
                num_attention_heads=num_attention_heads_override,
                intermediate_size=intermediate_size_override,
                max_position_embeddings=512,
            )
            self.transformer = BertModel(config)

        self.dropout = nn.Dropout(dropout)
        self.output_dim = self.transformer.config.hidden_size

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        outputs = self.transformer(input_ids=input_ids, attention_mask=attention_mask)
        cls_embedding = outputs.last_hidden_state[:, 0, :]
        return self.dropout(cls_embedding)


class ClinicalMultiModalModel(nn.Module):
    def __init__(self, config: TrainingConfig, load_pretrained_text_encoder: bool = True) -> None:
        super().__init__()
        self.tabular_encoder = TabularEncoder(
            num_continuous_features=config.num_continuous_features,
            categorical_cardinalities=config.categorical_cardinalities,
            embedding_dim=config.categorical_embedding_dim,
            hidden_dims=config.tabular_hidden_dims,
            dropout=config.fusion_dropout,
        )
        self.text_encoder = ClinicalTextEncoder(
            model_name=config.text_model_name,
            dropout=config.text_dropout,
            load_pretrained=load_pretrained_text_encoder,
        )

        fusion_input_dim = self.tabular_encoder.output_dim + self.text_encoder.output_dim
        fusion_layers: List[nn.Module] = []
        current_dim = fusion_input_dim
        for hidden_dim in config.fusion_hidden_dims:
            fusion_layers.append(MLPBlock(current_dim, hidden_dim, config.fusion_dropout))
            current_dim = hidden_dim

        self.fusion_network = nn.Sequential(*fusion_layers)
        self.classifier = nn.Linear(current_dim, config.num_labels)

    def forward(
        self,
        continuous_features: torch.Tensor,
        categorical_features: torch.Tensor,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.Tensor:
        tabular_repr = self.tabular_encoder(continuous_features, categorical_features)
        text_repr = self.text_encoder(input_ids, attention_mask)
        fused = torch.cat([tabular_repr, text_repr], dim=1)
        fused = self.fusion_network(fused)
        return self.classifier(fused)


class FocalBinaryCrossEntropy(nn.Module):
    def __init__(
        self,
        alpha: float = 0.75,
        gamma: float = 2.0,
        pos_weight: Optional[torch.Tensor] = None,
        reduction: str = "mean",
    ) -> None:
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.register_buffer("pos_weight", pos_weight if pos_weight is not None else None)
        self.reduction = reduction

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        bce = nn.functional.binary_cross_entropy_with_logits(
            logits, targets, reduction="none", pos_weight=self.pos_weight
        )
        probs = torch.sigmoid(logits)
        pt = torch.where(targets == 1, probs, 1 - probs)
        alpha_t = torch.where(targets == 1, self.alpha, 1 - self.alpha)
        focal_term = alpha_t * torch.pow(1 - pt, self.gamma)
        loss = focal_term * bce

        if self.reduction == "sum":
            return loss.sum()
        if self.reduction == "none":
            return loss
        return loss.mean()


def compute_positive_class_weights(labels: torch.Tensor, eps: float = 1e-6) -> torch.Tensor:
    positives = labels.sum(dim=0)
    negatives = labels.shape[0] - positives
    return negatives / (positives + eps)


def build_multilabel_weighted_sampler(labels: torch.Tensor) -> WeightedRandomSampler:
    """
    Oversampling strategy for imbalanced multi-label data.
    Samples with rarer positive labels receive larger weights.
    """

    class_counts = labels.sum(dim=0).clamp(min=1.0)
    inverse_freq = 1.0 / class_counts
    sample_weights = (labels * inverse_freq.unsqueeze(0)).sum(dim=1)
    no_positive_mask = labels.sum(dim=1) == 0
    if no_positive_mask.any():
        sample_weights[no_positive_mask] = sample_weights[~no_positive_mask].mean().clamp(min=1.0)
    sample_weights = sample_weights.clamp(min=1e-3)

    return WeightedRandomSampler(
        weights=sample_weights.double(),
        num_samples=len(sample_weights),
        replacement=True,
    )


def move_batch_to_device(batch: Dict[str, torch.Tensor], device: torch.device) -> Dict[str, torch.Tensor]:
    return {key: value.to(device) for key, value in batch.items()}


@torch.no_grad()
def evaluate_model(
    model: nn.Module,
    data_loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    threshold: float = 0.5,
) -> Dict[str, float]:
    model.eval()
    losses: List[float] = []
    all_targets: List[np.ndarray] = []
    all_probabilities: List[np.ndarray] = []

    for batch in data_loader:
        batch = move_batch_to_device(batch, device)
        logits = model(
            continuous_features=batch["continuous"],
            categorical_features=batch["categorical"],
            input_ids=batch["input_ids"],
            attention_mask=batch["attention_mask"],
        )
        loss = criterion(logits, batch["labels"])
        probs = torch.sigmoid(logits)

        losses.append(loss.item())
        all_targets.append(batch["labels"].cpu().numpy())
        all_probabilities.append(probs.cpu().numpy())

    y_true = np.vstack(all_targets)
    y_prob = np.vstack(all_probabilities)
    y_pred = (y_prob >= threshold).astype(np.float32)

    metrics = {
        "loss": float(np.mean(losses)),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "macro_precision": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
    }

    try:
        metrics["macro_pr_auc"] = float(average_precision_score(y_true, y_prob, average="macro"))
    except ValueError:
        metrics["macro_pr_auc"] = 0.0

    return metrics


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    config: TrainingConfig,
    device: Optional[torch.device] = None,
) -> Dict[str, List[float]]:
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    train_labels = []
    for batch in train_loader:
        train_labels.append(batch["labels"])
    label_tensor = torch.cat(train_labels, dim=0)
    pos_weight = compute_positive_class_weights(label_tensor).to(device)

    criterion = FocalBinaryCrossEntropy(
        alpha=config.focal_alpha,
        gamma=config.focal_gamma,
        pos_weight=pos_weight,
    )
    optimizer = AdamW(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)
    scheduler = ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=2)

    history: Dict[str, List[float]] = {
        "train_loss": [],
        "val_loss": [],
        "val_macro_f1": [],
        "val_macro_pr_auc": [],
        "val_macro_recall": [],
    }

    for epoch in range(config.epochs):
        model.train()
        epoch_losses: List[float] = []

        for batch in train_loader:
            batch = move_batch_to_device(batch, device)
            optimizer.zero_grad(set_to_none=True)

            logits = model(
                continuous_features=batch["continuous"],
                categorical_features=batch["categorical"],
                input_ids=batch["input_ids"],
                attention_mask=batch["attention_mask"],
            )
            loss = criterion(logits, batch["labels"])
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            epoch_losses.append(loss.item())

        val_metrics = evaluate_model(
            model=model,
            data_loader=val_loader,
            criterion=criterion,
            device=device,
            threshold=config.prediction_threshold,
        )
        scheduler.step(val_metrics["macro_f1"])

        history["train_loss"].append(float(np.mean(epoch_losses)))
        history["val_loss"].append(val_metrics["loss"])
        history["val_macro_f1"].append(val_metrics["macro_f1"])
        history["val_macro_pr_auc"].append(val_metrics["macro_pr_auc"])
        history["val_macro_recall"].append(val_metrics["macro_recall"])

        current_lr = optimizer.param_groups[0]["lr"]
        print(
            f"Epoch {epoch + 1}/{config.epochs} | "
            f"train_loss={history['train_loss'][-1]:.4f} | "
            f"val_loss={val_metrics['loss']:.4f} | "
            f"macro_f1={val_metrics['macro_f1']:.4f} | "
            f"macro_pr_auc={val_metrics['macro_pr_auc']:.4f} | "
            f"macro_recall={val_metrics['macro_recall']:.4f} | "
            f"lr={current_lr:.2e}"
        )

    return history


def create_data_loader(
    samples: Sequence[Dict[str, Any]],
    tokenizer_name: str,
    max_length: int,
    batch_size: int,
    shuffle: bool = False,
    sampler: Optional[WeightedRandomSampler] = None,
) -> DataLoader:
    dataset = LabReportDataset(samples)
    collator = ClinicalBatchCollator(tokenizer_name=tokenizer_name, max_length=max_length)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle if sampler is None else False,
        sampler=sampler,
        collate_fn=collator,
    )


def example_usage() -> None:
    """
    Demonstrates how to wire the pipeline for real training data.
    Replace the sample records with your actual patient-lab dataset.
    """

    config = TrainingConfig(
        num_labels=4,
        num_continuous_features=6,
        categorical_cardinalities=[3, 5, 4],
        epochs=3,
        batch_size=4,
    )

    train_samples = [
        {
            "continuous": [4.7, 13.2, 92.0, 120.0, 78.0, 36.7],
            "categorical": [1, 2, 0],
            "text": "Patient presents with persistent fatigue, elevated inflammatory markers, and abnormal liver enzymes.",
            "labels": [1, 0, 1, 0],
        },
        {
            "continuous": [3.9, 10.8, 101.0, 95.0, 64.0, 37.2],
            "categorical": [0, 1, 2],
            "text": "Physician notes pancytopenia with concern for marrow suppression and autoimmune overlap.",
            "labels": [0, 1, 0, 0],
        },
        {
            "continuous": [5.3, 15.0, 87.0, 132.0, 82.0, 36.6],
            "categorical": [2, 4, 1],
            "text": "Clinical summary notes intermittent fevers, rash, and elevated ferritin suggesting inflammatory syndrome.",
            "labels": [0, 0, 1, 1],
        },
        {
            "continuous": [4.1, 11.3, 98.5, 110.0, 70.0, 37.0],
            "categorical": [1, 0, 3],
            "text": "Lab report suggests renal involvement with proteinuria and complement abnormalities.",
            "labels": [1, 1, 0, 0],
        },
    ]
    val_samples = train_samples[:2]

    train_label_tensor = torch.tensor([sample["labels"] for sample in train_samples], dtype=torch.float32)
    sampler = build_multilabel_weighted_sampler(train_label_tensor)

    train_loader = create_data_loader(
        train_samples,
        tokenizer_name=config.text_model_name,
        max_length=config.text_max_length,
        batch_size=config.batch_size,
        sampler=sampler,
    )
    val_loader = create_data_loader(
        val_samples,
        tokenizer_name=config.text_model_name,
        max_length=config.text_max_length,
        batch_size=config.batch_size,
    )

    model = ClinicalMultiModalModel(config=config, load_pretrained_text_encoder=True)
    train_model(model=model, train_loader=train_loader, val_loader=val_loader, config=config)


def smoke_test_forward_pass() -> None:
    """
    Offline architecture check using random tensors.
    This avoids external model downloads while still verifying the end-to-end forward path.
    """

    config = TrainingConfig(
        num_labels=5,
        num_continuous_features=10,
        categorical_cardinalities=[4, 3, 6],
        text_model_name="emilyalsentzer/Bio_ClinicalBERT",
        batch_size=4,
    )
    model = ClinicalMultiModalModel(config=config, load_pretrained_text_encoder=False)
    model.eval()

    batch_size = 4
    seq_len = 32
    continuous = torch.randn(batch_size, config.num_continuous_features)
    categorical = torch.tensor(
        [
            [1, 0, 4],
            [2, 1, 5],
            [0, 2, 3],
            [3, 1, 2],
        ],
        dtype=torch.long,
    )
    input_ids = torch.randint(0, 30522, (batch_size, seq_len), dtype=torch.long)
    attention_mask = torch.ones(batch_size, seq_len, dtype=torch.long)

    with torch.no_grad():
        logits = model(
            continuous_features=continuous,
            categorical_features=categorical,
            input_ids=input_ids,
            attention_mask=attention_mask,
        )
        probabilities = torch.sigmoid(logits)

    print("Smoke test passed.")
    print(f"Logits shape: {tuple(logits.shape)}")
    print(f"Probabilities shape: {tuple(probabilities.shape)}")


if __name__ == "__main__":
    set_seed(42)
    smoke_test_forward_pass()
    # For real training, uncomment the next line in an environment with transformers model access.
    # example_usage()
