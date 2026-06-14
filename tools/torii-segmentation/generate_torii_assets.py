from __future__ import annotations

import argparse
import shlex
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SEPARATION_INPUT = ROOT / "public/assets/landmarks/segmentation-source/torii-separation-source.png"
DEFAULT_FALLBACK_INPUT = ROOT / "public/assets/landmarks/torii-bentenjima-source-crop.png"
DEFAULT_OUTPUT_DIR = ROOT / "public/assets/landmarks/timecycle"
DEFAULT_SAM_MODEL = Path(__file__).resolve().parent / "models/sam_b.pt"
OUTPUT_SIZE = (337, 270)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate aligned torii mask and timecycle PNG assets.")
    parser.add_argument("--input", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--engine", choices=("sam", "chroma", "grabcut"), default="sam")
    parser.add_argument(
        "--external-mask-command",
        default="",
        help="Optional command that writes a grayscale mask. Use {input} and {mask} placeholders.",
    )
    return parser.parse_args()


def default_input_path() -> Path:
    if DEFAULT_SEPARATION_INPUT.exists():
        return DEFAULT_SEPARATION_INPUT
    return DEFAULT_FALLBACK_INPUT


def red_seed(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum.reduce([r, g, b])
    mn = np.minimum.reduce([r, g, b])
    sat = mx - mn
    return ((r > 46) & (r > g * 1.12) & (r > b * 0.90) & (sat > 16)).astype(np.uint8)


def green_background(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    return (
        (g > 135)
        & (r < 120)
        & (b < 125)
        & (g > r * 1.35)
        & (g > b * 1.35)
    )


def chroma_mask(rgb: np.ndarray) -> np.ndarray:
    non_green = (~green_background(rgb)).astype(np.uint8)
    kernel3 = np.ones((3, 3), np.uint8)
    non_green = cv2.morphologyEx(non_green, cv2.MORPH_OPEN, kernel3, iterations=1)
    non_green = cv2.morphologyEx(non_green, cv2.MORPH_CLOSE, kernel3, iterations=1)
    return keep_largest_seeded_components(non_green, non_green, min_area=80)


def object_box_from_non_green(rgb: np.ndarray) -> list[int]:
    fg = chroma_mask(rgb)
    ys, xs = np.nonzero(fg)
    if len(xs) == 0:
      h, w, _ = rgb.shape
      return [0, 0, w - 1, h - 1]
    pad = 24
    h, w, _ = rgb.shape
    return [
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(w - 1, int(xs.max()) + pad),
        min(h - 1, int(ys.max()) + pad),
    ]


def sam_mask(rgb: np.ndarray, input_path: Path) -> np.ndarray:
    try:
        from ultralytics import SAM
    except ImportError as error:
        raise RuntimeError("Ultralytics is required for --engine sam. Run: python -m pip install ultralytics") from error

    box = object_box_from_non_green(rgb)
    model_path = DEFAULT_SAM_MODEL if DEFAULT_SAM_MODEL.exists() else "sam_b.pt"
    model = SAM(str(model_path))
    results = model(str(input_path), bboxes=[box], verbose=False)
    if not results or results[0].masks is None:
        raise RuntimeError("SAM did not return a mask")

    mask = results[0].masks.data[0].cpu().numpy().astype(np.uint8)
    if mask.shape != rgb.shape[:2]:
        mask = cv2.resize(mask, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_NEAREST)

    # SAM gives the outer object, while chroma key preserves holes between beams.
    mask = (mask & (~green_background(rgb)).astype(np.uint8)).astype(np.uint8)
    return keep_largest_seeded_components(mask, chroma_mask(rgb), min_area=80)


def keep_largest_seeded_components(mask: np.ndarray, seed: np.ndarray, min_area: int = 30) -> np.ndarray:
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    keep = np.zeros_like(mask, dtype=np.uint8)
    for label in range(1, num):
        area = stats[label, cv2.CC_STAT_AREA]
        component = labels == label
        if area >= min_area and np.any(component & (seed > 0)):
            keep[component] = 1
    return keep


def concrete_seed(rgb: np.ndarray, red_near: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    spread = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])
    grayish = spread < 54
    concrete = grayish & (r > 48) & (r < 190) & (g > 46) & (g < 190) & (b > 42) & (b < 185)
    return (concrete & (red_near > 0)).astype(np.uint8)


def torii_structure_prior(shape: tuple[int, int]) -> np.ndarray:
    h, w = shape
    prior = np.zeros((h, w), dtype=np.uint8)

    # Object-specific priors for this fixed crop. They recover dark beams and
    # thin support posts that color-only segmentation often drops.
    top_beam = np.array([
        [55, 36],
        [284, 36],
        [278, 60],
        [62, 64],
    ], dtype=np.int32)
    cv2.fillPoly(prior, [top_beam], 1)
    cv2.rectangle(prior, (66, 62), (271, 73), 1, -1)

    cv2.rectangle(prior, (58, 84), (282, 100), 1, -1)
    cv2.rectangle(prior, (51, 104), (290, 118), 1, -1)

    for rect in [
        (84, 71, 111, 205),
        (211, 71, 239, 205),
        (132, 65, 149, 104),
        (191, 65, 208, 104),
        (61, 166, 80, 228),
        (96, 173, 114, 228),
        (207, 166, 226, 228),
        (257, 173, 276, 228),
        (62, 209, 80, 238),
        (96, 212, 114, 238),
        (208, 209, 226, 238),
        (258, 212, 276, 238),
    ]:
        x0, y0, x1, y1 = rect
        cv2.rectangle(prior, (x0, y0), (x1, y1), 1, -1)

    for center in [(70, 165), (105, 172), (216, 165), (266, 172)]:
        cv2.ellipse(prior, center, (15, 7), 0, 0, 360, 1, -1)

    return prior


def build_grabcut_mask(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    red = red_seed(rgb)
    kernel3 = np.ones((3, 3), np.uint8)
    kernel9 = np.ones((9, 9), np.uint8)
    kernel17 = np.ones((17, 17), np.uint8)

    red_near = cv2.dilate(red, kernel17, iterations=1)
    concrete = concrete_seed(rgb, red_near)
    fg_seed = cv2.dilate(((red | concrete) > 0).astype(np.uint8), kernel3, iterations=1)

    mask = np.full((h, w), cv2.GC_PR_BGD, dtype=np.uint8)
    mask[fg_seed > 0] = cv2.GC_PR_FGD
    mask[red > 0] = cv2.GC_FGD

    # Sure background: crop edges and known gate openings.
    border = 10
    mask[:border, :] = cv2.GC_BGD
    mask[-border:, :] = cv2.GC_BGD
    mask[:, :border] = cv2.GC_BGD
    mask[:, -border:] = cv2.GC_BGD
    bg_rects = [
        (110, 102, 205, 193),
        (78, 75, 150, 93),
        (178, 75, 244, 93),
        (0, 0, w, 30),
        (0, 238, w, h),
    ]
    for x0, y0, x1, y1 in bg_rects:
        mask[max(0, y0):min(h, y1), max(0, x0):min(w, x1)] = cv2.GC_BGD

    # Probable foreground bands around the torii beams/posts, without filling openings.
    support = cv2.dilate(red, kernel9, iterations=1)
    mask[(support > 0) & (mask != cv2.GC_BGD)] = cv2.GC_PR_FGD

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, None, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_MASK)

    raw = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8)
    raw &= cv2.dilate((red | concrete).astype(np.uint8), np.ones((7, 7), np.uint8), iterations=1)

    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum.reduce([r, g, b])
    mn = np.minimum.reduce([r, g, b])
    sat = mx - mn
    prior_window = torii_structure_prior((h, w)) > 0
    close_to_red = cv2.dilate(red.astype(np.uint8), np.ones((13, 13), np.uint8), iterations=1) > 0
    structural_dark = (
        prior_window
        & close_to_red
        & (r > 28)
        & (r > g * 0.82)
        & (r > b * 0.70)
        & (sat > 8)
        & (mx < 166)
    ).astype(np.uint8)
    raw = ((raw | red | concrete | structural_dark) > 0).astype(np.uint8)

    # Keep components that touch the original foreground seed.
    keep = keep_largest_seeded_components(raw, fg_seed, min_area=18)

    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, kernel3, iterations=1)
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, kernel3, iterations=1)
    keep[int(h * 0.89):, :] = 0
    return keep


def run_external_mask(command_template: str, input_path: Path, output_path: Path) -> np.ndarray:
    command = command_template.format(input=str(input_path), mask=str(output_path))
    subprocess.run(shlex.split(command), check=True)
    mask = np.array(Image.open(output_path).convert("L"))
    return (mask > 127).astype(np.uint8)


def refine_alpha(binary: np.ndarray) -> np.ndarray:
    kernel3 = np.ones((3, 3), np.uint8)
    clean = cv2.morphologyEx(binary.astype(np.uint8), cv2.MORPH_OPEN, kernel3, iterations=1)
    clean = cv2.morphologyEx(clean, cv2.MORPH_CLOSE, kernel3, iterations=1)
    hard = (clean * 255).astype(np.uint8)
    blurred = cv2.GaussianBlur(hard, (0, 0), 0.62)
    alpha = np.where(blurred < 12, 0, np.clip((blurred.astype(np.float32) - 12) * 255 / 243, 0, 255))
    return alpha.astype(np.uint8)


def fit_to_output_canvas(rgb: np.ndarray, alpha: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    bbox = Image.fromarray(alpha).getbbox()
    if bbox is None:
        return rgb, alpha

    h, w = alpha.shape
    pad = 18
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(w, bbox[2] + pad)
    y1 = min(h, bbox[3] + pad)
    crop_rgb = rgb[y0:y1, x0:x1]
    crop_alpha = alpha[y0:y1, x0:x1]

    canvas_w, canvas_h = OUTPUT_SIZE
    target_h = int(canvas_h * 0.84)
    scale = target_h / max(1, crop_alpha.shape[0])
    target_w = int(round(crop_alpha.shape[1] * scale))
    if target_w > int(canvas_w * 0.90):
        scale = int(canvas_w * 0.90) / max(1, crop_alpha.shape[1])
        target_w = int(round(crop_alpha.shape[1] * scale))
        target_h = int(round(crop_alpha.shape[0] * scale))

    rgb_img = Image.fromarray(crop_rgb).resize((target_w, target_h), Image.Resampling.LANCZOS)
    alpha_img = Image.fromarray(crop_alpha).resize((target_w, target_h), Image.Resampling.LANCZOS)

    out_rgb = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
    out_alpha = np.zeros((canvas_h, canvas_w), dtype=np.uint8)
    left = (canvas_w - target_w) // 2
    top = max(8, int(canvas_h * 0.07))
    out_rgb[top:top + target_h, left:left + target_w] = np.array(rgb_img)
    out_alpha[top:top + target_h, left:left + target_w] = np.array(alpha_img)
    return out_rgb, out_alpha


def bleed_rgb(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    color = rgb.copy()
    object_pixels = alpha > 8
    if not np.any(object_pixels):
        return color

    # Replace obvious background colors inside the alpha with nearby object material.
    red = red_seed(rgb) > 0
    concrete = concrete_seed(rgb, cv2.dilate(red.astype(np.uint8), np.ones((17, 17), np.uint8))) > 0
    good = object_pixels & (red | concrete)
    if not np.any(good):
        good = object_pixels

    filled = color.copy()
    source = np.where(good, 0, 255).astype(np.uint8)
    _, labels = cv2.distanceTransformWithLabels(source, cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(good)
    label_to_coord = np.zeros((len(xs) + 1, 2), dtype=np.int32)
    for index, (x, y) in enumerate(zip(xs, ys), start=1):
        if index < label_to_coord.shape[0]:
            label_to_coord[index] = (y, x)

    bad = object_pixels & ~good
    by, bx = np.nonzero(bad)
    h, _ = alpha.shape
    for y, x in zip(by, bx):
        label = labels[y, x]
        if 0 < label < label_to_coord.shape[0]:
            sy, sx = label_to_coord[label]
            candidate = color[sy, sx]
        else:
            candidate = np.array([148, 38, 40], dtype=np.uint8)

        # If nearest-neighbor repair still points at sky/water/mountain color,
        # synthesize torii material instead of preserving a background fringe.
        cr, cg, cb = candidate.astype(np.int16)
        looks_like_object = (cr > 42 and cr > cg * 1.05 and cr > cb * 0.86) or (abs(cr - cg) < 55 and abs(cg - cb) < 55 and y > h * 0.68)
        if looks_like_object:
            filled[y, x] = candidate
        elif y > h * 0.72:
            filled[y, x] = (132, 124, 112)
        elif y < h * 0.30:
            filled[y, x] = (92, 24, 32)
        else:
            filled[y, x] = (138, 34, 39)

    # Bleed edge color into fully transparent pixels to avoid linear-filter halos.
    rgb_bleed = filled.copy()
    edge_source = np.where(object_pixels, 0, 255).astype(np.uint8)
    _, edge_labels = cv2.distanceTransformWithLabels(edge_source, cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
    obj_ys, obj_xs = np.nonzero(object_pixels)
    edge_map = np.zeros((len(obj_xs) + 1, 2), dtype=np.int32)
    for index, (x, y) in enumerate(zip(obj_xs, obj_ys), start=1):
        if index < edge_map.shape[0]:
            edge_map[index] = (y, x)
    ty, tx = np.nonzero(~object_pixels)
    for y, x in zip(ty, tx):
        label = edge_labels[y, x]
        if 0 < label < edge_map.shape[0]:
            sy, sx = edge_map[label]
            rgb_bleed[y, x] = filled[sy, sx]
    return rgb_bleed


def grade(rgb: np.ndarray, mode: str) -> np.ndarray:
    rgbf = rgb.astype(np.float32)
    lum = rgbf[:, :, 0] * 0.2126 + rgbf[:, :, 1] * 0.7152 + rgbf[:, :, 2] * 0.0722
    lum = lum[:, :, None]
    if mode == "day":
        out = rgbf * np.array([0.80, 0.77, 0.78]) + lum * np.array([0.08, 0.06, 0.05]) + np.array([8, 5, 4])
    elif mode == "sunset":
        out = rgbf * np.array([0.98, 0.68, 0.52]) + lum * np.array([0.08, 0.08, 0.04]) + np.array([24, 12, 2])
    elif mode == "twilight":
        out = rgbf * np.array([0.48, 0.42, 0.68]) + lum * np.array([0.18, 0.15, 0.20]) + np.array([8, 5, 22])
    elif mode == "night":
        out = rgbf * np.array([0.17, 0.16, 0.30]) + lum * np.array([0.08, 0.10, 0.14]) + np.array([4, 7, 18])
    else:
        raise ValueError(f"Unknown grade mode: {mode}")
    return np.clip(out, 0, 255).astype(np.uint8)


def write_debug(rgb: np.ndarray, alpha: np.ndarray, output_dir: Path) -> None:
    overlay = rgb.copy()
    edge = cv2.Canny(alpha, 24, 96) > 0
    overlay[edge] = (72, 255, 230)
    Image.fromarray(overlay).save(output_dir / "debug-mask-overlay.png")

    h, w = alpha.shape
    yy, xx = np.indices((h, w))
    checker = np.where(((xx // 12 + yy // 12) % 2)[:, :, None] == 0, 214, 154).astype(np.uint8)
    checker = np.repeat(checker, 3, axis=2)
    comp = (rgb.astype(np.float32) * (alpha[:, :, None] / 255.0) + checker * (1.0 - alpha[:, :, None] / 255.0))
    Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8)).save(output_dir / "debug-checker.png")


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    input_path = args.input or default_input_path()
    source = Image.open(input_path).convert("RGB")
    rgb = np.array(source)

    raw_mask_path = args.output_dir / "debug-external-mask.png"
    if args.external_mask_command:
        binary = run_external_mask(args.external_mask_command, input_path, raw_mask_path)
    elif args.engine == "sam":
        binary = sam_mask(rgb, input_path)
    elif args.engine == "chroma":
        binary = chroma_mask(rgb)
    else:
        binary = build_grabcut_mask(rgb)

    alpha = refine_alpha(binary)
    rgb_bleed = bleed_rgb(rgb, alpha)
    rgb_bleed, alpha = fit_to_output_canvas(rgb_bleed, alpha)

    Image.fromarray((binary * 255).astype(np.uint8)).save(args.output_dir / "debug-mask-raw.png")
    Image.fromarray(alpha).save(args.output_dir / "torii-alpha.png")
    write_debug(rgb_bleed, alpha, args.output_dir)

    for mode in ("day", "sunset", "twilight", "night"):
        rgba = np.dstack([grade(rgb_bleed, mode), alpha])
        Image.fromarray(rgba, "RGBA").save(args.output_dir / f"torii-{mode}.png")

    bbox = Image.fromarray(alpha).getbbox()
    print({
        "input": str(input_path),
        "engine": args.engine if not args.external_mask_command else "external",
        "output_dir": str(args.output_dir),
        "source_size": source.size,
        "output_size": OUTPUT_SIZE,
        "alpha_bbox": bbox,
        "assets": [f"torii-{mode}.png" for mode in ("day", "sunset", "twilight", "night")],
    })


if __name__ == "__main__":
    main()
