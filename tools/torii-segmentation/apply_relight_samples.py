from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from generate_torii_assets import DEFAULT_OUTPUT_DIR, DEFAULT_SAM_MODEL, OUTPUT_SIZE, bleed_rgb


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REFERENCE_DIR = ROOT / "reference/torii-relight"
DEFAULT_BACKUP_DIR = DEFAULT_REFERENCE_DIR / "pre-transfer-assets"
DEFAULT_DEBUG_DIR = DEFAULT_REFERENCE_DIR / "transferred-debug"

RELIGHT_SAMPLES = {
    "day": DEFAULT_REFERENCE_DIR / "relight-day.png",
    "sunset": DEFAULT_REFERENCE_DIR / "relight-sunset.png",
    "twilight": DEFAULT_REFERENCE_DIR / "relight-twilight.png",
    "night": DEFAULT_REFERENCE_DIR / "relight-night.png",
}

# Rough boxes for the current generated reference crops. SAM refines these to the
# actual torii mask, so the boxes only need to cover the whole gate.
SAM_PROMPT_BOXES = {
    "day": (430, 450, 1160, 1040),
    "sunset": (480, 420, 1300, 1100),
    "twilight": (380, 520, 1230, 1250),
    "night": (430, 440, 1280, 1220),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Transfer lighting from relit torii references onto the canonical torii alpha."
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--reference-dir", type=Path, default=DEFAULT_REFERENCE_DIR)
    parser.add_argument("--debug-dir", type=Path, default=DEFAULT_DEBUG_DIR)
    parser.add_argument("--alpha", type=Path, default=DEFAULT_OUTPUT_DIR / "torii-alpha.png")
    parser.add_argument(
        "--sample-weight",
        type=float,
        default=0.55,
        help="How strongly to use the relit sample color over the previous torii asset.",
    )
    parser.add_argument(
        "--lighting-blur",
        type=float,
        default=2.8,
        help="Gaussian blur sigma applied to the transferred sample before blending, reducing shape mismatch artifacts.",
    )
    parser.add_argument("--no-backup", action="store_true", help="Do not copy current torii assets before overwriting.")
    return parser.parse_args()


def sam_mask(input_path: Path, box: tuple[int, int, int, int]) -> np.ndarray:
    try:
        from ultralytics import SAM
    except ImportError as error:
        raise RuntimeError("Ultralytics is required. Run: python -m pip install ultralytics") from error

    model_path = DEFAULT_SAM_MODEL if DEFAULT_SAM_MODEL.exists() else "sam_b.pt"
    model = SAM(str(model_path))
    results = model(str(input_path), bboxes=[list(box)], verbose=False)
    if not results or results[0].masks is None:
        raise RuntimeError(f"SAM did not return a mask for {input_path}")

    rgb = Image.open(input_path).convert("RGB")
    w, h = rgb.size
    mask = results[0].masks.data[0].cpu().numpy().astype(np.uint8)
    if mask.shape != (h, w):
        mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    return mask


def padded_bbox(mask: np.ndarray, pad: int = 10) -> tuple[int, int, int, int]:
    bbox = Image.fromarray((mask * 255).astype(np.uint8)).getbbox()
    if bbox is None:
        raise RuntimeError("Cannot find foreground bbox")
    h, w = mask.shape
    x0, y0, x1, y1 = bbox
    return max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)


def fill_from_nearest_object(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    object_pixels = mask > 0
    if not np.any(object_pixels):
        return rgb.copy()

    try:
        from scipy import ndimage

        _, indices = ndimage.distance_transform_edt(~object_pixels, return_indices=True)
        return rgb[indices[0], indices[1]]
    except ImportError:
        filled = rgb.copy()
        inpaint_mask = np.where(object_pixels, 0, 255).astype(np.uint8)
        return cv2.inpaint(filled, inpaint_mask, 7, cv2.INPAINT_TELEA)


def resize_to_target_bbox(source_rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    bbox = Image.fromarray(alpha).getbbox()
    if bbox is None:
        raise RuntimeError("Canonical alpha is empty")

    target_w = bbox[2] - bbox[0]
    target_h = bbox[3] - bbox[1]
    resized = Image.fromarray(source_rgb).resize((target_w, target_h), Image.Resampling.LANCZOS)
    canvas_w, canvas_h = OUTPUT_SIZE
    canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
    canvas[bbox[1]:bbox[3], bbox[0]:bbox[2]] = np.array(resized)
    return canvas


def transfer_mode(
    mode: str,
    sample_path: Path,
    alpha: np.ndarray,
    output_dir: Path,
    debug_dir: Path,
    sample_weight: float,
    lighting_blur: float,
) -> dict:
    rgb = np.array(Image.open(sample_path).convert("RGB"))
    box = SAM_PROMPT_BOXES[mode]
    mask = sam_mask(sample_path, box)
    x0, y0, x1, y1 = padded_bbox(mask, pad=8)

    crop_rgb = rgb[y0:y1, x0:x1]
    crop_mask = mask[y0:y1, x0:x1]
    filled_crop = fill_from_nearest_object(crop_rgb, crop_mask)
    transferred = resize_to_target_bbox(filled_crop, alpha)
    if lighting_blur > 0:
        transferred = cv2.GaussianBlur(transferred, (0, 0), lighting_blur)

    previous_path = output_dir / f"torii-{mode}.png"
    if previous_path.exists():
        previous = np.array(Image.open(previous_path).convert("RGBA"))[:, :, :3]
        weight = np.clip(sample_weight, 0.0, 1.0)
        transferred = np.clip(
            transferred.astype(np.float32) * weight + previous.astype(np.float32) * (1.0 - weight),
            0,
            255,
        ).astype(np.uint8)

    transferred = bleed_rgb(transferred, alpha)
    rgba = np.dstack([transferred, alpha])
    Image.fromarray(rgba, "RGBA").save(output_dir / f"torii-{mode}.png")

    debug_rgba = np.dstack([crop_rgb, crop_mask * 255])
    Image.fromarray(debug_rgba, "RGBA").save(debug_dir / f"source-mask-{mode}.png")
    Image.fromarray(rgba, "RGBA").save(debug_dir / f"torii-{mode}.png")

    return {
        "mode": mode,
        "sample": str(sample_path),
        "source_bbox": (x0, y0, x1, y1),
        "output": str(output_dir / f"torii-{mode}.png"),
    }


def copy_backup(output_dir: Path, backup_dir: Path) -> None:
    backup_dir.mkdir(parents=True, exist_ok=True)
    for mode in RELIGHT_SAMPLES:
        source = output_dir / f"torii-{mode}.png"
        target = backup_dir / f"torii-{mode}.png"
        if source.exists() and not target.exists():
            shutil.copy2(source, target)


def write_debug_sheet(debug_dir: Path) -> None:
    items = [(mode, debug_dir / f"torii-{mode}.png") for mode in ("day", "sunset", "twilight", "night")]
    thumb_w, thumb_h = 337, 270
    label_h = 30
    sheet = Image.new("RGB", (thumb_w * 2, (thumb_h + label_h) * 2), (18, 24, 30))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 17)
    except OSError:
        font = ImageFont.load_default()

    for index, (mode, path) in enumerate(items):
        rgba = Image.open(path).convert("RGBA")
        checker = Image.new("RGB", rgba.size, (158, 158, 158))
        tile_draw = ImageDraw.Draw(checker)
        for y in range(0, rgba.height, 12):
            for x in range(0, rgba.width, 12):
                if ((x // 12) + (y // 12)) % 2 == 0:
                    tile_draw.rectangle([x, y, x + 11, y + 11], fill=(214, 214, 214))
        checker.paste(rgba, mask=rgba.getchannel("A"))

        col = index % 2
        row = index // 2
        px = col * thumb_w
        py = row * (thumb_h + label_h)
        draw.rectangle([px, py, px + thumb_w, py + label_h], fill=(26, 34, 42))
        draw.text((px + 12, py + 7), mode, fill=(235, 242, 248), font=font)
        sheet.paste(checker, (px, py + label_h))

    sheet.save(debug_dir / "relight-transfer-sheet.png", quality=92)


def main() -> None:
    args = parse_args()
    output_dir = args.output_dir
    debug_dir = args.debug_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    if not args.no_backup:
        copy_backup(output_dir, DEFAULT_BACKUP_DIR)

    alpha = np.array(Image.open(args.alpha).convert("L"))
    if alpha.shape != (OUTPUT_SIZE[1], OUTPUT_SIZE[0]):
        raise RuntimeError(f"Expected canonical alpha size {OUTPUT_SIZE}, got {Image.open(args.alpha).size}")

    results = []
    for mode in ("day", "sunset", "twilight", "night"):
        sample_path = args.reference_dir / f"relight-{mode}.png"
        if not sample_path.exists():
            raise FileNotFoundError(sample_path)
        results.append(
            transfer_mode(
                mode,
                sample_path,
                alpha,
                output_dir,
                debug_dir,
                args.sample_weight,
                args.lighting_blur,
            )
        )

    write_debug_sheet(debug_dir)
    print({
        "output_dir": str(output_dir),
        "debug_dir": str(debug_dir),
        "backup_dir": None if args.no_backup else str(DEFAULT_BACKUP_DIR),
        "results": results,
    })


if __name__ == "__main__":
    main()
