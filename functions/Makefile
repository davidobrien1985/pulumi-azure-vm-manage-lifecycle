NAME=pulumi-azure-vm-shutdown
VERSION=1
ITERATION := 1

compile:
	@rm -rf build/
	@npm install
	@mkdir build
	@zip build/functionapp.zip -r *

.Phony: compile