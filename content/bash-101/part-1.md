---
title: 1. Basics.
images: [/img/bash-101/logo.png]
---

From your `terminal`, run:
```bash
cat <<@ > run.sh
#!/usr/bin/env bash
echo "Coming Soon!"
<<- --> === == ====
@
chmod +x run.sh
./run.sh
```
