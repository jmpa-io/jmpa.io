
# The deploy container mounts the repo at /go/src/app, so Makefile.common.mk's
# `REPO = $(shell basename $(shell git rev-parse --show-toplevel))` would resolve to 'app' and
# beat the REPO the pipeline passes in, making the SSM lookups below miss. Pin it.
override REPO := jmpa.io

# Default PROJECT, if not given by another Makefile.
ifndef PROJECT
PROJECT=jmpa.io
endif

AWS_REGION ?= ap-southeast-2

# ---

# environment.
# Valid values: local, dev, prod.
# Defaults to local if not set.
ENVIRONMENT ?= local

ifeq ($(filter $(ENVIRONMENT),local dev prod),)
  $(error ENVIRONMENT must be one of: local, dev, prod)
endif

# ---

# The param prefix is the beginning of a path in AWS SSM Parameter Store that
# points to config for this service.
ifeq ($(ENVIRONMENT),prod)
PARAM_PREFIX ?= $(REPO)
else
PARAM_PREFIX ?= $(ENVIRONMENT).$(REPO)
endif

# SSM-backed vars — only resolved when a deploy/invoke target actually needs them.
hosted-zone-id:
	$(eval HOSTED_ZONE_ID ?= $(shell aws ssm get-parameter --name /$(PARAM_PREFIX)/hosted-zone/id --query 'Parameter.Value' --output text))

# The bucket is named after the domain (see cf/website/template.yml), in every environment.
UPLOAD_BUCKET ?= $(PARAM_PREFIX)

upload-bucket:
	@true

cert-arn:
	$(eval CERT_ARN ?= $(shell aws ssm get-parameter --region us-east-1 --name /certs/$(PARAM_PREFIX)/arn --query 'Parameter.Value' --output text))

pull-config: ## Prints the config pulled from AWS.
pull-config: hosted-zone-id upload-bucket cert-arn
	@echo $(HOSTED_ZONE_ID)
	@echo $(UPLOAD_BUCKET)
	@echo $(CERT_ARN)

# ---

# Services.
# Deployed manually: cert
SERVICE_GROUP_1 = website

# Targets.
cert: ## Deploys the 'cert' stack.
cert: hosted-zone-id
cert: AWS_REGION=us-east-1
cert: ADDITIONAL_PARAMETER_OVERRIDES="HostedZoneId=$(HOSTED_ZONE_ID) "
cert: deploy-cert

# The live prod stack predates the <project>-website-<env> naming, so keep its name and CI updates it in place.
ifeq ($(ENVIRONMENT),prod)
override STACK_NAME := jmpa-io
endif

website: ## Deploys the 'website' stack.
# Prod keeps the zone and certificate it already has (a deploy reuses the previous values of parameters not given).
ifneq ($(ENVIRONMENT),prod)
website: hosted-zone-id cert-arn
website: ADDITIONAL_PARAMETER_OVERRIDES+="AcmCertificateArn=$(CERT_ARN) "
website: ADDITIONAL_PARAMETER_OVERRIDES+="HostedZoneId=$(HOSTED_ZONE_ID) "
endif
website: deploy-website

sync: ## Syncs the downloaded website artifact (dist/) to AWS S3; called by the 50-upload pipeline.
sync: upload-bucket
	aws s3 sync --delete dist/ s3://$(UPLOAD_BUCKET)/
ifeq ($(ENVIRONMENT),prod)
	@# The live site sits behind CloudFront; drop its cached copies so visitors get the new content.
	id="$$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?@=='$(PARAM_PREFIX)']].Id | [0]" --output text)"; \
	test -n "$$id" -a "$$id" != None || { echo "no CloudFront distribution has the alias $(PARAM_PREFIX)"; exit 1; }; \
	aws cloudfront create-invalidation --distribution-id "$$id" --paths '/*'
endif

upload: ## Uploads generated website content to AWS S3. Be careful with this command!
upload: upload-bucket
	aws s3 sync --delete dist/public/ s3://$(UPLOAD_BUCKET)/

# ---

generate-website: ## Generates everything related to the 'jmpa.io' website.
generate-website: \
	compile-website

compile-website: ## Compiles the 'jmpa.io' website, using hugo.
compile-website: cmd/hugo image-hugo
compile-website: dist/public
	@test -z "$(CI)" || echo "##[group]Compiling website."
	docker run --rm \
		--user $$(id -u):$$(id -g) \
		-w /app \
		-v "$(PWD):/app" \
		-v "$(PWD)/public" \
		-v "$(PWD)/resources" \
		$(REPO)/hugo \
		--log --destination $<
	@test -z "$(CI)" || echo "##[endgroup]"

serve: ## Serves this website locally, mounted inside a Docker container.
serve: cmd/hugo image-hugo
serve: dist/public
	@docker run --rm \
		-w /app \
		-v "$(PWD):/app" \
		-p "1314:1313" \
		$(REPO)/hugo \
		server --disableFastRender

PHONY += generate-website serve

e2e: ## Runs the Playwright screenshot + interaction tests against dist/public (run `make generate-website` first).
	cd e2e && npm ci && SITE_DIR=../dist/public npx playwright test

PHONY += e2e

screenshots: ## Writes full-page PNGs of every wall theme (desktop/phone, light/dark) to e2e/screenshots (run `make generate-website` first).
	cd e2e && npm ci && SITE_DIR=../dist/public npx playwright test screenshots.spec.ts

PHONY += screenshots

---: ## ---

# Includes the common Makefile.
# NOTE: this recursively goes back and finds the `.git` directory and assumes
# this is the root of the project. This could have issues when this assumtion
# is incorrect.
include $(shell while [[ ! -d .git ]]; do cd ..; done; pwd)/Makefile.common.mk
