FROM texlive/texlive:TL2020-historic

# install deps.
RUN apt-get update && apt-get install -y \
    pandoc \
    fonts-firacode

# install dracula theme for pandoc / latex.
# https://draculatheme.com/pandoc
RUN mkdir -p /root/.config/pandoc/ \
    && curl -sL https://github.com/dracula/pandoc/archive/master.zip -o dracula.zip \
    && curl -sL https://github.com/dracula/latex/archive/master.zip -o dracula-latex.zip \
    && unzip dracula.zip \
    && unzip dracula-latex \
    && cp pandoc-master/dracula.yaml /root/.config/pandoc/ \
    && cp pandoc-master/dracula.theme /root/.config/pandoc/ \
    && cp latex-master/draculatheme.sty /root/.config/pandoc/ \
    && sed -i 's/\/full\/path\/to\/dracula\.theme/\/root\/\.config\/pandoc\/dracula.theme/g' /root/.config/pandoc/dracula.yaml \
    && sed -i 's/\/full\/path\/to\/draculatheme/\/root\/\.config\/pandoc\/draculatheme/g' /root/.config/pandoc/dracula.yaml \
    && rm -rf dracula.zip pandoc-master dracula-latex.zip latex-master

# # install eisvogel template for pandoc.
# # https://github.com/Wandmalfarbe/pandoc-latex-template
# RUN mkdir -p /root/.pandoc/templates/ \
#     && curl -sL https://github.com/Wandmalfarbe/pandoc-latex-template/releases/download/v2.0.0/Eisvogel-2.0.0.zip -o eisvogel.zip \
#     && unzip eisvogel.zip -d eisvogel \
#     && mv eisvogel/eisvogel.latex /root/.pandoc/templates/ \
#     && rm -rf eisvogel.zip eisvogel
