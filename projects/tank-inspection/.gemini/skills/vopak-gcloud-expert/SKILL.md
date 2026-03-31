---
name: vopak-gcloud-expert
description: Specialized skill for managing Google Cloud Platform using gcloud CLI. It provides expert guidance, workflows, and strict guardrails for GCP operations, prioritizing safety and destructive action prevention.
---

# Vopak GCP Expert Skill

This skill governs all `gcloud` CLI operations for the Vopak environment, focusing on project management, Vertex AI, and Cloud Storage.

## 🛡️ Mandates: Destructive Actions Guardrail
- **Destructive Definition:** Any command containing `delete`, `remove`, `destroy`, `purge`, `deprovision`, or `disable`.
- **Absolute Rule:** You MUST NEVER execute a destructive command without explicit, multi-step confirmation via `ask_user`.
- **Impact Statement:** Before requesting permission for a destructive action, you must provide a "Wizard's Impact Statement" detailing:
    1. The specific resource(s) affected.
    2. Any downstream dependencies.
    3. The inability to undo the operation (if applicable).
- **Dry-Run First:** Always attempt to use `--dry-run` or similar flags (where supported by gcloud) to preview changes before presenting them for approval.

## 🏗️ Technical Workflows
### 1. Resource Creation & Update
1. **Check Config:** Verify `gcloud config get-value project` matches the intended Vopak project.
2. **Plan & Preview:** List the exact `gcloud` command to be run.
3. **Execution:** Execute and verify the resource status immediately.

### 2. Vertex AI Operations
- Use `gcloud ai` for managing models and endpoints.
- Ensure all resources are labeled with `project:tank-inspection` or `owner:patricio`.

### 3. Cloud Storage & Data
- Use `gcloud storage` (or `gsutil`) for high-volume data movement between Drive and Cloud Storage.
- Always check permissions with `gcloud projects get-iam-policy` before making changes.

## 🛡️ Safety Checkpoints
- **Read-Only by Default:** Prefer `list`, `describe`, and `get` operations to understand the state before suggesting changes.
- **Quota Awareness:** Check service quotas with `gcloud compute project-info describe` before large-scale resource provisioning.
