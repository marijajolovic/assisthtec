import argparse, pathlib, random

def split_list(input_list, train=0.8, val=0.1, test=0.1, seed=42):
    random.seed(seed)
    items = [x.strip() for x in input_list if x.strip()]
    random.shuffle(items)
    n = len(items); nt = int(n*train); nv = int(n*val)
    return items[:nt], items[nt:nt+nv], items[nt+nv:]

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--list", required=True, help="Path to a txt file with absolute paths to code files")
    p.add_argument("--outdir", default="data/splits")
    p.add_argument("--train", type=float, default=0.8)
    p.add_argument("--val", type=float, default=0.1)
    p.add_argument("--test", type=float, default=0.1)
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    lines = pathlib.Path(args.list).read_text(encoding="utf-8", errors="ignore").splitlines()
    tr, va, te = split_list(lines, args.train, args.val, args.test, args.seed)
    outdir = pathlib.Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)
    (outdir/"train.txt").write_text("\n".join(tr)+"\n", encoding="utf-8")
    (outdir/"val.txt").write_text("\n".join(va)+"\n", encoding="utf-8")
    (outdir/"test.txt").write_text("\n".join(te)+"\n", encoding="utf-8")
    print(f"Wrote {len(tr)} train, {len(va)} val, {len(te)} test files to {outdir}")

#python scripts/prepare_dataset.py --list data/lists/c_file_list.txt --outdir data/splits
