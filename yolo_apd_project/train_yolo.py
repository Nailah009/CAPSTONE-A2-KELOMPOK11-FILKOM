from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO
import yaml


def detect_data_yaml(dataset: Path) -> Path:
    if dataset.is_file() and dataset.suffix in {".yaml", ".yml"}:
        return dataset
    for candidate in (dataset / "data.yaml", dataset / "dataset.yaml"):
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        f"Tidak menemukan data.yaml/dataset.yaml di: {dataset}"
    )


def show_dataset_summary(data_yaml: Path) -> None:
    with data_yaml.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    names = data.get("names", {})
    print("\n=== DATASET ===")
    print(f"YAML : {data_yaml}")
    print(f"Path : {data.get('path')}")
    print("Classes:")
    if isinstance(names, list):
        for i, name in enumerate(names):
            print(f"  {i}: {name}")
    elif isinstance(names, dict):
        for k, v in names.items():
            print(f"  {k}: {v}")
    else:
        print("  [WARNING] Format names tidak dikenali.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train model YOLO untuk dataset APD.")
    parser.add_argument(
        "--dataset",
        required=True,
        type=Path,
        help="Path ke folder dataset atau langsung ke data.yaml.",
    )
    parser.add_argument(
        "--model",
        default="yolov8n.pt",
        help="Checkpoint model awal. Contoh: yolov8n.pt, yolo11n.pt, yolo26n.pt",
    )
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument(
        "--device",
        default="0",
        help='Gunakan "0" untuk GPU pertama atau "cpu" jika tanpa GPU.',
    )
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--patience", type=int, default=20)
    parser.add_argument("--project", default="runs_apd")
    parser.add_argument("--name", default="site_construction_4class")
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Lanjutkan training dari eksperimen sebelumnya jika ada.",
    )
    args = parser.parse_args()

    dataset_path = args.dataset.resolve()
    data_yaml = detect_data_yaml(dataset_path)
    show_dataset_summary(data_yaml)

    print("\n=== TRAINING CONFIG ===")
    print(f"Model    : {args.model}")
    print(f"Epochs   : {args.epochs}")
    print(f"Img size : {args.imgsz}")
    print(f"Batch    : {args.batch}")
    print(f"Device   : {args.device}")
    print(f"Workers  : {args.workers}")
    print(f"Patience : {args.patience}")
    print(f"Project  : {args.project}")
    print(f"Name     : {args.name}")

    model = YOLO(args.model)
    model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        workers=args.workers,
        patience=args.patience,
        project=args.project,
        name=args.name,
        pretrained=True,
        resume=args.resume,
    )

    print("\nTraining selesai.")
    print(
        f"Cek folder hasil di: {Path(args.project).resolve() / args.name}"
    )


if __name__ == "__main__":
    main()
