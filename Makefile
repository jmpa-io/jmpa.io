
# Default PROJECT, if not given by another Makefile.
ifndef PROJECT
PROJECT=jmpa.io
endif

AWS_REGION ?= ap-southeast-2

SQUARE_SANDBOX ?= true
export SQUARE_SANDBOX

# ---

# The param prefix is the beginning of a path in AWS SSM Parameter Store that
# points to config for this website.
ifeq ($(ENVIRONMENT),prod)
PARAM_PREFIX ?= $(REPO)
else
PARAM_PREFIX ?= $(ENVIRONMENT).$(REPO)
endif

# SSM-backed vars — only resolved when a deploy/invoke target actually needs them.
hosted-zone-id:
	$(eval HOSTED_ZONE_ID ?= $(shell aws ssm get-parameter --name /$(PARAM_PREFIX)/hosted-zone/id --query 'Parameter.Value' --output text))

upload-bucket:
	$(eval UPLOAD_BUCKET ?= $(shell aws ssm get-parameter --name /$(PARAM_PREFIX)/bucket --query 'Parameter.Value' --output text))

cert-arn:
	$(eval CERT_ARN ?= $(shell aws ssm get-parameter --region us-east-1 --name /certs/$(REPO)/arn --query 'Parameter.Value' --output text))

square-access-token:
	$(eval SQUARE_ACCESS_TOKEN ?= $(shell aws ssm get-parameter --name /$(PARAM_PREFIX)/square/access-token --with-decryption --query 'Parameter.Value' --output text))
	$(eval export SQUARE_ACCESS_TOKEN)

pull-config: ## Prints the config pulled from AWS.
pull-config: hosted-zone-id upload-bucket cert-arn
	@echo $(HOSTED_ZONE_ID)
	@echo $(UPLOAD_BUCKET)
	@echo $(CERT_ARN)

# ---

# Services.
# Deployed manually: cert
SERVICE_GROUP_1 = website
SERVICE_GROUP_2 = inventory

# Targets.
cert: ## Deploys the 'cert' stack.
cert: hosted-zone-id
cert: AWS_REGION=us-east-1
cert: ADDITIONAL_PARAMETER_OVERRIDES="HostedZoneId=$(HOSTED_ZONE_ID) "
cert: deploy-cert

website: ## Deploys the 'website' stack.
website: hosted-zone-id cert-arn
website: ADDITIONAL_PARAMETER_OVERRIDES="AcmCertificateArn=$(CERT_ARN) "
website: ADDITIONAL_PARAMETER_OVERRIDES+="HostedZoneId=$(HOSTED_ZONE_ID) "
website: deploy-website

inventory: ## Deploys the 'inventory' stack.
inventory: binary-go-inventory bootstrap-inventory
inventory: deploy-inventory

invoke-inventory: ## Invokes the inventory Lambda locally via aws-sam-cli.
invoke-inventory: square-access-token binary-go-inventory bootstrap-inventory
	@cmd/inventory/local.sh

update-square-inventory: ## Creates Square payment links for all unsold paintings and writes them back to data/art.yml.
update-square-inventory: square-access-token binary-go-update-square-inventory
	@ART_YML=data/art.yml \
	dist/update-square-inventory/update-square-inventory-$(OS)-$(ARCH)

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

---: ## ---

# Includes the common Makefile.
# NOTE: this recursively goes back and finds the `.git` directory and assumes
# this is the root of the project. This could have issues when this assumtion
# is incorrect.
include $(shell while [[ ! -d .git ]]; do cd ..; done; pwd)/Makefile.common.mk
