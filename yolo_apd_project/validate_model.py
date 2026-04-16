from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def detect_data_yaml(dataset: Path) -> Path:
    if dataset.is_file() and dataset.suffix in {".yaml", ".yml"}:
        return dataset
    for candidate in (dataset / "data.yaml", dataset / "dataset.yaml"):
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        f"Tidak menemukan data.yaml/dataset.yaml di: {dataset}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Validasi model YOLO hasil training.")
    parser.add_argument("--weights", required=True, type=Path, help="Path ke best.pt atau last.pt")
    parser.add_argument("--dataset", required=True, type=Path, help="Path ke folder dataset atau data.yaml")
    parser.add_argument("--split", default="val", choices=["train", "val", "test"])
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--device", default="0", help='Gunakan "0" atau "cpu"')
    args = parser.parse_args()

    weights = args.weights.resolve()
    data_yaml = detect_data_yaml(args.dataset.resolve())

    if not weights.exists():
        raise FileNotFoundError(f"File weights tidak ditemukan: {weights}")

    model = YOLO(str(weights))
    metrics = model.val(
        data=str(data_yaml),
        split=args.split,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
    )

    print("\n=== VALIDATION DONE ===")
    print(metrics)


if __name__ == "__main__":
    main()
