#import "@preview/theorion:0.4.1": *
#import "../core/html-guard.typ": html-guard

#let quote(body) = context {
  html-guard(() => {
    html.div(class: "quote-block", {
      body
    })
  }, fallback: () => quote-box(body))
}

#let default-callout-title(kind) = {
  if kind == "note" {
    [提示]
  } else if kind == "success" {
    [完成]
  } else if kind == "warning" {
    [警告]
  } else if kind == "error" {
    [注意]
  } else {
    none
  }
}

#let resolved-callout-title(kind, title) = {
  if title == none {
    default-callout-title(kind)
  } else {
    title
  }
}

#let block-title(title) = {
  if title != none {
    html.div(class: "block-title", title)
  }
}

#let note(title: none, body) = context {
  let resolved-title = resolved-callout-title("note", title)
  html-guard(() => {
    html.div(class: "note-block", {
      block-title(resolved-title)
      body
    })
  }, fallback: () => {
    note-box(title: resolved-title, icon-name: "info", body)
  })
}

#let success(title: none, body) = context {
  let resolved-title = resolved-callout-title("success", title)
  html-guard(() => {
    html.div(class: "success-block", {
      block-title(resolved-title)
      body
    })
  }, fallback: () => {
    tip-box(title: resolved-title, icon-name: "check-circle-fill", body)
  })
}

#let warning(title: none, body) = context {
  let resolved-title = resolved-callout-title("warning", title)
  html-guard(() => {
    html.div(class: "warning-block", {
      block-title(resolved-title)
      body
    })
  }, fallback: () => {
    warning-box(title: resolved-title, icon-name: "alert-fill", body)
  })
}


#let error(title: none, body) = context {
  let resolved-title = resolved-callout-title("error", title)
  html-guard(() => {
    html.div(class: "error-block", {
      block-title(resolved-title)
      body
    })
  }, fallback: () => {
    caution-box(title: resolved-title, icon-name: "circle-slash", body)
  })
}
