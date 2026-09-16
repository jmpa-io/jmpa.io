
# Default PROJECT, if not given by another Makefile.
ifndef PROJECT
PROJECT=jmpa.io
endif

AWS_REGION ?= ap-southeast-2

# ---

# The param prefix is the beginning of a path in AWS SSM Parameter Store that
# points to config for this website.
ifeq ($(ENVIRONMENT),prod)
PARAM_PREFIX ?= $(REPO)
else
PARAM_PREFIX ?= $(ENVIRONMENT).$(REPO)
endif

# The hosted zone id in Route53.
HOSTED_ZONE_ID ?= $(shell aws ssm get-parameter --name /$(PARAM_PREFIX)/hosted-zone/id --query 'Parameter.Value' --output text)

# The bucket to upload the website to.
UPLOAD_BUCKET ?= $(shell aws ssm get-parameter --name /$(PARAM_PREFIX)/bucket --query 'Parameter.Value' --output text)

# The arn to the cert stored in ACM.
# NOTE: This is using '$(REPO)' because this cert is only deployed to production.
CERT_ARN ?= $(shell aws ssm get-parameter --region us-east-1 --name /certs/$(REPO)/arn --query 'Parameter.Value' --output text)

pull-config: # Pulls the config pulled from AWS when deploying.
pull-config:
	@echo $(HOSTED_ZONE_ID)
	@echo $(UPLOAD_BUCKET)
	@echo $(CERT_ARN)

# ---

# Services.
# Deployed manually: cert
SERVICE_GROUP_1 = website

# Targets.
cert: ## Deploys the 'cert' stack.
cert: AWS_REGION=us-east-1
cert: ADDITIONAL_PARAMETER_OVERRIDES="HostedZoneId=$(HOSTED_ZONE_ID) "
cert: deploy-cert

website: ## Deploys the 'website' stack.
website: ADDITIONAL_PARAMETER_OVERRIDES="AcmCertificateArn=$(CERT_ARN) "
website: ADDITIONAL_PARAMETER_OVERRIDES+="HostedZoneId=$(HOSTED_ZONE_ID) "
website: deploy-website

upload: ## Uploads generated website content to AWS S3. Be careful with this command!
upload:
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
