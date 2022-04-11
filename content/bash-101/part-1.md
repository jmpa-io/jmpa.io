---
title: 1. Basics.
images: [/img/docker-101/docker-logo.jpg]
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
