FROM klakegg/hugo:0.93.2-alpine

# setup user.
ARG UID=1000
ARG GID=1000
RUN addgroup -S $GID
RUN adduser -S $UID -G $GID
USER $UID:$GID

# setup entrypoint.
ENTRYPOINT ["hugo"]
