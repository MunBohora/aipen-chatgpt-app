import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";
import express from "express";
import { registerAppResource, registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { chromium } from "playwright";
import { z } from "zod";
import { AIPEN_WIDGET_RESOURCE_URIS, AIPEN_WIDGET_URI, aipenWidgetHtml } from "./aipen-widget.js";

const app = express();
app.use(express.json());

const inputSchema = {
  text: z.string().trim().min(1, "Text cannot be empty.").max(8000, "Keep each request under 8,000 characters.").describe([
    "Markdown notes to render as handwriting. CRITICAL MATH RULE: wrap EVERY",
    "mathematical expression, variable, number-with-unit, and equation in dollar",
    "signs so it renders as real math. NON-NEGOTIABLE DELIMITER RULE:",
    "  - INLINE MATH inside a normal sentence uses exactly ONE dollar sign on each side:",
    "    'The answer is $x = 5$ metres.' Never use $$...$$ inside a paragraph.",
    "  - DISPLAY MATH uses TWO dollar signs on each side, $$...$$, on its OWN separate line:",
    "    '$$x^2 + y^2 = r^2$$'. Use this only when the equation should look like a",
    "    handwritten equation on a separate line.",
    "Examples:",
    "  - Write 'Using $v = u + at$, we solve for $t = (v-u)/a$.'  NOT 'v=u+at'",
    "  - Write '$$v^2 = u^2 + 2as$$'  NOT 'v^2=u^2+2as'",
    "  - Write '$\\sqrt{300} = 17.32$ m/s'  NOT 'sqrt(300)=17.32'",
    "  - Write '$a = 9.8\\,\\text{m/s}^2$'  NOT 'a=9.8 m/s^2'",
    "Never write bare math without dollar signs. STRUCTURE: use # for the title, ##",
    "for sections, and combine related steps onto ONE line (e.g. '$3x+5=20$, so",
    "$3x=15$, so $x=5$') instead of one equation per line, so the page looks like",
    "compact real notes. No bold, italics, emojis, blockquotes, or horizontal rules.",
    "GRAPHS - ONLY WHEN EXPLICITLY REQUESTED (for example: 'draw', 'plot', 'graph of',",
    "'sketch', or 'show a diagram'). Never add a graph on your own initiative. When a",
    "graph IS requested:",
    "  1. FIRST compute the real data with your Python tool - never eyeball values.",
    "  2. Normalize all coordinates to the 0-100 range (0,0 = bottom-left, 100,100 = top-right).",
    "  3. Emit the graph as a fenced code block with language 'graph' containing ONLY",
    "     valid JSON in this exact shape:",
    "     ```graph",
    "     {\"title\":\"...\",\"axisLabels\":{\"x\":\"...\",\"y\":\"...\"},",
    "      \"lines\":[{\"start\":[x,y],\"end\":[x,y],\"label\":\"D\",\"labelPos\":[x,y],\"color\":\"#111\"}],",
    "      \"curves\":[{\"path\":\"M 0 30 Q 40 20 100 90\",\"label\":\"MC\",\"labelPos\":[x,y]}],",
    "      \"dashes\":[[[x,y],[x,y]]],",
    "      \"areas\":[{\"points\":[[x,y],[x,y],[x,y]],\"color\":\"#2ecc71\",\"label\":\"CS\",\"labelPos\":[x,y]}],",
    "      \"texts\":[{\"text\":\"E\",\"pos\":[x,y]}],",
    "      \"nodes\":[],\"edges\":[],\"pies\":[]}",
    "     ```",
    "  4. For a plotted function, sample points with Python and express the curve as a",
    "     series of 'curves' path segments or many short 'lines'.",
    "  5. Keep the surrounding explanation as normal handwritten notes.",
  ].join("\n")),
  font: z.string().min(1).optional().default("premium43").describe("Handwriting style: premium43 (Classic), pu104 (Clean), pu95 (Script), pu105 (Casual). Default premium43."),
  ink: z.string().min(1).optional().default("black").describe("Ink style or color."),
  paper: z.string().min(1).optional().default("plain").describe("Paper style."),
  size: z.string().min(1).optional().default("medium").describe("Handwriting size."),
  humanize: z.boolean().optional().default(true).describe("Vary letterforms so repeated characters look naturally hand-written. Default true; set false only for a uniform look."),
};

const outputSchema = {
  pages: z.array(z.object({
    url: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })),
  pageCount: z.number().int().positive(),
  pdfUrl: z.string().url(),
  options: z.object({
    text: z.string(),
    font: z.string(),
    ink: z.string(),
    paper: z.string(),
    size: z.string(),
    humanize: z.boolean(),
  }),
};

type RenderInput = {
  text: string;
  font: string;
  ink: string;
  paper: string;
  size: string;
  humanize: boolean;
};

const SUPPORTED_FONT_IDS = new Set(["premium43", "pu104", "pu95", "pu105"]);

function normalizeRenderInput(input: RenderInput): RenderInput {
  return {
    ...input,
    font: SUPPORTED_FONT_IDS.has(input.font) ? input.font : "premium43",
  };
}

const RENDER_TIMEOUT_MS = 60_000;
const DOM_SETTLE_MS = 750;
const MAX_RENDER_PAGES = 5;
const MAX_ANONYMOUS_RENDERS_PER_HOUR = Math.max(1, Number.parseInt(process.env.MAX_ANONYMOUS_RENDERS_PER_HOUR ?? "40", 10) || 40);
const ANONYMOUS_RATE_WINDOW_MS = 60 * 60 * 1000;
const ASSET_TTL_MS = 60 * 60 * 1000;
const ASSET_TTL_SECONDS = Math.floor(ASSET_TTL_MS / 1000);
const ASSET_MAX_BYTES = 20 * 1024 * 1024;
const GCS_ARTIFACT_BUCKET = process.env.GCS_ARTIFACT_BUCKET ?? "aipen-mcp-artifacts";
const GCS_ARTIFACT_PREFIX = "chatgpt-renders/";

type AssetExtension = "jpeg" | "pdf";

type RenderedPage = {
  jpeg: Buffer;
  width: number;
  height: number;
};

const anonymousRenderCounts = new Map<string, { count: number; resetAt: number }>();
let activeRenderCount = 0;

class DemoRenderLimitError extends Error {}

const storage = new Storage();
const artifactBucket = storage.bucket(GCS_ARTIFACT_BUCKET);

function assetMimeType(extension: AssetExtension): "image/jpeg" | "application/pdf" {
  return extension === "jpeg" ? "image/jpeg" : "application/pdf";
}

async function storeArtifact(body: Buffer, extension: AssetExtension) {
  if (body.length > ASSET_MAX_BYTES) {
    throw new Error("Rendered file exceeds the 20 MB artifact limit.");
  }
  const id = randomUUID();
  const expiresAt = Date.now() + ASSET_TTL_MS;
  await artifactBucket.file(`${GCS_ARTIFACT_PREFIX}${id}.${extension}`).save(body, {
    resumable: false,
    contentType: assetMimeType(extension),
    metadata: {
      cacheControl: "public, max-age=1800, immutable",
      metadata: { aipenExpiresAt: String(expiresAt) },
      customTime: new Date().toISOString(),
    },
  });
  return id;
}

function clientIdentity(req: express.Request) {
  return req.header("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "anonymous";
}

function takeAnonymousRenderAllowance(clientId: string) {
  const now = Date.now();
  for (const [id, entry] of anonymousRenderCounts) {
    if (entry.resetAt <= now) anonymousRenderCounts.delete(id);
  }
  const existing = anonymousRenderCounts.get(clientId);
  if (!existing || existing.resetAt <= now) {
    anonymousRenderCounts.set(clientId, { count: 1, resetAt: now + ANONYMOUS_RATE_WINDOW_MS });
    return;
  }
  if (existing.count >= MAX_ANONYMOUS_RENDERS_PER_HOUR) {
    const minutes = Math.ceil((existing.resetAt - now) / 60_000);
    throw new DemoRenderLimitError(`You've used this hour's ${MAX_ANONYMOUS_RENDERS_PER_HOUR} Aipen demo renders. Please come back in about ${minutes} minutes - your allowance will refresh automatically.`);
  }
  existing.count += 1;
}

function acquireRenderSlot() {
  if (activeRenderCount >= 1) {
    throw new Error("Aipen is finishing another page. Please try again in a moment.");
  }
  activeRenderCount += 1;
  return () => { activeRenderCount -= 1; };
}

function externalOrigin(req: express.Request) {
  const configuredOrigin = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configuredOrigin) return configuredOrigin;
  const protocol = req.header("x-forwarded-proto")?.split(",")[0] || req.protocol;
  const host = req.header("x-forwarded-host")?.split(",")[0] || req.header("host");
  if (!host) throw new Error("Unable to determine the MCP server's public origin.");
  return `${protocol}://${host}`;
}

function assetUrl(origin: string, id: string, extension: AssetExtension) {
  return `${origin}/assets/${id}.${extension}`;
}

function buildRenderUrl({ text, font, ink, paper, size, humanize }: RenderInput): string {
  const url = new URL(process.env.AIPEN_RENDER_BASE ?? "https://aipen.ink");
  url.searchParams.set("render", "1");
  url.searchParams.set("text", text);
  url.searchParams.set("font", font);
  url.searchParams.set("ink", ink);
  url.searchParams.set("paper", paper);
  url.searchParams.set("size", size);
  url.searchParams.set("humanize", humanize ? "1" : "0");
  return url.toString();
}

async function renderHandwriting(input: RenderInput) {
  const renderUrl = buildRenderUrl(input);
  const deadline = Date.now() + RENDER_TIMEOUT_MS;
  const remainingTime = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error("Timed out after 60 seconds waiting for Aipen to render visible content.");
    }
    return remaining;
  };
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1.5,
      viewport: { width: 1280, height: 1600 },
    });
    await page.goto(renderUrl, { waitUntil: "domcontentloaded", timeout: remainingTime() });
    await page.waitForFunction(
      () => {
        const renderWindow = window as Window & { __aipenRenderDone?: boolean };
        return renderWindow.__aipenRenderDone === true ||
          document.getElementById("aipen-render-done") !== null;
      },
      undefined,
      { timeout: remainingTime() },
    );
    await page.waitForFunction(
      () => {
        const isVisible = (element: Element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" &&
            Number.parseFloat(style.opacity || "1") > 0 && rect.width > 0 && rect.height > 0;
        };
        const hasVisibleText = document.body.innerText.trim().length > 0;
        const hasVisibleInk = Array.from(document.querySelectorAll("svg, canvas")).some(
          (element) => isVisible(element) &&
            (element.tagName === "CANVAS" || element.querySelector("path, line, polyline, polygon, use") !== null),
        );
        return hasVisibleText || hasVisibleInk;
      },
      undefined,
      { timeout: remainingTime() },
    );
    // Aipen can report visible page content before its asynchronous MathJax
    // pass replaces inline/display-math placeholders. Capture only finished math.
    await page.waitForFunction(
      () => document.querySelectorAll(".imath-loading, .dmath-loading").length === 0,
      undefined,
      { timeout: remainingTime() },
    );
    if (remainingTime() < DOM_SETTLE_MS) {
      throw new Error("Timed out while waiting for Aipen DOM changes to settle.");
    }
    await page.evaluate(async (settleMs) => {
      await new Promise<void>((resolve) => {
        let settleTimer: ReturnType<typeof setTimeout>;
        const observer = new MutationObserver(() => resetTimer());
        const finish = () => {
          observer.disconnect();
          resolve();
        };
        const resetTimer = () => {
          clearTimeout(settleTimer);
          settleTimer = setTimeout(finish, settleMs);
        };
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        resetTimer();
      });
    }, DOM_SETTLE_MS);

    const pagedPages = page.locator(".pagedjs_page");
    const pageCount = await pagedPages.count();
    if (!pageCount) throw new Error("Aipen reported completion but produced no paginated pages.");
    if (pageCount > MAX_RENDER_PAGES) {
      throw new Error(`This request created ${pageCount} pages. The free demo is limited to ${MAX_RENDER_PAGES} pages per request.`);
    }

    const pages: RenderedPage[] = [];
    for (let index = 0; index < pageCount; index += 1) {
      const pageElement = pagedPages.nth(index);
      const dimensions = await pageElement.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      });
      if (dimensions.width <= 0 || dimensions.height <= 0) {
        throw new Error(`Aipen page ${index + 1} has no visible dimensions.`);
      }
      pages.push({
        jpeg: await pageElement.screenshot({ type: "jpeg", quality: 72, scale: "css" }),
        width: dimensions.width,
        height: dimensions.height,
      });
    }

    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return { renderUrl, pages, pdf };
  } finally {
    await browser.close();
  }
}

function createServer(assetOrigin: string, clientId: string) {
  const server = new McpServer({
    name: "aipen-chatgpt-app",
    version: "0.1.0",
  });

  for (const resourceUri of AIPEN_WIDGET_RESOURCE_URIS) {
    registerAppResource(
      server,
      `Aipen handwriting preview ${resourceUri}`,
      resourceUri,
      {
        _meta: {
          ui: {
            prefersBorder: false,
            csp: { resourceDomains: [assetOrigin] },
          },
        },
      },
      async () => ({
        contents: [{
          uri: resourceUri,
          mimeType: "text/html;profile=mcp-app",
          text: aipenWidgetHtml,
          _meta: {
            ui: {
              prefersBorder: false,
              csp: { resourceDomains: [assetOrigin] },
            },
            "openai/widgetDescription": "View handwritten Aipen notes, change their style, and download the finished PDF.",
          },
        }],
      }),
    );
  }

  registerAppTool(
    server,
    "make_handwriting",
    {
      title: "Make handwriting",
      description: "Renders text as handwritten notes with compact JPEG previews and a vector PDF using Aipen, and can draw accurate hand-drawn graphs and charts on request. When the user asks for notes or selects an Aipen template, write the actual requested content and call this tool; do not respond with generic text instead. The anonymous demo is limited to five pages per request.",
      inputSchema,
      outputSchema,
      _meta: {
        ui: { resourceUri: AIPEN_WIDGET_URI },
        "openai/outputTemplate": AIPEN_WIDGET_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Writing your notes...",
        "openai/toolInvocation/invoked": "Handwriting ready.",
      },
    },
    async (input) => {
      let releaseRenderSlot: (() => void) | undefined;
      try {
        takeAnonymousRenderAllowance(clientId);
        releaseRenderSlot = acquireRenderSlot();
        const renderInput = normalizeRenderInput(input);
        const { pages, pdf } = await renderHandwriting(renderInput);
        const storedPages = await Promise.all(pages.map(async (page) => {
          const id = await storeArtifact(page.jpeg, "jpeg");
          return {
            url: assetUrl(assetOrigin, id, "jpeg"),
            width: page.width,
            height: page.height,
          };
        }));
        const pdfId = await storeArtifact(pdf, "pdf");
        return {
          content: [
            { type: "text", text: `Generated ${storedPages.length} handwritten ${storedPages.length === 1 ? "page" : "pages"}.` },
            { type: "image", data: pages[0].jpeg.toString("base64"), mimeType: "image/jpeg" },
          ],
          structuredContent: {
            pages: storedPages,
            pageCount: storedPages.length,
            pdfUrl: assetUrl(assetOrigin, pdfId, "pdf"),
            options: renderInput,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown rendering error.";
        return {
          content: [{ type: "text", text: error instanceof DemoRenderLimitError ? message : `Aipen render failed: ${message}` }],
          isError: true,
        };
      } finally {
        releaseRenderSlot?.();
      }
    },
  );

  return server;
}

app.post("/mcp", async (req, res) => {
  try {
    const server = createServer(externalOrigin(req), clientIdentity(req));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "MCP request failed." });
    }
  }
});

app.get("/assets/:id.:extension", async (req, res) => {
  const extension = req.params.extension as AssetExtension;
  const assetId = req.params.id;
  if (extension !== "jpeg" && extension !== "pdf" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)) {
    res.status(404).json({ error: "This temporary Aipen file has expired." });
    return;
  }
  try {
    const file = artifactBucket.file(`${GCS_ARTIFACT_PREFIX}${assetId}.${extension}`);
    const [metadata] = await file.getMetadata();
    const expiresAt = Number(metadata.metadata?.aipenExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
        void file.delete({ ignoreNotFound: true }).catch(() => undefined);
      }
      res.status(404).json({ error: "This temporary Aipen file has expired." });
      return;
    }
    const [body] = await file.download();

    const maxAge = Math.max(0, Math.min(ASSET_TTL_SECONDS, Math.floor((expiresAt - Date.now()) / 1000)));
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cache-Control": `public, max-age=${maxAge}, immutable`,
      "Content-Type": assetMimeType(extension),
    });
    if (req.query.download === "1") {
      res.attachment(`aipen-handwriting.${extension}`);
    }
    res.send(body);
  } catch (error) {
    const errorCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (errorCode === "404") {
      res.status(404).json({ error: "This temporary Aipen file has expired." });
      return;
    }
    console.error("Aipen asset fetch failed", error);
    res.status(500).json({ error: "Unable to load this temporary Aipen file." });
  }
});

app.get("/healthz", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Aipen MCP server listening on http://localhost:${port}/mcp`);
});
