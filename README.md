# Aipen for ChatGPT

**Turn any ChatGPT answer into hyper realistic handwritten, print-ready notes
without leaving the chat.**

Aipen for ChatGPT is an OpenAI Apps SDK application built on MCP. Ask ChatGPT
for notes, a worked solution, a letter, or a report, and Aipen renders it as a
paginated A4 handwritten document with an inline preview and a downloadable
vector PDF that stays crisp when printed or zoomed in.

This repository intentionally contains only the standalone MCP server and its
inline ChatGPT component. The proprietary Aipen editor and render engine remain
separate. Its humanization layer can select from up to 20 glyph variations per
character, which helps long documents avoid a mechanically repeated look.

<p align="center">
  <img src="docs/image%20demo.jpeg" width="420" alt="Aipen handwritten mathematics notes preview" />
  <img src="docs/graph%20image%20demo.jpeg" width="420" alt="Aipen hand-drawn supply and demand graph preview" />
</p>

The images above are real Aipen renders: handwritten layout, ruled A4 paper,
humanized letterforms, rendered mathematics, and an accurate hand-drawn graph.

## Judge Quick Start: No Rebuild Needed

The live MCP endpoint is:

```text
https://aipen-mcp-511200400258.us-central1.run.app/mcp
```

To test it in ChatGPT Developer Mode:

1. Open ChatGPT and enable Developer Mode.
2. Create or add a custom app/connector.
3. Paste the live endpoint above as the MCP server URL.
4. Start a new chat and ask, for example:

   ```text
   Create two pages of handwritten calculus revision notes with worked examples.
   ```

5. ChatGPT calls `make_handwriting`. Wait for the inline Aipen card, preview
   the handwritten page, change style options if desired, and select
   **Download PDF**.

The demo accepts up to 6,500 characters, renders up to five pages per request,
and allows 40 renders per IP per hour.

### Demo Video

Watch the full 4K trailer and product walkthrough on YouTube:

https://www.youtube.com/watch?v=SdR5WnF-BUk

## Architecture

```text
ChatGPT
  -> MCP server on Cloud Run
  -> Playwright / headless Chromium
  -> private Aipen render engine
  -> per-page JPEG previews + vector PDF
  -> private Google Cloud Storage artifacts
  -> inline Aipen card in ChatGPT
```

Under the hood, the MCP receives structured note text and appearance options,
opens Aipen in a headless browser, waits for Aipen to finish rendering, captures
each Paged.js page as a modest JPEG preview, and produces the final PDF with
Chromium `page.pdf()`. The PDF is not assembled from preview images.

Artifacts are placed in a private Google Cloud Storage bucket and served through
the MCP's `/assets/:id` proxy. The app enforces a one-hour artifact expiry;
bucket lifecycle cleanup removes leftover objects later.

## Features

- Inline ChatGPT UI with A4 paper preview and PDF download
- True vector PDF output from Chromium: text and paths stay crisp at any zoom
- Per-page JPEG thumbnails for fast previews
- Accurate hand-drawn graphs and charts when explicitly requested
- Four Aipen handwriting styles: Classic, Clean, Script, Casual
- Ink, paper, and humanization controls
- Markdown and LaTex-style math support through the Aipen render engine
- Hard demo protections: 6,500 characters, five pages, 40 renders/IP/hour
- Private, temporary artifact storage with no browser-exposed cloud credentials

## Study Materials

Aipen turns AI explanations into printable, annotatable study materials.
Learners can review, highlight, and work through them by hand. It does not claim
that viewing generated handwriting has the same learning effect as personally
writing notes by hand.

## Language Support

Native handwriting currently supports English and languages using the standard
English alphabet, including Afrikaans, Albanian, Catalan, Croatian, Czech,
Danish, Dutch, Estonian, Finnish, French, German, Icelandic, Irish, Italian,
Latvian, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Slovak,
Slovenian, Spanish, Swedish, Turkish, and Welsh. More languages are planned.

## Future Possibilities

Aipen is designed to grow beyond study notes. Planned directions include:

- Letter and email automation with handwritten, print-ready output
- Branded stationery, business documents, and personalized card templates
- Real-estate packs, lab reports, finance notes, and subject-specific layouts

## Local Development

Requirements:

- Node.js 20+
- A Chromium-capable machine
- An Aipen render URL
- Google Cloud Application Default Credentials for local artifact storage

```powershell
npm ci
npx playwright install chromium
gcloud auth application-default login

$env:AIPEN_RENDER_BASE = "https://aipen-render-511200400258.us-central1.run.app"
$env:GCS_ARTIFACT_BUCKET = "aipen-mcp-artifacts"
$env:PORT = "3001"

npm run check
npm run build
node dist/index.js
```

For local Aipen engine development, replace `AIPEN_RENDER_BASE` with your local
render server, such as `http://localhost:3000`.

The local MCP endpoint is `http://localhost:3001/mcp`.

## Deployment Checklist

- Confirm `PUBLIC_BASE_URL` is set to the canonical public Cloud Run URL.
- Confirm production traffic targets only the intended revision.
- After any tagged test revision, remove its tag and verify the traffic output
  has no `tag` or tagged `url` entries before considering the deployment complete.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `3000`. |
| `AIPEN_RENDER_BASE` | Yes in production | Base URL for the Aipen render engine. |
| `GCS_ARTIFACT_BUCKET` | No | Private artifact bucket. Defaults to `aipen-mcp-artifacts`. |
| `PUBLIC_BASE_URL` | No | Overrides the externally visible MCP origin for artifact URLs. |
| `MAX_ANONYMOUS_RENDERS_PER_HOUR` | No | Per-IP demo allowance. Defaults to `40`. |

On Cloud Run, the attached service account receives bucket-only
`roles/storage.objectAdmin`; no JSON key, API key, or Secret Manager value is
required for artifact access.

## Built With Codex and GPT-5.6

OpenAI Codex and GPT-5.6 assisted with the MCP server, Apps SDK integration,
Playwright render pipeline, inline ChatGPT UI, Cloud Run containerization,
Google Cloud Storage artifact persistence, tests, and documentation. Aipen
provides the independent handwriting render engine, page design, fonts, math
rendering, paper styles, and glyph humanization.

## License

MIT. See [LICENSE](LICENSE).
