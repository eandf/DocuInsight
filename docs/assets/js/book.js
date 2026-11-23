(() => {
  const book = document.querySelector(".book");
  const stage = document.getElementById("bookStage");
  const chapters = Array.from(book.children, (page) => page.cloneNode(true));
  let pages = [];
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const hudNum = document.getElementById("hudNum");

  let total = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const flipMs = () => (reducedMotion.matches ? 260 : 780);

  let currentIndex = 0;
  let isFlipping = false;
  let layoutPending = false;
  let resizeTimer;

  // Trackpad inertia guard
  let wheelGestureLocked = false;
  let gestureEndTimer = null;
  let lastDir = 0;
  let accumulatedDelta = 0;

  const pad2 = (n) => String(n).padStart(2, "0");

  // Keep the original desktop layouts when they fit. Otherwise, pack
  // whole content blocks onto additional sheets at the same readable size.
  function chapterUnits(chapter) {
    const select = (selector) => Array.from(chapter.querySelectorAll(selector));
    const intro = chapter.querySelector(".split-40-60 > div:first-child");
    let units;
    switch (chapter.id) {
      case "top":
        units = select(
          ".hero-kicker, .hero-title-row, .hero-lead, .hero-actions, .dossier",
        );
        break;
      case "about":
        units = [intro, ...select(".origin-note, .video-figure")];
        break;
      case "opensource":
        units = select(".directory-intro, .directory-row");
        break;
      case "failure":
        units = [intro, ...select(".postmortem-lead, .pull-quote")];
        break;
      default:
        units = [
          intro,
          ...select(
            ".editorial-item, .team-row, .spec-row, .timeline-row, .site-footer",
          ),
        ];
    }
    return units.filter(Boolean).map((unit) => {
      const clone = unit.cloneNode(true);
      if (clone.matches("li")) {
        const list = document.createElement("ol");
        list.className = "editorial-list";
        list.appendChild(clone);
        return list;
      }
      return clone;
    });
  }

  function createSheet(chapter, part, flow = false, density = 1) {
    const page = chapter.cloneNode(!flow);
    page.classList.remove("is-active");
    page.classList.toggle("is-compact", density <= 0.92);
    page.style.setProperty("--page-density", density);
    page.id = part ? `${chapter.id}--${part + 1}` : chapter.id;
    page.dataset.chapter = chapter.id;
    page.dataset.part = part;
    page.tabIndex = -1;
    page.setAttribute("aria-hidden", "true");
    page.inert = true;
    if (flow) {
      const frame = document.createElement("div");
      frame.className = "book-page-scroll";
      const inner = document.createElement("div");
      inner.className = "book-page-inner";
      const content = document.createElement("div");
      content.className = "container page-flow";
      inner.appendChild(content);
      frame.appendChild(inner);
      page.appendChild(frame);
    }
    book.appendChild(page);
    return page;
  }

  function sheetFits(page) {
    const frame = page.querySelector(".book-page-scroll");
    const inner = page.querySelector(".book-page-inner");
    const content = inner.querySelector(".container");
    return (
      inner.offsetHeight <= frame.clientHeight - 2 &&
      content.scrollWidth <= content.clientWidth + 1
    );
  }

  // A single long card/paragraph can itself exceed a small landscape
  // screen. Split its DOM, preserving links and markup, never its text size.
  function splitUnit(unit, page) {
    const content = page.querySelector(".page-flow");
    function fragments(node, offset) {
      const range = document.createRange();
      range.selectNodeContents(unit);
      range.setEnd(node, offset);
      const first = unit.cloneNode(false);
      first.appendChild(range.cloneContents());
      range.selectNodeContents(unit);
      range.setStart(node, offset);
      const second = unit.cloneNode(false);
      second.appendChild(range.cloneContents());
      // Ranges ending at a node boundary can leave empty ancestor shells
      // (including empty links). They must not consume space or tab stops.
      for (const fragment of [first, second]) {
        for (const el of Array.from(fragment.querySelectorAll("*")).reverse()) {
          if (
            !el.textContent.trim() &&
            !el.matches("img, iframe, svg") &&
            !el.closest("svg") &&
            !el.querySelector("img, iframe, svg")
          )
            el.remove();
        }
      }
      const hasContent = (el) =>
        el.textContent.trim() || el.querySelector("img, iframe, svg");
      return hasContent(first) && hasContent(second) ? [first, second] : null;
    }
    function fits(fragment) {
      content.appendChild(fragment);
      const fits = sheetFits(page);
      fragment.remove();
      return fits;
    }

    // Prefer paragraph and metadata boundaries over breaking a sentence.
    let best = null;
    for (const block of unit.querySelectorAll(
      "p, .team-header, .team-role, .tag-list, .dossier-item, .dossier-repo, .footer-meta, .footer-links",
    )) {
      const offset =
        Array.prototype.indexOf.call(block.parentNode.childNodes, block) + 1;
      const pair = fragments(block.parentNode, offset);
      if (
        pair &&
        fits(pair[0]) &&
        (!best || pair[0].textContent.length > best[0].textContent.length)
      ) {
        best = pair;
      }
    }
    if (best) return best;

    const walker = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT);
    const points = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (const match of node.textContent.matchAll(/\S+\s*/g)) {
        points.push([node, match.index + match[0].length]);
      }
    }
    let low = 0;
    let high = points.length - 2;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const pair = fragments(...points[mid]);
      if (pair && fits(pair[0])) {
        best = pair;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  // A greedy fit can leave a nearly empty final sheet. Move whole blocks
  // forward when that balances neighboring sheets without overflowing or
  // changing the reading order.
  function balanceChapter(chapterId) {
    const sheets = Array.from(book.children).filter(
      (page) => page.dataset.chapter === chapterId,
    );
    for (let i = sheets.length - 1; i > 0; i--) {
      const previous = sheets[i - 1].querySelector(".page-flow");
      const next = sheets[i].querySelector(".page-flow");
      while (previous.children.length > 1) {
        const before = Math.abs(
          previous.getBoundingClientRect().height -
            next.getBoundingClientRect().height,
        );
        const block = previous.lastElementChild;
        next.prepend(block);
        const after = Math.abs(
          previous.getBoundingClientRect().height -
            next.getBoundingClientRect().height,
        );
        if (!sheetFits(sheets[i]) || after >= before) {
          previous.appendChild(block);
          break;
        }
      }
    }
  }

  function paginateChapter(chapter) {
    const original = createSheet(chapter, 0);
    if (sheetFits(original)) return;

    // Use the largest comfortable scale that fits before splitting a
    // chapter. Readable rem-based minimums still apply at every scale.
    for (const density of [0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72]) {
      original.style.setProperty("--page-density", density);
      original.classList.toggle("is-compact", density <= 0.92);
      if (sheetFits(original)) return;
    }

    // Keep the complete team together when a modest final reduction is
    // enough. Extremely short screens still get whole-card continuations.
    if (chapter.id === "team") {
      const frame = original.querySelector(".book-page-scroll");
      const inner = original.querySelector(".book-page-inner");
      const content = inner.querySelector(".container");
      const style = getComputedStyle(inner);
      const available =
        frame.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom) -
        2;
      const height = content.getBoundingClientRect().height;
      const scale = available / height;
      if (scale >= 0.85 && scale < 1) {
        const slot = document.createElement("div");
        slot.style.height = `${height * scale}px`;
        content.replaceWith(slot);
        slot.appendChild(content);
        content.style.transformOrigin = "top center";
        content.style.transform = `scale(${scale})`;
        if (sheetFits(original)) return;
      }
    }
    original.remove();

    let part = 0;
    const density = 0.72;
    let page = createSheet(chapter, part, true, density);
    const pending = chapterUnits(chapter);
    while (pending.length) {
      const unit = pending.shift();
      const content = page.querySelector(".page-flow");
      content.appendChild(unit);
      if (sheetFits(page)) continue;
      unit.remove();

      if (content.children.length) {
        page = createSheet(chapter, ++part, true, density);
        pending.unshift(unit);
        continue;
      }
      // Keep each team member's name, links and full bio together.
      // On exceptionally small screens, fit the whole card instead.
      const pair =
        chapter.id === "team" && unit.matches(".team-row")
          ? null
          : splitUnit(unit, page);
      if (pair) {
        pending.unshift(...pair);
        continue;
      }

      // Last resort for an indivisible image/logo on an unusually tiny
      // viewport. Text blocks normally take the DOM-splitting path above.
      content.appendChild(unit);
      const inner = page.querySelector(".book-page-inner");
      const style = getComputedStyle(inner);
      const available = Math.max(
        1,
        stage.clientHeight -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom) -
          2,
      );
      const rect = unit.getBoundingClientRect();
      const scale = Math.min(1, available / Math.max(1, rect.height));
      const slot = document.createElement("div");
      slot.style.height = `${rect.height * scale}px`;
      unit.replaceWith(slot);
      slot.appendChild(unit);
      unit.style.margin = "0";
      unit.style.width = `${rect.width}px`;
      unit.style.transformOrigin = "top left";
      unit.style.transform = `scale(${scale})`;
    }
    balanceChapter(chapter.id);
  }

  function rebuildPages(notify = true) {
    if (isFlipping) {
      layoutPending = true;
      return;
    }
    layoutPending = false;
    const previous = pages[currentIndex];
    const chapter = previous?.dataset.chapter;
    const part = Number(previous?.dataset.part || 0);
    const restoreFocus = book.contains(document.activeElement);
    book.replaceChildren();
    chapters.forEach(paginateChapter);
    pages = Array.from(book.children);
    total = pages.length;
    const matches = pages.filter((page) => page.dataset.chapter === chapter);
    const target = matches[Math.min(part, matches.length - 1)];
    setRestingState(target ? pages.indexOf(target) : 0, notify);
    if (previous) updateLocation(pages[currentIndex]);
    if (restoreFocus) pages[currentIndex].focus({ preventScroll: true });
  }

  function scheduleLayout() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuildPages, 120);
  }

  function updateLocation(page) {
    const hash = page.id === "top" ? "" : `#${page.id}`;
    if (window.location.hash !== hash) {
      history.replaceState(
        null,
        "",
        hash || window.location.pathname + window.location.search,
      );
    }
  }

  function updateHud(index) {
    hudNum.textContent = `${pad2(index + 1)} / ${pad2(total)}`;
    prevBtn.disabled = total < 2;
    nextBtn.disabled = total < 2;
  }

  function notifyParentPage(isCover) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "docuinsight:page", isCover: Boolean(isCover) },
        "*",
      );
    }
  }

  function setRestingState(index, notify = true) {
    pages.forEach((page, i) => {
      page.classList.remove(
        "is-active",
        "is-under",
        "is-revealing",
        "is-covering",
        "is-flipping-out",
        "is-flipping-in",
      );
      if (i === index) {
        page.classList.add("is-active");
        page.removeAttribute("aria-hidden");
        page.inert = false;
      } else {
        page.setAttribute("aria-hidden", "true");
        page.inert = true;
      }
    });
    currentIndex = index;
    updateHud(index);
    if (notify) notifyParentPage(index === 0);
  }

  function goToPage(targetIndex, options = {}) {
    const { updateHash = true } = options;
    if (isFlipping || total < 2) return;

    // Keep the requested turn direction when wrapping around the book.
    const forward = targetIndex > currentIndex;
    if (targetIndex === -1) targetIndex = total - 1;
    else if (targetIndex === total) targetIndex = 0;
    if (targetIndex < 0 || targetIndex >= total || targetIndex === currentIndex)
      return;

    isFlipping = true;
    if (targetIndex !== 0) notifyParentPage(false);
    const fromPage = pages[currentIndex];
    const toPage = pages[targetIndex];
    const moveFocus = fromPage.contains(document.activeElement);
    fromPage.inert = true;

    // Clear any lingering animation classes
    fromPage.classList.remove(
      "is-active",
      "is-under",
      "is-revealing",
      "is-covering",
      "is-flipping-out",
      "is-flipping-in",
    );
    toPage.classList.remove(
      "is-active",
      "is-under",
      "is-revealing",
      "is-covering",
      "is-flipping-out",
      "is-flipping-in",
    );

    // Force reflow so rapid consecutive flips always restart cleanly
    void toPage.offsetWidth;

    let animatingPage;
    if (forward) {
      toPage.classList.add("is-under", "is-revealing");
      fromPage.classList.add("is-flipping-out");
      animatingPage = fromPage;
    } else {
      fromPage.classList.add("is-under", "is-covering");
      toPage.classList.add("is-flipping-in");
      animatingPage = toPage;
    }

    updateHud(targetIndex);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      animatingPage.removeEventListener("animationend", onAnimEnd);
      setRestingState(targetIndex);
      isFlipping = false;
      if (updateHash) updateLocation(toPage);
      if (moveFocus) toPage.focus({ preventScroll: true });
      if (layoutPending) rebuildPages();
    };

    const onAnimEnd = (e) => {
      if (
        e.target === animatingPage &&
        (e.animationName === "pageFlipOut" || e.animationName === "pageFlipIn")
      )
        finish();
    };

    animatingPage.addEventListener("animationend", onAnimEnd);
    window.setTimeout(finish, flipMs() + 60);
  }

  // Button controls
  prevBtn.addEventListener("click", () => goToPage(currentIndex - 1));
  nextBtn.addEventListener("click", () => goToPage(currentIndex + 1));

  // Internal anchor links (#failure, #about, #top, etc.)
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    if (!id) return;
    const targetIdx = pages.findIndex((p) => p.id === id);
    if (targetIdx !== -1) {
      e.preventDefault();
      goToPage(targetIdx);
    }
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowDown" ||
      e.key === "PageDown"
    ) {
      e.preventDefault();
      goToPage(currentIndex + 1);
    } else if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowUp" ||
      e.key === "PageUp"
    ) {
      e.preventDefault();
      goToPage(currentIndex - 1);
    } else if (e.key === " " && tag !== "A" && tag !== "BUTTON") {
      e.preventDefault();
      goToPage(currentIndex + (e.shiftKey ? -1 : 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      goToPage(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goToPage(total - 1);
    }
  });

  // Wheel/trackpad input only turns sheets. Even tiny inertia events are
  // cancelled so a gesture can never move the page vertically.
  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return; // Allow pinch-to-zoom
      e.preventDefault();
      const useX = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.25;
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.clientHeight : 1;
      const rawDelta = (useX ? e.deltaX : e.deltaY) * unit;
      const dir = rawDelta > 0 ? 1 : -1;

      // One turn per gesture, including the entire momentum tail.
      window.clearTimeout(gestureEndTimer);
      gestureEndTimer = window.setTimeout(() => {
        wheelGestureLocked = false;
        accumulatedDelta = 0;
      }, 180);
      if (isFlipping || wheelGestureLocked || !rawDelta) return;
      if (dir !== lastDir) accumulatedDelta = 0;
      lastDir = dir;
      accumulatedDelta += rawDelta;

      if (Math.abs(accumulatedDelta) >= 34) {
        const flipDir = accumulatedDelta > 0 ? 1 : -1;
        accumulatedDelta = 0;
        wheelGestureLocked = true;
        goToPage(currentIndex + flipDir);
      }
    },
    { passive: false },
  );

  // Touch swipe navigation
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let singleTouch = false;

  window.addEventListener(
    "touchstart",
    (e) => {
      singleTouch = e.touches.length === 1;
      if (!singleTouch) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length !== 1) {
        singleTouch = false; // Leave multi-touch browser zoom available.
        return;
      }
      if (singleTouch) e.preventDefault();
    },
    { passive: false },
  );

  window.addEventListener("touchcancel", () => {
    singleTouch = false;
  });

  window.addEventListener(
    "touchend",
    (e) => {
      const valid = singleTouch;
      singleTouch = false;
      if (!valid || e.changedTouches.length !== 1 || isFlipping) return;
      const dt = Date.now() - touchStartTime;
      if (dt > 700) return;

      const dx = touchStartX - e.changedTouches[0].clientX;
      const dy = touchStartY - e.changedTouches[0].clientY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > absY && absX > 50) {
        goToPage(currentIndex + (dx > 0 ? 1 : -1));
      } else if (absY > 56) {
        const dir = dy > 0 ? 1 : -1;
        goToPage(currentIndex + dir);
      }
    },
    { passive: true },
  );

  // Respect direct hash links on load or browser hashchange
  function syncFromHash(animate) {
    const id = window.location.hash.slice(1) || "top";
    let idx = pages.findIndex((p) => p.id === id);
    if (idx === -1) idx = pages.findIndex((p) => p.id === id.split("--")[0]);
    if (idx !== -1 && idx !== currentIndex) {
      if (animate) {
        goToPage(idx, { updateHash: false });
      } else {
        setRestingState(idx);
      }
    }
  }

  window.addEventListener("hashchange", () => syncFromHash(true));
  window.addEventListener("resize", scheduleLayout);
  window.visualViewport?.addEventListener("resize", scheduleLayout);
  new ResizeObserver(scheduleLayout).observe(stage);
  document.fonts.ready.then(scheduleLayout);
  document.fonts.addEventListener("loadingdone", scheduleLayout);

  rebuildPages(false);
  syncFromHash(false);
  notifyParentPage(currentIndex === 0);
})();
