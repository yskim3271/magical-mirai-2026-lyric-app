# Torii Segmentation Harness

This is an offline asset-generation harness for the Bentenjima-style torii layer.
The web app should keep loading static PNG assets; segmentation models do not ship
in the browser bundle.

## Default Run

```powershell
python tools/torii-segmentation/generate_torii_assets.py
```

Inputs:

- `public/assets/landmarks/segmentation-source/torii-separation-source.png`
- fallback: `public/assets/landmarks/torii-bentenjima-source-crop.png`

Outputs:

- `public/assets/landmarks/timecycle/torii-alpha.png`
- `public/assets/landmarks/timecycle/torii-day.png`
- `public/assets/landmarks/timecycle/torii-sunset.png`
- `public/assets/landmarks/timecycle/torii-twilight.png`
- `public/assets/landmarks/timecycle/torii-night.png`
- `public/assets/landmarks/timecycle/debug-mask-overlay.png`
- `public/assets/landmarks/timecycle/debug-checker.png`

## Engine

The default engine is Ultralytics SAM with a box prompt computed from the
high-contrast separation image. It then removes chroma green holes inside the
torii before alpha refinement.

```powershell
python tools/torii-segmentation/generate_torii_assets.py --engine sam
```

The local SAM checkpoint is expected at:

- `tools/torii-segmentation/models/sam_b.pt`

If that file is missing, Ultralytics may download `sam_b.pt` into the current
working directory on the first run. Move it into the path above to keep the
workspace layout stable.

Fallback engines:

```powershell
python tools/torii-segmentation/generate_torii_assets.py --engine chroma
python tools/torii-segmentation/generate_torii_assets.py --engine grabcut
```

## Model Adapter

For newer segmentation systems such as SAM 3, Grounded SAM, or a local detector
+ matting pipeline, use `--external-mask-command`.

The command receives `{input}` and `{mask}` placeholders:

```powershell
python tools/torii-segmentation/generate_torii_assets.py `
  --external-mask-command "python path/to/sam3_torii_mask.py --input {input} --output {mask}"
```

The external command must write a grayscale PNG mask where white is foreground.
The harness will still do the shared pivot, alpha refinement, color bleeding, and
time-of-day asset grading.

## Relight Sample Transfer

After generating relit torii references with an image model, transfer only their
lighting/color into the canonical torii alpha:

```powershell
python tools/torii-segmentation/apply_relight_samples.py
```

Inputs:

- `reference/torii-relight/relight-day.png`
- `reference/torii-relight/relight-sunset.png`
- `reference/torii-relight/relight-twilight.png`
- `reference/torii-relight/relight-night.png`
- `public/assets/landmarks/timecycle/torii-alpha.png`

Outputs overwrite:

- `public/assets/landmarks/timecycle/torii-day.png`
- `public/assets/landmarks/timecycle/torii-sunset.png`
- `public/assets/landmarks/timecycle/torii-twilight.png`
- `public/assets/landmarks/timecycle/torii-night.png`

The script keeps the canonical alpha and canvas size, uses SAM only to crop the
reference torii, and writes debug assets to `reference/torii-relight/transferred-debug`.
The previous static torii PNGs are copied once to
`reference/torii-relight/pre-transfer-assets`.
