
# Default PROJECT, if not given by another Makefile.
ifndef PROJECT
PROJECT=jmpa.io
endif

AWS_REGION ?= ap-southeast-2

# ---

generate-website: ## Generates everything related to the 'jmpa.io' website.
generate-website: \
	compile-website \
	generate-pdfs

compile-website: ## Compiles the 'jmpa.io' website, using hugo.
compile-website: cmd/hugo image-hugo
compile-website: dist/public
	@test -z "$(CI)" || echo "##[group]Compiling website."
	docker run --rm \
		-w /app \
		-v "$(PWD):/app" \
		-v "$(PWD)/public" \
		-v "$(PWD)/resources" \
		$(REPO)/hugo \
		--log --destination $<
	@test -z "$(CI)" || echo "##[endgroup]"

generate-pdfs: ## Generates PDFs for course content, using pandoc.
generate-pdfs: image-root
generate-pdfs: dist/public
	@test -z "$(CI)" || echo "##[group]Generating PDFs."
	bin/generate-pdfs.sh
	@test -z "$(CI)" || echo "##[endgroup]"

serve: ## Serves this website locally, mounted inside a Docker container.
serve: cmd/hugo image-hugo
serve: dist/public
	@docker run --rm -it \
		-w /app \
		-v "$(PWD):/app" \
		-p "1313:1313" \
		$(REPO)/hugo \
		server --disableFastRender

PHONY += generate-website serve

---: ## ---

# Includes the common Makefile.
# NOTE: this recursively goes back and finds the `.git` directory and assumes
# this is the root of the project. This could have issues when this assumtion
# is incorrect.
include $(shell while [[ ! -d .git ]]; do cd ..; done; pwd)/Makefile.common.mk
