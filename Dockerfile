# This Dockerfile is used to generate the pdfs in this repository.
FROM pandoc/core:2.18
RUN apk add --no-cache \
    texmf-dist \
    texlive-full \
    && rm -rf /var/cache/apk

# TODO install dracula in the Dockerfile: https://github.com/dracula/pandoc/archive/master.zip
