# TwinCity UI Terraform

Cloud Run deployment scaffold for `twincity-ui` with:
- required Google API enablement
- dedicated runtime service account
- Secret Manager env injection
- configurable public/private invoker IAM
- health and startup probes

## Apply

```bash
terraform init
terraform apply \
  -var="project_id=your-project" \
  -var="image=asia-northeast3-docker.pkg.dev/your-project/apps/twincity-ui:latest" \
  -var='env={
    NEXT_PUBLIC_EVENT_WS_URL="wss://events.example/ws"
    NEXT_PUBLIC_EVENT_API_URL="https://events.example/api"
    NEXT_PUBLIC_EVENT_POLL_MS="5000"
  }' \
  -var='secret_env={
    TWINCITY_EXPORT_OPERATOR_TOKEN={secret="twincity-export-token",version="latest"}
  }'
```

## Common toggles

```bash
-var="allow_unauthenticated=false"
-var='invoker_members=["group:ops-reviewers@example.com"]'
-var="create_service_account=false"
-var="service_account_email=twincity-runtime@your-project.iam.gserviceaccount.com"
```

## Notes

- Use `env` for non-secret config and `secret_env` for Secret Manager-backed values.
- When `allow_unauthenticated=false`, add explicit `invoker_members` for reviewers or platform groups.
- The runtime identity gets `roles/secretmanager.secretAccessor` on referenced secrets automatically.
- Container probes default to `/api/health`.
