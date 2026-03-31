import csv, os
from collections import Counter
result_base = "/app/cmake-build-debug/result"
for scene in sorted(os.listdir(result_base)):
    f = os.path.join(result_base, scene, "stable_matching.csv")
    if not os.path.exists(f):
        continue
    rows = list(csv.reader(open(f)))
    routes = [r.strip() for r in rows[1][1:] if r.strip()]
    c = Counter(routes)
    self_n = c.pop("Self", 0)
    top = sorted(c.items(), key=lambda x: -int(x[1]))[:5]
    print(f"{scene}  Self={self_n}  top={top}")
