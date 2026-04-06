# Multimodal Rare Disease Training

This `ml/` package is an offline experimentation area. It is not part of the deployed Zebra Synapse patient or doctor portal runtime.

This package trains a multimodal multi-label classifier over:

- structured MIMIC-IV variables: age, admission demographics, selected lab values
- unstructured MIMIC-IV-Note text: discharge summaries or other note tables
- rare-disease labels derived from an explicit ICD-to-rare-disease mapping file

## Required source files

- `patients.csv.gz`
- `admissions.csv.gz`
- `diagnoses_icd.csv.gz`
- `labevents.csv.gz`
- `discharge.csv.gz` or another note table with `subject_id`, `hadm_id`, `text`
- `icd_to_rare_disease.csv`

## Mapping file schema

Minimum columns:

```csv
icd_code,icd_version,disease_id,disease_name
D761,10,MONDO:0018882,Hemophagocytic lymphohistiocytosis
M3214,10,MONDO:0019282,Systemic lupus erythematosus with organ involvement
```

Notes:

- `icd_code` is normalized by stripping periods and uppercasing.
- `disease_id` should be a stable concept ID, for example `MONDO:*` or `ORPHA:*`.
- This code does not invent rare-disease labels. It only trains on mappings you explicitly supply.

## Install

```powershell
pip install -r zebra-synapse/ml/requirements.txt
```

## Train

```powershell
python zebra-synapse\ml\train_mimic.py `
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

- `model.pt`: trained PyTorch weights
- `metrics.json`: final validation metrics
- `history.json`: epoch-by-epoch metrics
- `metadata.json`: feature names and label vocabulary
- `prepared/`: optional prepared JSON samples

## Assumptions

- Labels are encounter-level and derived from `diagnoses_icd`.
- Notes and labs are joined on `subject_id` and `hadm_id`.
- The default lab feature builder uses the top `64` most frequent `itemid`s and mean aggregation.
- Validation split is random. For a serious experiment, replace it with patient-level or iterative multilabel stratification.
