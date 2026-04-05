---
name: vopak-branding-validator
description: Automatically validates Google Docs and Slides against Vopak Branding v3.0 standards. It checks colors, fonts, tone, and document structure before finalization.
---

# Vopak Branding Validator Skill

This skill is the "Guardian of the Brand" for all Vopak AI-generated content.

## 🛡️ Validation Rules
### 1. Visual Standards
- **Colors:** Must use Vopak Blue (#0a2373) for headings and Cyan (#00cfe1) for accents.
- **Fonts:** Strict adherence to professional sans-serif fonts (e.g., Roboto, Open Sans).
- **Logos:** Ensure the Vopak logo is present on the first and last slides of any presentation.

### 2. Structural Standards
- **Headings:** Use Heading 1-3 for clear document hierarchy.
- **Bullet Points:** Use professional square or round bullets; avoid nested lists beyond 2 levels.
- **Tables:** Must have a header row and alternating row colors for readability.

### 3. Voice & Tone
- **Professionalism:** Use matter-of-fact, strategic, and outcome-driven language.
- **Voice DNA:** Frame solutions as 'Empowerment' and 'Augmentation' (The Mindshift).

## 📋 Execution Workflow
1. **Pre-Flight Check:** Use the **3-Tier Wizard Bridge** via `read_workspace_script` to audit the document's current styles and structure.
2. **Auto-Correction:** If branding is missing, the agent MUST automatically apply the correct styles (Deep Blue: #0a2373, Cyan: #00cfe1) using `write_workspace_script`.
3. **Certification:** Once validated, mark the document's metadata as 'Vopak Branding Certified'.
