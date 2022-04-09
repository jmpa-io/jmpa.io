---
title: 1. Basics.
images: [https://miro.medium.com/max/1400/0*jdx5-Ww6NH3ozn0Z.png]
---

From your `terminal`, run:
```bash
cat <<@ > run.sh
#!/usr/bin/env bash
echo "Coming Soon!"
@
chmod +x run.sh
./run.sh
```
