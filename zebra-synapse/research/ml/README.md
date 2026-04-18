# Multimodal Rare Disease Training

Status: research-only archive. This directory is retained for provenance and experimentation. It is not part of product runtime, deployment, or required build paths for Zebra Synapse.

Canonical product docs live in [`../../README.md`](../../README.md). Research outputs intended for reuse are archived in [`../exports/`](../exports).

## Scope

This package trains a multimodal multi-label classifier over:

- structured MIMIC-IV variables
- unstructured MIMIC-IV notes
- rare-disease labels derived from an explicit ICD-to-rare-disease mapping

## Data Sources

Required source files:

- `patients.csv.gz`
- `admissions.csv.gz`
- `diagnoses_icd.csv.gz`
- `labevents.csv.gz`
- `discharge.csv.gz` or another compatible note table
- `icd_to_rare_disease.csv`

The mapping file is user-supplied. This project does not invent rare-disease labels.

## Reproduction

Install:

```powershell
pip install -r zebra-synapse/research/ml/requirements.txt
```

Train:

```powershell
python zebra-synapse\research\ml\train_mimic.py `
  --patients-path E:\mimic\hosp\patients.csv.gz `
  --admissions-path E:\mimic\hosp\admissions.csv.gz `
  --diagnoses-icd-path E:\mimic\hosp\diagnoses_icd.csv.gz `
  --labevents-path E:\mimic\hosp\labevents.csv.gz `
  --notes-path E:\mimic-note\note\discharge.csv.gz `
  --mapping-path E:\mappings\icd_to_rare_disease.csv `
  --output-dir E:\runs\rare-disease-v1 `
  --save-prepared-data
```

## Outputs

- training artifacts such as `model.pt`, `metrics.json`, and `history.json`
- metadata files for labels and features
- runtime manifest archive in [`../exports/rare_disease_screen_v1.json`](../exports/rare_disease_screen_v1.json)

## Boundary

- Non-deployment dependency
- Non-runtime dependency
- Keep research artifacts out of `src/`, `public/`, and `supabase/`
