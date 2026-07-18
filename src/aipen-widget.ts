// Changing this URI deliberately invalidates ChatGPT's cached component template.
export const AIPEN_WIDGET_URI = "ui://widget/aipen-preview-v19.html";
export const AIPEN_WIDGET_RESOURCE_URIS = [
  AIPEN_WIDGET_URI,
  "ui://widget/aipen-preview-v18.html",
  "ui://widget/aipen-preview-v17.html",
  "ui://widget/aipen-preview-v16.html",
  "ui://widget/aipen-preview-v15.html",
  "ui://widget/aipen-preview-v14.html",
  "ui://widget/aipen-preview-v13.html",
  "ui://widget/aipen-preview-v12.html",
  "ui://widget/aipen-preview-v11.html",
  "ui://widget/aipen-preview-v10.html",
  "ui://widget/aipen-preview-v9.html",
  "ui://widget/aipen-preview-v8.html",
  "ui://widget/aipen-preview-v7.html",
  "ui://widget/aipen-preview-v6.html",
  "ui://widget/aipen-preview.html",
  "ui://aipen/handwriting-preview-v5.html",
  "ui://aipen/handwriting-preview-v4.html",
  "ui://aipen/handwriting-preview-v3.html",
];

export const aipenWidgetHtml = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aipen preview</title>
    <style>
      :root { color-scheme: light dark; --green: #10b981; --green-dark: #047857; --bg: #ffffff; --surface: #f7f8f8; --text: #17201c; --muted: #6b756f; --line: #dce4df; --paper: #ffffff; }
      @media (prefers-color-scheme: dark) { :root { --bg: #18201c; --surface: #202a25; --text: #eef7f1; --muted: #a9b8af; --line: #36443c; } }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      button, a { font: inherit; }
      .card { width: 100%; max-width: 1120px; margin: 0 auto; padding: 14px; }
      .header, .page-meta, .toolbar, .actions, .controls, .control, .thumbs, .template-list { display: flex; align-items: center; }
      .header { justify-content: space-between; padding: 2px 1px 12px; }
      .brand { color: var(--green); font-size: 15px; font-weight: 750; letter-spacing: 0; }
      .count, .page-meta { color: var(--muted); font-size: 12px; }
      .preview-wrap { display: block; width: 100%; padding: 4px 0; text-align: center; }
      .paper { display: block; width: auto; max-width: min(100%, 520px); max-height: min(62vh, 760px); height: auto; margin: 0 auto; background: var(--paper); border-radius: 4px; box-shadow: 0 4px 24px rgba(0, 0, 0, .14); }
      .page-meta { justify-content: center; min-height: 26px; padding-top: 8px; }
      .thumbs { gap: 8px; overflow-x: auto; padding: 4px 1px 12px; scrollbar-width: thin; }
      .thumb { flex: 0 0 68px; height: 88px; padding: 0; border: 2px solid transparent; border-radius: 4px; overflow: hidden; cursor: pointer; background: var(--surface); }
      .thumb[aria-pressed="true"] { border-color: var(--green); }
      .thumb img { display: block; width: 100%; height: 100%; object-fit: cover; background: var(--paper); }
      .toolbar { gap: 14px; flex-wrap: nowrap; padding: 12px 0 2px; border-top: 1px solid var(--line); }
      .actions { flex: 0 0 auto; gap: 8px; margin-left: auto; padding: 0; }
      .button { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 6px; color: var(--text); background: transparent; text-decoration: none; font-size: 13px; font-weight: 650; cursor: pointer; }
      .button.primary { border-color: var(--green); background: var(--green); color: #ffffff; }
      .button.download { min-width: 144px; }
      .button.primary:hover { background: var(--green-dark); border-color: var(--green-dark); }
      .controls { flex: 1 1 auto; min-width: 0; gap: 12px; flex-wrap: nowrap; }
      .control { flex: 1 1 0; gap: 7px; min-width: 0; }
      .control-label { margin: 0; color: var(--muted); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
      .select { width: 100%; min-height: 34px; padding: 6px 30px 6px 10px; border: 1px solid var(--line); border-radius: 6px; appearance: auto; background: var(--bg); color: var(--text); font: inherit; font-size: 13px; cursor: pointer; }
      .font-picker { position: relative; width: 100%; }
      .font-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 34px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 6px; color: var(--text); background: var(--bg); font: inherit; font-size: 13px; cursor: pointer; }
      .font-trigger::after { content: "v"; color: var(--muted); font-size: 12px; }
      .font-menu { position: absolute; z-index: 5; top: calc(100% + 5px); left: 0; width: min(230px, calc(100vw - 28px)); padding: 5px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg); box-shadow: 0 10px 24px rgba(0, 0, 0, .16); }
      .font-option, .upload-font { display: flex; align-items: center; width: 100%; min-height: 32px; padding: 6px 8px; border: 0; border-radius: 4px; font: inherit; font-size: 12px; text-align: left; }
      .font-option { color: var(--text); background: transparent; cursor: pointer; }
      .font-option:hover, .font-option[aria-pressed="true"] { color: var(--green-dark); background: color-mix(in srgb, var(--green) 10%, var(--surface)); }
      .upload-font { justify-content: center; margin-top: 5px; color: #ffffff; background: var(--green); font-size: 9px; font-weight: 700; white-space: nowrap; cursor: not-allowed; }
      .select:focus-visible, .button:focus-visible, .thumb:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
      .select:disabled, .button:disabled { opacity: .55; cursor: wait; }
      .templates { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
      .graph-note { margin: 0 0 8px; color: var(--green-dark); font-size: 12px; font-weight: 650; }
      .templates-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
      .templates-title { margin: 0; color: var(--text); font-size: 12px; font-weight: 700; }
      .templates-status { color: var(--muted); font-size: 11px; }
      .template-list { flex-wrap: wrap; gap: 6px; }
      .template { min-height: 28px; padding: 5px 9px; border: 1px solid var(--line); border-radius: 5px; color: var(--text); background: var(--surface); font-size: 12px; line-height: 1.1; cursor: pointer; }
      .template:hover { border-color: var(--green); color: var(--green-dark); background: color-mix(in srgb, var(--green) 8%, var(--surface)); }
      .template:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
      .template:disabled { opacity: .6; cursor: wait; }
      .language-note { margin: 10px 0 0; color: var(--muted); font-size: 12px; line-height: 1.35; }
      .error { padding: 26px 12px; text-align: center; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; }
      .error p { margin: 0 0 12px; color: var(--muted); }
      .loading { display: grid; justify-items: center; gap: 12px; padding: 4px 0; }
      .loading-message { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.2; text-align: center; white-space: nowrap; }
      .skeleton { width: min(100%, 650px); aspect-ratio: 0.707; border-radius: 4px; background: linear-gradient(110deg, #eef1ef 8%, #ffffff 18%, #eef1ef 33%); background-size: 200% 100%; animation: shimmer 1.25s linear infinite; box-shadow: 0 4px 24px rgba(0, 0, 0, .08); }
      @keyframes shimmer { to { background-position-x: -200%; } }
      @media (max-width: 720px) { .card { padding: 10px; } .paper { max-width: min(100%, 430px); max-height: 56vh; } .toolbar { align-items: flex-end; flex-wrap: wrap; gap: 12px; } .controls { width: 100%; flex-basis: 100%; gap: 8px; } .control { gap: 5px; } .actions { width: 100%; margin-left: 0; } .actions > * { flex: 1 1 0; } .button.download { min-width: 0; } .loading-message { font-size: 10px; } }
    </style>
  </head>
  <body>
    <main id="app" class="card" aria-live="polite"></main>
    <script>
      (function () {
        var root = document.getElementById("app");
        var state = { data: null, error: "", busy: false, activePage: 0, selectedOptions: null, presetStatus: "", presetBusy: false, fontMenuOpen: false };
        var pending = new Map();
        var requestNumber = 0;
        var bridgeReady = false;
        var options = {
          font: ["premium43", "pu104", "pu95", "pu105"],
          ink: ["black", "blue", "dark grey"],
          paper: ["plain", "lined", "grid"]
        };
        var fontNames = {
          premium43: "Classic",
          pu104: "Clean",
          pu95: "Script",
          pu105: "Casual"
        };
        var templates = [
          { label: "Make a graph", prompt: "Create handwritten supply and demand notes with an accurate hand-drawn supply-and-demand graph marking equilibrium. Calculate sensible values before drawing the graph, use the Aipen graph format, and include a brief explanation." },
          { label: "Calculus" }, { label: "Physics" }, { label: "Chemistry" }, { label: "Statistics" }, { label: "Linear algebra" }, { label: "Math Homework" },
          { label: "Lab Report" }, { label: "Finance" }, { label: "Economics" }, { label: "Accounting" }, { label: "Engineering" }, { label: "Differential equations" },
          { label: "Quantum mechanics" }, { label: "Thermodynamics" }, { label: "Game theory" }, { label: "Econometrics" }, { label: "Essays" }, { label: "Letter" },
          { label: "Email" }, { label: "Real Estate" }
        ];

        function element(tag, className, text) {
          var node = document.createElement(tag);
          if (className) node.className = className;
          if (text !== undefined) node.textContent = text;
          return node;
        }

        function notifyHeight() {
          if (window.openai && window.openai.notifyIntrinsicHeight) {
            window.openai.notifyIntrinsicHeight(document.documentElement.scrollHeight);
          } else if (bridgeReady) {
            sendBridgeMessage({
              jsonrpc: "2.0",
              method: "ui/notifications/size-changed",
              params: {
                width: Math.ceil(window.innerWidth),
                height: Math.ceil(document.documentElement.scrollHeight)
              }
            });
          }
        }

        function extractStructuredContent(value) {
          if (!value || typeof value !== "object") return null;
          if (Array.isArray(value.pages)) return value;
          if (value.structuredContent) return extractStructuredContent(value.structuredContent);
          if (value.toolOutput) return extractStructuredContent(value.toolOutput);
          if (value.toolResult) return extractStructuredContent(value.toolResult);
          if (value.result) return extractStructuredContent(value.result);
          return null;
        }

        function extractToolError(value) {
          if (!value || typeof value !== "object") return "";
          var result = value.call_tool_result || value.mcp_tool_result || value;
          if (!result || !result.isError || !Array.isArray(result.content)) return "";
          var first = result.content[0];
          return first && typeof first.text === "string" ? first.text : "Aipen could not render this page.";
        }

        function setData(value) {
          var data = extractStructuredContent(value);
          if (!data || !Array.isArray(data.pages) || !data.pages.length) return;
          state.data = data;
          state.error = "";
          state.busy = false;
          state.activePage = Math.min(state.activePage, data.pages.length - 1);
          state.selectedOptions = Object.assign({}, data.options);
          render();
        }

        function button(label, className, onClick) {
          var node = element("button", className, label);
          node.type = "button";
          node.disabled = state.busy;
          node.addEventListener("click", onClick);
          return node;
        }

        function assetDownloadUrl(url) {
          return url + (url.indexOf("?") === -1 ? "?" : "&") + "download=1";
        }

        function renderError() {
          var error = element("section", "error");
          error.appendChild(element("p", "", state.error || "Aipen could not render this page."));
          error.appendChild(button("Try again", "button primary", function () { regenerate({}); }));
          root.replaceChildren(error);
          notifyHeight();
        }

        function renderLoading() {
          var header = element("div", "header");
          header.appendChild(element("div", "brand", "aipen"));
          var loading = element("section", "loading");
          loading.appendChild(element("div", "skeleton"));
          loading.appendChild(element("p", "loading-message", "Thank you. ChatGPT is writing your notes (up to 1 min)."));
          root.replaceChildren(header, loading);
          notifyHeight();
        }

        function render() {
          if (state.error) return renderError();
          if (!state.data) return renderLoading();
          var data = state.data;
          var page = data.pages[state.activePage];
          var header = element("div", "header");
          header.appendChild(element("div", "brand", "aipen"));
          header.appendChild(element("div", "count", String(data.pageCount) + (data.pageCount === 1 ? " page" : " pages")));

          var previewWrap = element("div", "preview-wrap");
          var preview = document.createElement("img");
          preview.className = "paper";
          preview.src = page.url;
          preview.alt = "Handwritten Aipen page " + String(state.activePage + 1);
          preview.loading = "eager";
          previewWrap.appendChild(preview);

          var position = element("div", "page-meta", String(state.activePage + 1) + " / " + String(data.pageCount));
          var fragments = [header, previewWrap, position];

          if (data.pageCount > 1) {
            var thumbs = element("div", "thumbs");
            data.pages.forEach(function (item, index) {
              var thumb = element("button", "thumb");
              thumb.type = "button";
              thumb.setAttribute("aria-label", "Show page " + String(index + 1));
              thumb.setAttribute("aria-pressed", String(index === state.activePage));
              var image = document.createElement("img");
              image.src = item.url;
              image.alt = "";
              thumb.appendChild(image);
              thumb.addEventListener("click", function () { state.activePage = index; render(); });
              thumbs.appendChild(thumb);
            });
            fragments.push(thumbs);
          }

          var actions = element("div", "actions");
          var pdf = document.createElement("a");
          pdf.className = "button primary download";
          pdf.href = assetDownloadUrl(data.pdfUrl);
          pdf.target = "_blank";
          pdf.rel = "noopener";
          pdf.textContent = "Download PDF";
          actions.appendChild(pdf);
          var rewrite = button(state.busy ? "Rewriting..." : "Rewrite", "button", function () { regenerate(state.selectedOptions || data.options); });
          actions.insertBefore(rewrite, pdf);
          var toolbar = element("section", "toolbar");
          toolbar.append(renderControls(data.options), actions);
          fragments.push(toolbar);
          fragments.push(renderTemplates());
          root.replaceChildren.apply(root, fragments);
          notifyHeight();
        }

        function renderControls(current) {
          var controls = element("section", "controls");
          var selected = state.selectedOptions || current;
          controls.appendChild(renderFontControl(selected));
          [["Ink", "ink"], ["Paper", "paper"]].forEach(function (pair) {
            var label = pair[0];
            var key = pair[1];
            var control = element("div", "control");
            control.appendChild(element("span", "control-label", label));
            var select = document.createElement("select");
            select.className = "select";
            select.disabled = state.busy;
            select.setAttribute("aria-label", label);
            options[key].forEach(function (value) {
              var option = document.createElement("option");
              option.value = value;
              option.textContent = value.replace("-", " ");
              option.selected = selected[key] === value;
              select.appendChild(option);
            });
            select.addEventListener("change", function () {
              state.selectedOptions = Object.assign({}, selected, (function () { var patch = {}; patch[key] = select.value; return patch; })());
              render();
            });
            control.appendChild(select);
            controls.appendChild(control);
          });
          return controls;
        }

        function renderFontControl(selected) {
          var control = element("div", "control");
          control.appendChild(element("span", "control-label", "Font"));
          var picker = element("div", "font-picker");
          var trigger = element("button", "font-trigger", fontNames[selected.font] || "Classic");
          trigger.type = "button";
          trigger.disabled = state.busy;
          trigger.setAttribute("aria-expanded", String(state.fontMenuOpen));
          trigger.addEventListener("click", function () { state.fontMenuOpen = !state.fontMenuOpen; render(); });
          picker.appendChild(trigger);
          if (state.fontMenuOpen) {
            var menu = element("div", "font-menu");
            menu.setAttribute("role", "menu");
            options.font.forEach(function (value) {
              var option = element("button", "font-option", fontNames[value]);
              option.type = "button";
              option.setAttribute("role", "menuitemradio");
              option.setAttribute("aria-pressed", String(selected.font === value));
              option.addEventListener("click", function () {
                state.selectedOptions = Object.assign({}, selected, { font: value });
                state.fontMenuOpen = false;
                render();
              });
              menu.appendChild(option);
            });
            var upload = element("button", "upload-font");
            upload.type = "button";
            upload.disabled = true;
            upload.appendChild(element("span", "", "Upload your own font - Coming soon"));
            menu.appendChild(upload);
            picker.appendChild(menu);
          }
          control.appendChild(picker);
          return control;
        }

        function renderTemplates() {
          var section = element("section", "templates");
          section.appendChild(element("p", "graph-note", "Hand-drawn graphs and charts supported on request."));
          var head = element("div", "templates-head");
          head.appendChild(element("h2", "templates-title", "Make another note"));
          if (state.presetStatus) head.appendChild(element("span", "templates-status", state.presetStatus));
          section.appendChild(head);
          var list = element("div", "template-list");
          templates.forEach(function (template) {
            var preset = element("button", "template", template.label);
            preset.type = "button";
            preset.disabled = state.presetBusy;
            preset.addEventListener("click", function () { requestTemplate(template); });
            list.appendChild(preset);
          });
          section.appendChild(list);
          section.appendChild(element("p", "language-note", "Native handwriting supports English and major European languages: Afrikaans, Albanian, Catalan, Croatian, Czech, Danish, Dutch, Estonian, Finnish, French, German, Icelandic, Irish, Italian, Latvian, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Slovak, Slovenian, Spanish, Swedish, Turkish and Welsh. Other languages coming soon."));
          return section;
        }

        async function requestTemplate(template) {
          if (state.presetBusy) return;
          var name = template.label;
          state.presetBusy = true;
          state.presetStatus = "Starting " + name + "...";
          render();
          var prompt = template.prompt || ("I want a new set of " + name + " notes, separate from the document above. Please write the actual note content and use Aipen to turn it into a new handwritten PDF. For math or science, wrap every expression in dollar signs. Do not reuse the previous notes.");
          try {
            if (window.openai && typeof window.openai.sendFollowUpMessage === "function") {
              await window.openai.sendFollowUpMessage({ prompt: prompt, scrollToBottom: true });
            } else {
              sendBridgeMessage({ jsonrpc: "2.0", method: "ui/message", params: { prompt: prompt } });
            }
            state.presetStatus = name + " request sent";
          } catch (error) {
            state.presetStatus = "Could not start " + name;
          }
          state.presetBusy = false;
          render();
        }

        function bridgeCall(name, args) {
          return new Promise(function (resolve, reject) {
            var id = "aipen-" + String(++requestNumber);
            var timeout = setTimeout(function () { pending.delete(id); reject(new Error("The render request timed out.")); }, 65000);
            pending.set(id, { resolve: resolve, reject: reject, timeout: timeout });
            window.parent.postMessage({ jsonrpc: "2.0", id: id, method: "tools/call", params: { name: name, arguments: args } }, "*");
          });
        }

        function sendBridgeMessage(message) {
          window.parent.postMessage(message, "*");
        }

        function beginHandshake() {
          var id = "aipen-initialize-" + String(++requestNumber);
          sendBridgeMessage({
            jsonrpc: "2.0",
            id: id,
            method: "ui/initialize",
            params: {
              appInfo: { name: "aipen", version: "1.0.0" },
              appCapabilities: { availableDisplayModes: ["inline"] },
              protocolVersion: "2026-01-26"
            }
          });
          return id;
        }

        function announceInitialized() {
          bridgeReady = true;
          sendBridgeMessage({
            jsonrpc: "2.0",
            method: "ui/notifications/initialized",
            params: {}
          });
        }

        async function regenerate(patch) {
          if (!state.data || state.busy) return;
          state.busy = true;
          render();
          var args = Object.assign({}, state.data.options, patch);
          try {
            var result;
            if (window.openai && window.openai.callTool) result = await window.openai.callTool("make_handwriting", args);
            else result = await bridgeCall("make_handwriting", args);
            if (result && result.isError) throw new Error(result.content && result.content[0] && result.content[0].text || "Aipen could not re-render this page.");
            if (result && result.structuredContent) setData(result.structuredContent);
            else { state.busy = false; render(); }
          } catch (error) {
            state.busy = false;
            state.error = error && error.message ? error.message : "Aipen could not re-render this page.";
            render();
          }
        }

        window.addEventListener("message", function (event) {
          if (event.source !== window.parent || !event.data || event.data.jsonrpc !== "2.0") return;
          var message = event.data;
          if (message.id && message.id === initializeRequestId) {
            if (message.error) {
              state.error = "Aipen could not connect to the ChatGPT app bridge.";
              render();
            } else {
              announceInitialized();
            }
            return;
          }
          if (message.id && pending.has(message.id)) {
            var call = pending.get(message.id);
            clearTimeout(call.timeout);
            pending.delete(message.id);
            if (message.error) call.reject(new Error(message.error.message || "Tool call failed."));
            else call.resolve(message.result);
          }
          if (message.method === "ui/notifications/tool-result") {
            if (message.params && message.params.isError) {
              state.error = message.params.content && message.params.content[0] && message.params.content[0].text || "Aipen could not render this page.";
              state.busy = false;
              render();
            } else setData(message.params);
          }
        }, { passive: true });

        window.addEventListener("openai:set_globals", function (event) {
          var globals = event.detail && event.detail.globals;
          if (globals) setData(globals);
        }, { passive: true });

        if (window.openai && window.openai.toolOutput) setData(window.openai.toolOutput);
        if (!state.data && window.openai && window.openai.toolResponseMetadata) {
          state.error = extractToolError(window.openai.toolResponseMetadata);
        }
        var initializeRequestId = beginHandshake();
        render();
      })();
    </script>
  </body>
</html>`;
