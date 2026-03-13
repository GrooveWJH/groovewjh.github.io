#import "@preview/theorion:0.4.1": *

#let quote(body) = context {
  if target() == "html" {
    html.div(class: "quote-block", {
      body
    })
  } else {
    quote-box(body)
  }
}

#let block-title(title) = {
  if title != none {
    html.div(class: "block-title", title)
  }
}

#let note(title: none, body) = context {
  if target() == "html" {
    html.div(class: "note-block", {
      block-title(title)
      body
    })
  } else {
    if title == none {
      note-box(body)
    } else {
      note-box(title, body)
    }
  }
}

#let success(title: none, body) = context {
  if target() == "html" {
    html.div(class: "success-block", {
      block-title(title)
      body
    })
  } else {
    if title == none {
      tip-box(body)
    } else {
      tip-box(title, body)
    }
  }
}

#let warning(title: none, body) = context {
  if target() == "html" {
    html.div(class: "warning-block", {
      block-title(title)
      body
    })
  } else {
    if title == none {
      warning-box(body)
    } else {
      warning-box(title, body)
    }
  }
}


#let error(title: none, body) = context {
  if target() == "html" {
    html.div(class: "error-block", {
      block-title(title)
      body
    })
  } else {
    if title == none {
      caution-box(body)
    } else {
      caution-box(title, body)
    }
  }
}
