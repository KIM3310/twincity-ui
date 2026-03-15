.SHELLFLAGS := -eu -o pipefail -c

.PHONY: install dev open-local lint typecheck test build verify ci

install:
	npm ci

dev:
	npm run dev

open-local:
	bash ./tools/open_local.sh

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

build:
	npm run build

verify:
	npm run verify

ci: install lint typecheck test build
