(() => {
  const frame = document.getElementById("layout");
  const viewSwitch = document.querySelector(".view-switch");
  const buttons = document.querySelectorAll(".view-switch button");
  const storageKey = "docuinsight-view";
  const viewPaths = {
    book: "views/book.html",
    scrolling: "views/scrolling.html",
  };
  let layout = null;

  function isCoverHash(hash) {
    return !hash || hash === "#" || hash === "#top";
  }

  function setSwitchVisible(visible) {
    viewSwitch.hidden = !visible;
  }

  function savedView() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved === "old" || saved === "scrolling" ? "scrolling" : "book";
    } catch (_) {
      return "book";
    }
  }

  function saveView(view) {
    try {
      window.localStorage.setItem(storageKey, view);
    } catch (_) {
      // The switch still works when browser storage is unavailable.
    }
  }

  // The scrolling and book layouts share most section IDs. Map the
  // book-only pages to the corresponding section in the scrolling view.
  function anchorFor(hash, nextLayout) {
    if (nextLayout !== "scrolling" || !hash) return hash;
    const id = hash.slice(1).split("--")[0];
    const equivalents = {
      capabilities: "about",
      issues: "failure",
      colophon: "lessons",
    };
    return `#${equivalents[id] || id}`;
  }

  function currentAnchor() {
    try {
      const view = frame.contentWindow;
      if (
        view.document.readyState !== "complete" ||
        !view.location.pathname.endsWith(`/${viewPaths[layout]}`)
      ) {
        return view.location.hash || window.location.hash;
      }
      if (layout === "scrolling") {
        // The scrolling layout may have moved without changing its hash.
        let id = "top";
        const threshold = view.innerHeight * 0.3;
        view.document.querySelectorAll("section[id]").forEach((section) => {
          if (section.getBoundingClientRect().top <= threshold) id = section.id;
        });
        return `#${id}`;
      }
      return view.location.hash || "#top";
    } catch (_) {
      return window.location.hash;
    }
  }

  function switchLayout(next) {
    if (next === layout) return;

    const hash = anchorFor(
      layout ? currentAnchor() : window.location.hash,
      next,
    );
    const url = new URL(viewPaths[next], window.location.href);
    url.search = window.location.search;
    url.hash = hash;

    const previous = layout;
    layout = next;
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === next));
    });
    setSwitchVisible(next === "scrolling" || isCoverHash(hash));
    if (previous) {
      try {
        frame.contentWindow.location.replace(url.href);
      } catch (_) {
        frame.src = url.href;
      }
    } else {
      frame.src = url.href;
    }
  }

  // Keep shared links pointing at the index, including the current book
  // page. Both files are same-origin; the switch also works without it.
  frame.addEventListener("load", () => {
    if (layout === "scrolling") setSwitchVisible(true);
    try {
      const view = frame.contentWindow;
      const syncHash = () => {
        const hash = view.location.hash;
        if (window.location.hash !== hash) {
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search + hash,
          );
        }
      };
      view.addEventListener("hashchange", syncHash);
      const replaceState = view.history.replaceState.bind(view.history);
      view.history.replaceState = (...args) => {
        replaceState(...args);
        syncHash();
      };
      syncHash();
    } catch (_) {
      // A browser may isolate local files; the switch still works.
    }
  });

  window.addEventListener("hashchange", () => {
    try {
      frame.contentWindow.location.hash = anchorFor(
        window.location.hash,
        layout,
      );
    } catch (_) {}
  });

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.view;
      saveView(next);
      switchLayout(next);
    });
  });

  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow) return;
    if (
      window.location.origin !== "null" &&
      event.origin !== window.location.origin
    )
      return;
    const data = event.data || {};
    if (data.type === "docuinsight:page" && layout === "book") {
      setSwitchVisible(Boolean(data.isCover));
    }
  });

  switchLayout(savedView());
})();
