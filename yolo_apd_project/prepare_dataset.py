from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import yaml

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass
class SplitStats:
    images: int = 0
    labels: int = 0
    kept_annotations: int = 0
    dropped_annotations: int = 0


def load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_yaml(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)


def normalize_name(name: str) -> str:
    return name.strip().lower().replace("-", "_").replace(" ", "_")


ALIASES = {
    "helmet": {"helmet", "hardhat", "hard_hat"},
    "vest": {"vest", "safety_vest", "reflective_vest"},
    "shoes": {"shoes", "shoe", "boots", "boot", "safety_shoes", "safety_shoe"},
    "gloves": {"gloves", "glove"},
}


def canonicalize(name: str) -> str:
    normalized = normalize_name(name)
    for canonical, aliases in ALIASES.items():
        if normalized in aliases:
            return canonical
    return normalized


def parse_names(raw_names: object) -> Dict[int, str]:
    if isinstance(raw_names, list):
        return {i: str(name) for i, name in enumerate(raw_names)}
    if isinstance(raw_names, dict):
        parsed: Dict[int, str] = {}
        for k, v in raw_names.items():
            parsed[int(k)] = str(v)
        return parsed
    raise ValueError("Unsupported names format in data.yaml. Expected list or dict.")


def detect_dataset_yaml(dataset_root: Path) -> Path:
    candidates = [dataset_root / "data.yaml", dataset_root / "dataset.yaml"]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        f"Tidak menemukan data.yaml atau dataset.yaml di: {dataset_root}"
    )


def detect_split_dir(dataset_root: Path, split_name: str) -> Path | None:
    candidates = [dataset_root / split_name]
    if split_name == "val":
        candidates.append(dataset_root / "valid")
    elif split_name == "valid":
        candidates.append(dataset_root / "val")

    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate
    return None


def find_image_for_label(label_file: Path, image_dir: Path) -> Path | None:
    stem = label_file.stem
    for ext in IMAGE_EXTS:
        candidate = image_dir / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    matches = list(image_dir.glob(f"{stem}.*"))
    for match in matches:
        if match.suffix.lower() in IMAGE_EXTS:
            return match
    return None


def remap_label_lines(
    label_path: Path,
    source_names: Dict[int, str],
    selected_targets: List[str],
) -> Tuple[List[str], int, int]:
    kept: List[str] = []
    kept_count = 0
    dropped_count = 0

    if not label_path.exists():
        return kept, kept_count, dropped_count

    target_index = {name: i for i, name in enumerate(selected_targets)}

    with label_path.open("r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue

            parts = line.split()
            if len(parts) != 5:
                dropped_count += 1
                continue

            try:
                source_class = int(parts[0])
            except ValueError:
                dropped_count += 1
                continue

            source_name = source_names.get(source_class)
            if source_name is None:
                dropped_count += 1
                continue

            canonical_name = canonicalize(source_name)
            if canonical_name not in target_index:
                dropped_count += 1
                continue

            new_class = target_index[canonical_name]
            kept.append(" ".join([str(new_class), *parts[1:]]))
            kept_count += 1

    return kept, kept_count, dropped_count


def ensure_clean_dir(path: Path, overwrite: bool) -> None:
    if path.exists() and overwrite:
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def process_split(
    src_split_dir: Path,
    dst_root: Path,
    split_name: str,
    source_names: Dict[int, str],
    selected_targets: List[str],
) -> SplitStats:
    stats = SplitStats()
    dst_images = dst_root / "images" / split_name
    dst_labels = dst_root / "labels" / split_name
    dst_images.mkdir(parents=True, exist_ok=True)
    dst_labels.mkdir(parents=True, exist_ok=True)

    src_images = src_split_dir / "images"
    src_labels = src_split_dir / "labels"

    if not src_images.exists() or not src_labels.exists():
        raise FileNotFoundError(
            f"Split '{split_name}' harus punya folder 'images' dan 'labels'."
        )

    label_files = sorted(src_labels.glob("*.txt"))
    for label_file in label_files:
        image_file = find_image_for_label(label_file, src_images)
        if image_file is None:
            print(f"[WARNING] Gambar untuk label tidak ditemukan: {label_file.name}")
            continue

        remapped_lines, kept_count, dropped_count = remap_label_lines(
            label_file, source_names, selected_targets
        )

        shutil.copy2(image_file, dst_images / image_file.name)
        with (dst_labels / label_file.name).open("w", encoding="utf-8") as f:
            if remapped_lines:
                f.write("\n".join(remapped_lines) + "\n")

        stats.images += 1
        stats.labels += 1
        stats.kept_annotations += kept_count
        stats.dropped_annotations += dropped_count

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Filter dataset Roboflow YOLO agar hanya menyisakan class APD yang dipakai."
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Folder dataset hasil download/export Roboflow dalam format YOLO.",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Folder output dataset baru yang sudah difilter.",
    )
    parser.add_argument(
        "--classes",
        nargs="+",
        default=["helmet", "vest", "shoes", "gloves"],
        help="Daftar class target. Default: helmet vest shoes gloves",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Timpa folder output jika sudah ada.",
    )
    args = parser.parse_args()

    input_root = args.input.resolve()
    output_root = args.output.resolve()
    selected_targets = [canonicalize(c) for c in args.classes]

    dataset_yaml = detect_dataset_yaml(input_root)
    data = load_yaml(dataset_yaml)
    source_names = parse_names(data.get("names"))

    print("\n=== SUMBER DATASET ===")
    print(f"YAML      : {dataset_yaml}")
    print("Class asli:")
    for idx in sorted(source_names):
        print(f"  {idx}: {source_names[idx]}")

    print("\n=== CLASS TARGET ===")
    for i, name in enumerate(selected_targets):
        print(f"  {i}: {name}")

    ensure_clean_dir(output_root, overwrite=args.overwrite)
    (output_root / "images").mkdir(parents=True, exist_ok=True)
    (output_root / "labels").mkdir(parents=True, exist_ok=True)

    split_map = {"train": "train", "val": "val", "test": "test"}
    split_stats: Dict[str, SplitStats] = {}

    for normalized_split, target_split in split_map.items():
        src_dir = detect_split_dir(input_root, normalized_split)
        if src_dir is None:
            print(f"[INFO] Split '{normalized_split}' tidak ditemukan. Dilewati.")
            continue
        split_stats[target_split] = process_split(
            src_split_dir=src_dir,
            dst_root=output_root,
            split_name=target_split,
            source_names=source_names,
            selected_targets=selected_targets,
        )

    output_yaml = {
        "path": str(output_root).replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {i: name for i, name in enumerate(selected_targets)},
    }
    save_yaml(output_root / "data.yaml", output_yaml)

    print("\n=== RINGKASAN ===")
    for split, stats in split_stats.items():
        print(
            f"{split:>5} | images={stats.images} | labels={stats.labels} | "
            f"kept_boxes={stats.kept_annotations} | dropped_boxes={stats.dropped_annotations}"
        )

    print(f"\nDataset baru tersimpan di: {output_root}")
    print(f"data.yaml baru          : {output_root / 'data.yaml'}")


if __name__ == "__main__":
    main()
