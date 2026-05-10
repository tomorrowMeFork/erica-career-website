(() => {
  // biome-ignore lint/suspicious/noRedundantUseStrict: this file is pasted into browser consoles, not loaded as an ES module.
  "use strict";

  const allowedHost = "cdp.hanyang.ac.kr";
  const allowedBoards = ["채용상담 및 설명회", "일반채용공고"];
  const defaultFetchDelayMs = 1200;
  const detailPathPattern =
    /(?:\/Career\/Job\/[A-Za-z0-9]*View\d*\.aspx|\/Office\/SiteMgr\/Notice\/FuncScheView\.aspx)$/u;
  const listPathPattern =
    /(?:\/Career\/Job\/(?:RecruitList\d*|AlbaList|RecruitEvent)\.aspx|\/Office\/SiteMgr\/Notice\/FuncScheList\.aspx|\/Community\/Notice\/RecruitEvent\.aspx)$/u;

  if (window.location.hostname !== allowedHost) {
    throw new Error(`CDP export script must run on ${allowedHost}.`);
  }

  const clean = (value) =>
    (value ?? "")
      .replace(/\u00a0/gu, " ")
      .replace(/\r\n?/gu, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/gu, " ").trim())
      .filter((line) => line.length > 0)
      .join("\n")
      .trim();

  const cleanInline = (value) => clean(value).replace(/\n+/gu, " ").trim();

  const sanitizeCdpUrl = (href) => {
    try {
      const url = new URL(href, window.location.href);
      url.hash = "";
      if (url.protocol !== "https:" || url.hostname !== allowedHost) {
        return null;
      }
      url.username = "";
      url.password = "";
      return url.toString();
    } catch (_error) {
      return null;
    }
  };

  const toCdpDetailUrl = (href) => {
    const url = sanitizeCdpUrl(href);
    if (!url) {
      return null;
    }
    return detailPathPattern.test(new URL(url).pathname) ? url : null;
  };

  const toCdpListUrl = (href) => {
    const url = sanitizeCdpUrl(href);
    if (!url) {
      return null;
    }
    return listPathPattern.test(new URL(url).pathname) ? url : null;
  };

  const listUrlFromScriptText = (scriptText, baseUrl) => {
    const text = scriptText ?? "";
    const hcSubmit = text.match(
      /hcSubmit\s*\(\s*['"]([^'"]+\.aspx\?[^'"]*)['"]/iu,
    );
    if (hcSubmit) {
      return toCdpListUrl(new URL(hcSubmit[1], baseUrl).toString());
    }

    const directListPath = text.match(
      /(?:https?:\/\/cdp\.hanyang\.ac\.kr)?(\/(?:Career\/Job\/(?:RecruitList\d*|AlbaList|RecruitEvent)|Office\/SiteMgr\/Notice\/FuncScheList|Community\/Notice\/RecruitEvent)\.aspx\?[^'"\s)]+)/u,
    );
    if (directListPath) {
      return toCdpListUrl(new URL(directListPath[0], baseUrl).toString());
    }

    return null;
  };

  const isFuncSchePageUrl = (href) => {
    const url = sanitizeCdpUrl(href);
    if (!url) {
      return false;
    }
    return /\/Office\/SiteMgr\/Notice\/FuncSche(?:List|View)\.aspx$/u.test(
      new URL(url).pathname,
    );
  };

  const isRecruitEventPageUrl = (href) => {
    const url = sanitizeCdpUrl(href);
    if (!url) {
      return false;
    }
    return /\/Community\/Notice\/RecruitEvent\.aspx$/u.test(
      new URL(url).pathname,
    );
  };

  const isEventSchedulePageUrl = (href) =>
    isFuncSchePageUrl(href) || isRecruitEventPageUrl(href);

  const funcScheDetailUrlFromId = (funcidx, baseUrl) => {
    if (!/^\d+$/u.test(funcidx ?? "") || !isEventSchedulePageUrl(baseUrl)) {
      return null;
    }
    const url = new URL(baseUrl, window.location.href);
    url.pathname = "/Office/SiteMgr/Notice/FuncScheView.aspx";
    url.search = "";
    url.searchParams.set("funcidx", funcidx);
    url.hash = "";
    return toCdpDetailUrl(url.toString());
  };

  const detailUrlFromScriptText = (scriptText, baseUrl) => {
    const text = scriptText ?? "";
    const directPath = text.match(
      /(?:https?:\/\/cdp\.hanyang\.ac\.kr)?(\/(?:Career\/Job\/[A-Za-z0-9]*View\d*|Office\/SiteMgr\/Notice\/FuncScheView)\.aspx\?[^'"\s)]+)/u,
    );
    if (directPath) {
      return toCdpDetailUrl(directPath[0]);
    }

    const relativePath = text.match(/([A-Za-z0-9]*View\d*\.aspx\?[^'"\s)]+)/u);
    if (relativePath) {
      return toCdpDetailUrl(relativePath[0]);
    }

    const explicitFuncidx = text.match(/funcidx\s*[=:,]\s*['"]?(\d+)['"]?/iu);
    if (explicitFuncidx) {
      return funcScheDetailUrlFromId(explicitFuncidx[1], baseUrl);
    }

    const queryFuncidx = text.match(/[?&]funcidx=(\d{1,10})/iu);
    if (queryFuncidx) {
      return funcScheDetailUrlFromId(queryFuncidx[1], baseUrl);
    }

    const quotedFuncSchePath = text.match(
      /FuncScheView\.aspx\?[^'"\s)]*funcidx=(\d{1,10})/iu,
    );
    if (quotedFuncSchePath) {
      return funcScheDetailUrlFromId(quotedFuncSchePath[1], baseUrl);
    }

    const postBackFuncidx = text.match(
      /__doPostBack\s*\([^)]*(?:funcidx|FuncSche|Sche|View|Detail)[^)]*?(\d{2,10})/iu,
    );
    if (postBackFuncidx) {
      return funcScheDetailUrlFromId(postBackFuncidx[1], baseUrl);
    }

    const funcScheFunction = text.match(
      /(?:funcsche|sche|schedule|event|view|detail|goView|goDetail|fnView|fn_View|showDetail|openDetail|viewDetail)\w*\s*\(\s*['"]?(\d{2,10})['"]?/iu,
    );
    if (
      funcScheFunction &&
      (isEventSchedulePageUrl(baseUrl) ||
        /funcsche|FuncSche|행사|상담|설명회|박람회/u.test(text))
    ) {
      return funcScheDetailUrlFromId(funcScheFunction[1], baseUrl);
    }

    return null;
  };

  const detailUrlFromElement = (element, baseUrl) => {
    const href = element.getAttribute("href");
    let hrefUrl = null;
    try {
      hrefUrl = href ? toCdpDetailUrl(new URL(href, baseUrl).toString()) : null;
    } catch (_error) {
      hrefUrl = null;
    }
    if (hrefUrl) {
      return hrefUrl;
    }

    const scriptUrl = detailUrlFromScriptText(
      [
        href,
        element.getAttribute("value"),
        element.getAttribute("aria-label"),
        element.getAttribute("onclick"),
        element.getAttribute("data-url"),
        element.getAttribute("data-href"),
        element.getAttribute("data-funcidx")
          ? `funcidx=${element.getAttribute("data-funcidx")}`
          : null,
        element.getAttribute("data-func-idx")
          ? `funcidx=${element.getAttribute("data-func-idx")}`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      baseUrl,
    );
    if (scriptUrl) {
      return scriptUrl;
    }

    const scopedFuncScheId = funcScheIdFromElement(element, baseUrl);
    if (scopedFuncScheId) {
      return scopedFuncScheId;
    }

    return null;
  };

  const funcScheIdFromElement = (element, baseUrl) => {
    if (!isEventSchedulePageUrl(baseUrl)) {
      return null;
    }

    const eventContainer =
      element.closest(
        "article, li, tr, .card, .item, .list, [class*='card'], [class*='item'], [class*='list']",
      ) ?? element;
    const contextText = cleanInline(eventContainer.textContent ?? "");
    const looksLikeEvent =
      /자세히 보기|기간\s*:|장소\s*:|행사구분\s*:|채용상담회|채용설명회|채용박람회/u.test(
        contextText,
      );
    const looksLikeFilter =
      /달력보기|목록보기|상세검색|대상학년|search|검색$/u.test(contextText) &&
      contextText.length < 200;
    if (!looksLikeEvent || looksLikeFilter) {
      return null;
    }

    const candidate = [
      element.getAttribute("data-idx"),
      element.getAttribute("data-id"),
      element.getAttribute("data-seq"),
      element.getAttribute("value"),
    ].find((value) => /^\d{2,10}$/u.test(value ?? ""));

    return candidate ? funcScheDetailUrlFromId(candidate, baseUrl) : null;
  };

  const inferBoard = () => {
    const pageText = cleanInline(document.body?.innerText ?? "");
    return (
      allowedBoards.find((board) => pageText.includes(board)) ??
      allowedBoards[1]
    );
  };

  const askBoard = () => {
    const message = [
      "CDP 게시판명을 입력하세요.",
      `허용값: ${allowedBoards.join(" / ")}`,
      "기본값은 현재 화면에서 추정한 값입니다.",
    ].join("\n");
    const selected = window.prompt(message, inferBoard())?.trim() ?? "";
    if (!allowedBoards.includes(selected)) {
      throw new Error(`board must be one of: ${allowedBoards.join(", ")}`);
    }
    return selected;
  };

  const unique = (values) => Array.from(new Set(values));

  const collectDetailUrlsFromDocument = (doc, baseUrl) => {
    const urls = Array.from(
      doc.querySelectorAll(
        "a[href], button, input[type='button'], input[type='submit'], [role='button'], [onclick], [data-url], [data-href], [data-funcidx], [data-func-idx], [data-idx], [data-id], [data-seq], [class*='btn'], [class*='more'], [class*='detail'], [class*='view']",
      ),
    )
      .map((element) => detailUrlFromElement(element, baseUrl))
      .filter(Boolean);

    const currentUrl = toCdpDetailUrl(baseUrl);
    if (currentUrl) {
      urls.unshift(currentUrl);
    }

    return unique(urls);
  };

  const diagnosticElement = (element) => ({
    tag: element.tagName?.toLowerCase() ?? "",
    id: element.getAttribute("id"),
    className: element.getAttribute("class"),
    name: element.getAttribute("name"),
    type: element.getAttribute("type"),
    value: element.getAttribute("value"),
    text: cleanInline(element.textContent ?? "").slice(0, 240),
    href: element.getAttribute("href"),
    onclick: element.getAttribute("onclick"),
    dataUrl: element.getAttribute("data-url"),
    dataHref: element.getAttribute("data-href"),
    dataFuncidx: element.getAttribute("data-funcidx"),
    dataFuncIdx: element.getAttribute("data-func-idx"),
    dataIdx: element.getAttribute("data-idx"),
    dataId: element.getAttribute("data-id"),
    dataSeq: element.getAttribute("data-seq"),
    ariaLabel: element.getAttribute("aria-label"),
    role: element.getAttribute("role"),
    dataset: { ...element.dataset },
    closestText: cleanInline(
      (
        element.closest(
          "article, li, tr, .card, .item, .list, [class*='card'], [class*='item'], [class*='list'], [class*='event'], [class*='sche'], [class*='recruit']",
        ) ?? element
      ).textContent ?? "",
    ).slice(0, 500),
    outerHTML: element.outerHTML.slice(0, 1000),
  });

  const collectDiagnostics = () => {
    const bodyText = cleanInline(document.body?.innerText ?? "");
    const diagnosticRoot = document.cloneNode(true);
    diagnosticRoot
      .querySelectorAll("script, style, noscript, iframe, header, nav, footer")
      .forEach((element) => {
        element.remove();
      });
    const selector =
      "a[href], button, input[type='button'], input[type='submit'], [role='button'], [onclick], [data-url], [data-href], [data-funcidx], [data-func-idx], [data-idx], [data-id], [data-seq], [class*='btn'], [class*='more'], [class*='detail'], [class*='view']";
    const elements = Array.from(diagnosticRoot.querySelectorAll(selector));
    const relevantElements = elements.filter((element) => {
      const text = cleanInline(element.textContent ?? "");
      const attrs = [
        element.getAttribute("href"),
        element.getAttribute("onclick"),
        element.getAttribute("data-url"),
        element.getAttribute("data-href"),
        element.getAttribute("data-funcidx"),
        element.getAttribute("data-func-idx"),
        element.getAttribute("data-idx"),
        element.getAttribute("data-id"),
        element.getAttribute("data-seq"),
        element.getAttribute("class"),
        element.getAttribute("id"),
      ]
        .filter(Boolean)
        .join(" ");

      return /자세히 보기|기간\s*:|장소\s*:|행사구분\s*:|채용상담회|채용설명회|채용박람회|D[+-]?\d+|funcidx|FuncSche|View|view|detail|event|sche/iu.test(
        `${text} ${attrs}`,
      );
    });

    const eventLikeContainers = Array.from(
      diagnosticRoot.querySelectorAll(
        "article, li, tr, .card, .item, .list, [class*='card'], [class*='item'], [class*='list'], [class*='event'], [class*='sche'], [class*='recruit']",
      ),
    )
      .map((element, index) => ({
        index,
        tag: element.tagName?.toLowerCase() ?? "",
        id: element.getAttribute("id"),
        className: element.getAttribute("class"),
        text: cleanInline(element.textContent ?? "").slice(0, 500),
        dataset: { ...element.dataset },
        outerHTML: element.outerHTML.slice(0, 1000),
      }))
      .filter((entry) =>
        /기간\s*:|장소\s*:|행사구분\s*:|자세히 보기|채용상담회|채용설명회|채용박람회/u.test(
          entry.text,
        ),
      )
      .slice(0, 80);

    const scriptHints = Array.from(document.scripts)
      .map((script, index) => ({
        index,
        src: script.src || null,
        text: cleanInline(script.textContent ?? "").slice(0, 2000),
      }))
      .filter((entry) =>
        /funcidx|FuncSche|FuncScheView|RecruitEvent|자세히|detail|view|sche|event|행사/iu.test(
          `${entry.src ?? ""} ${entry.text}`,
        ),
      )
      .slice(0, 30)
      .map((entry) => ({ ...entry, text: entry.text.slice(0, 1000) }));

    const forms = Array.from(document.forms)
      .slice(0, 20)
      .map((form) => ({
        action: form.getAttribute("action"),
        method: form.getAttribute("method"),
        id: form.getAttribute("id"),
        name: form.getAttribute("name"),
        inputNames: Array.from(form.querySelectorAll("input, select, textarea"))
          .slice(0, 120)
          .map((input) => ({
            tag: input.tagName?.toLowerCase() ?? "",
            type: input.getAttribute("type"),
            name: input.getAttribute("name"),
            id: input.getAttribute("id"),
          })),
      }));

    return {
      page_url: window.location.href,
      page_title: document.title,
      body_preview: bodyText.slice(0, 1200),
      body_tail: bodyText.slice(-2000),
      counts: {
        diagnostic_elements: elements.length,
        relevant_elements: relevantElements.length,
        forms: document.forms.length,
        scripts: document.scripts.length,
      },
      relevant_elements: relevantElements.slice(0, 300).map(diagnosticElement),
      event_like_containers: eventLikeContainers,
      elements: elements.slice(0, 240).map(diagnosticElement),
      script_hints: scriptHints,
      forms,
    };
  };

  const collectListUrlsFromDocument = (doc, baseUrl, allowedPathname) => {
    const elements = Array.from(
      doc.querySelectorAll(
        "a[href], [onclick], button, input[type='button'], input[type='submit']",
      ),
    );
    const urls = elements.flatMap((element) => {
      const candidates = [];
      const href = element.getAttribute("href");
      if (href) {
        try {
          candidates.push(toCdpListUrl(new URL(href, baseUrl).toString()));
        } catch (_error) {
          candidates.push(null);
        }
        candidates.push(listUrlFromScriptText(href, baseUrl));
      }

      candidates.push(
        listUrlFromScriptText(element.getAttribute("onclick"), baseUrl),
      );

      return candidates.filter((url) => {
        if (!url) {
          return false;
        }
        return new URL(url).pathname === allowedPathname;
      });
    });

    return unique(urls);
  };

  const collectListPageUrls = async () => {
    const startUrl = toCdpListUrl(window.location.href) ?? window.location.href;
    const allowedPathname = new URL(startUrl).pathname;
    const queue = [startUrl];
    const seen = new Set();
    const maxListPages = 200;

    for (let index = 0; index < queue.length; index += 1) {
      if (queue.length > maxListPages) {
        throw new Error(
          `Too many CDP list pages discovered; stopped at ${maxListPages}.`,
        );
      }

      const pageUrl = queue[index];
      if (seen.has(pageUrl)) {
        continue;
      }
      seen.add(pageUrl);

      const doc =
        pageUrl === startUrl || pageUrl === window.location.href
          ? document
          : await fetchDocument(pageUrl);

      for (const nextUrl of collectListUrlsFromDocument(
        doc,
        pageUrl,
        allowedPathname,
      )) {
        if (!seen.has(nextUrl) && !queue.includes(nextUrl)) {
          queue.push(nextUrl);
        }
      }
    }

    const listPageUrls = Array.from(seen);
    console.log("[CDP export] List pages discovered:", listPageUrls);
    return listPageUrls;
  };

  const fetchDocument = async (url) => {
    await delayBeforeFetch();
    const response = await window.fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  };

  const delayBeforeFetch = async () => {
    const override = Number(window.__CDP_EXPORT_FETCH_DELAY_MS__);
    const delayMs = Number.isFinite(override) && override >= 0
      ? override
      : defaultFetchDelayMs;
    if (delayMs === 0) {
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  };

  const removeNoise = (doc) => {
    for (const selector of [
      "script",
      "style",
      "noscript",
      "iframe",
      "input[type='hidden']",
      "header",
      "nav",
      "footer",
    ]) {
      doc.querySelectorAll(selector).forEach((element) => {
        element.remove();
      });
    }
  };

  const firstText = (doc, selectors) => {
    for (const selector of selectors) {
      const text = cleanInline(doc.querySelector(selector)?.textContent ?? "");
      if (text.length > 0) {
        return text;
      }
    }
    return "";
  };

  const extractTitle = (doc) => {
    const title = firstText(doc, [
      ".subject",
      ".board-view .title",
      ".view-title",
      ".view_title",
      "[id*='lblTitle']",
      "[id*='lbTitle']",
      "[id*='Title']",
      "td.title",
      "th.title",
      "h1",
      "h2",
      "h3",
    ]);

    if (title.length > 0) {
      return title.replace(/\s+Hit\s+\d+(?:\s+New)?$/iu, "").trim();
    }

    const lines = clean(doc.body?.innerText ?? "").split("\n");
    const likely = lines.find((line) =>
      /채용|인턴|설명회|상담|모집|공고/u.test(line),
    );
    return cleanInline(likely ?? doc.title)
      .replace(/\s+Hit\s+\d+(?:\s+New)?$/iu, "")
      .trim();
  };

  const extractBody = (doc) => {
    removeNoise(doc);
    const selectors = [
      ".board-view .content",
      ".view-content",
      ".view_content",
      ".content",
      ".contents",
      "#contents",
      "#content",
      "main",
      "form",
      "body",
    ];

    for (const selector of selectors) {
      const text = clean(doc.querySelector(selector)?.innerText ?? "");
      if (text.length >= 20) {
        return text;
      }
    }

    return clean(doc.body?.innerText ?? "");
  };

  const extractPostedAt = (text) => {
    const match = text.match(
      /(?:등록일|작성일|게시일|Date)?\s*(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/u,
    );
    if (!match) {
      return null;
    }
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`;
  };

  const deadlineRawText = (text) => {
    const patterns = [
      /채용시까지/u,
      /상시채용/u,
      /(?:마감|접수(?:기간)?|지원(?:기간)?|신청(?:기간)?)[^\n]{0,40}(20\d{2}[.\-/년\s]+\d{1,2}[.\-/월\s]+\d{1,2})/u,
      /[~～]\s*(20\d{2}[.\-/년\s]+\d{1,2}[.\-/월\s]+\d{1,2})/u,
      /[~～]\s*(\d{1,2}[.\-/]\d{1,2})/u,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return cleanInline(match[0]);
      }
    }

    return "";
  };

  const parseDeadlineDate = (rawText, exportedAt) => {
    if (/채용시까지|상시채용/u.test(rawText)) {
      return null;
    }

    const full = rawText.match(
      /(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/u,
    );
    if (full) {
      return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
    }

    const short = rawText.match(/(\d{1,2})[.\-/](\d{1,2})/u);
    if (short) {
      return `${exportedAt.getFullYear()}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;
    }

    return null;
  };

  const classifyDeadline = (rawText, exportedAt) => {
    if (!rawText) {
      return "unknown";
    }
    if (/채용시까지|상시채용/u.test(rawText)) {
      return "active";
    }

    const date = parseDeadlineDate(rawText, exportedAt);
    if (!date) {
      return "unknown";
    }

    const deadline = new Date(`${date}T23:59:59+09:00`);
    return deadline < exportedAt ? "expired" : "active";
  };

  const extractPost = async (url, board, exportedAt) => {
    const doc = await fetchDocument(url);
    return extractPostFromDocument(doc, url, board, exportedAt);
  };

  const extractPostFromDocument = (doc, url, board, exportedAt) => {
    const title = extractTitle(doc);
    const bodyText = extractBody(doc);
    if (isCdpErrorPage(title, bodyText)) {
      console.warn(`[CDP export] Skipped CDP error page: ${url}`);
      return null;
    }
    if (title.length === 0 || bodyText.length < 20) {
      console.warn(`[CDP export] Skipped page with empty title/body: ${url}`);
      return null;
    }
    if (isLikelyListPage(doc, bodyText, url)) {
      console.warn(`[CDP export] Skipped likely list page: ${url}`);
      return null;
    }
    const combinedText = `${title}\n${bodyText}`;
    const rawDeadline = deadlineRawText(combinedText);

    return {
      board,
      title,
      detail_url: url,
      posted_at: extractPostedAt(combinedText),
      deadline_status: classifyDeadline(rawDeadline, exportedAt),
      deadline_raw_text: rawDeadline,
      body_text: bodyText,
    };
  };

  const isCdpErrorPage = (title, bodyText) => {
    const text = cleanInline(`${title}\n${bodyText}`);
    return (
      title.length === 0 &&
      /오류입니다.*불편을 드려 죄송합니다.*오류번호/u.test(text)
    );
  };

  const isLikelyListPage = (doc, bodyText, pageUrl = window.location.href) => {
    const pageText = cleanInline(bodyText);
    const url = sanitizeCdpUrl(pageUrl);
    const path = url ? new URL(url).pathname : window.location.pathname;
    const listPath = listPathPattern.test(path);
    const listWords = [
      "달력보기",
      "목록보기",
      "상세검색",
      "검색",
      "전체",
      "관심 채용행사",
      "자세히 보기",
      "대상학년",
      "행사구분",
    ];
    const listWordHits = listWords.filter((word) =>
      pageText.includes(word),
    ).length;
    const repeatedDetailButtons = (pageText.match(/자세히 보기/gu) ?? [])
      .length;
    const repeatedPeriods = (pageText.match(/기간\s*:/gu) ?? []).length;
    const rowCount = doc.querySelectorAll(
      "tr, li, article, .card, .list, [class*='list']",
    ).length;

    return (
      (listPath && listWordHits >= 3) ||
      listWordHits >= 5 ||
      repeatedDetailButtons >= 3 ||
      repeatedPeriods >= 5 ||
      (rowCount >= 20 && listWordHits >= 3)
    );
  };

  const downloadJson = (data, prefix = "cdp-manual-posts") => {
    const timestamp = (data.exported_at ?? new Date().toISOString()).replace(
      /[:.]/gu,
      "-",
    );
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${prefix}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadDiagnostics = () => {
    const diagnostics = {
      exported_at: new Date().toISOString(),
      message:
        "No direct CDP detail URL was found. Share this file if the exporter needs to be adapted.",
      ...collectDiagnostics(),
    };
    downloadJson(diagnostics, "cdp-export-diagnostics");
    console.table(diagnostics.elements);
    return diagnostics;
  };

  const currentDocumentClone = () =>
    new DOMParser().parseFromString(
      document.documentElement.outerHTML,
      "text/html",
    );

  const extractVisiblePagePost = (board, exportedAt) => {
    const currentUrl = sanitizeCdpUrl(window.location.href);
    if (!currentUrl) {
      return null;
    }

    const previewDoc = currentDocumentClone();
    const title = extractTitle(previewDoc);
    const bodyText = extractBody(currentDocumentClone());
    if (isLikelyListPage(currentDocumentClone(), bodyText, currentUrl)) {
      console.warn(
        "[CDP export] Current page looks like a list/search page, not a detail page. Visible-page fallback disabled.",
      );
      return null;
    }
    if (
      isCdpErrorPage(title, bodyText) ||
      title.length === 0 ||
      bodyText.length < 20
    ) {
      return null;
    }

    const confirmed = window.confirm(
      [
        "직접 연결된 상세 URL을 찾지 못했습니다.",
        "현재 화면이 열려 있는 CDP 게시글 상세라면 이 화면 자체를 1개 게시글로 저장할 수 있습니다.",
        "목록 화면이면 취소하세요.",
        "",
        `제목 후보: ${title}`,
        `본문 미리보기: ${cleanInline(bodyText).slice(0, 300)}`,
      ].join("\n"),
    );
    if (!confirmed) {
      return null;
    }

    return extractPostFromDocument(
      currentDocumentClone(),
      currentUrl,
      board,
      exportedAt,
    );
  };

  const run = async () => {
    const board = askBoard();
    const includeLinkedPages = window.confirm(
      "현재 목록 페이지에 보이는 페이지 링크도 함께 확인할까요?\n\n확인: 현재 페이지와 보이는 페이지 링크 수집\n취소: 현재 화면에 보이는 상세 링크만 수집",
    );
    const exportedAt = new Date();
    const listPageUrls = includeLinkedPages
      ? await collectListPageUrls()
      : [window.location.href];
    const detailUrls = [];

    for (const pageUrl of listPageUrls) {
      const doc =
        pageUrl === window.location.href
          ? document
          : await fetchDocument(pageUrl);
      detailUrls.push(...collectDetailUrlsFromDocument(doc, pageUrl));
    }

    const uniqueDetailUrls = unique(detailUrls);
    if (uniqueDetailUrls.length === 0) {
      const visiblePost = extractVisiblePagePost(board, exportedAt);
      if (visiblePost) {
        const output = {
          exported_at: exportedAt.toISOString(),
          posts: [visiblePost],
        };
        downloadJson(output);
        console.log(
          "[CDP export] Done. Current visible page exported:",
          output,
        );
        return output;
      }

      downloadDiagnostics();
      throw new Error(
        "No direct CDP detail links were found. I downloaded a cdp-export-diagnostics JSON file. Open one detail page and rerun, or send that diagnostics file so the extractor can be adapted.",
      );
    }

    const posts = [];
    for (let index = 0; index < uniqueDetailUrls.length; index += 1) {
      const url = uniqueDetailUrls[index];
      console.log(
        `[CDP export] ${index + 1}/${uniqueDetailUrls.length}: ${url}`,
      );
      const post = await extractPost(url, board, exportedAt);
      if (post) {
        posts.push(post);
      }
    }

    if (posts.length === 0) {
      downloadDiagnostics();
      throw new Error(
        "All detected CDP detail URLs returned CDP error pages. I downloaded a diagnostics JSON file; send it here or run the script on an opened detail page.",
      );
    }

    const output = {
      exported_at: exportedAt.toISOString(),
      posts,
    };

    downloadJson(output);
    console.log("[CDP export] Done. JSON downloaded:", output);
    return output;
  };

  run().catch((error) => {
    console.error("[CDP export] Failed:", error);
    window.alert(`CDP export failed: ${error.message}`);
  });
})();
