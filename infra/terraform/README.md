# TwinCity UI Terraform

Minimal Cloud Run deployment skeleton for `twincity-ui`.

## Apply

```bash
terraform init
terraform apply \
  -var="project_id=your-project" \
  -var="image=asia-northeast3-docker.pkg.dev/your-project/apps/twincity-ui:latest"
```

Use `env` to inject `TWINCITY_EXPORT_OPERATOR_TOKEN` and demo/runtime settings.
