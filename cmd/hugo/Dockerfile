# config.yml mounts single files, which Hugo 0.93 (the old klakegg image) rejects.
FROM hugomods/hugo:exts-0.139.0

# setup user.
ARG UID=1000
ARG GID=1000
RUN addgroup -S $GID
RUN adduser -S $UID -G $GID
USER $UID:$GID

# setup entrypoint.
ENTRYPOINT ["hugo"]
