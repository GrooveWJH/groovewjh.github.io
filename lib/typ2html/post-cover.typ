#import "html-guard.typ": html-guard
#import "sys-input.typ": query-input

#let default-cover-width = 75%
#let default-cover-width-css = "75%"

#let has-text-value(value) = value != none and str(value) != ""

#let is-image-cover-value(cover) = cover != none and type(cover) == content and cover.func() == image

#let extract-cover-source(cover) = {
  if cover == none {
    none
  } else if is-image-cover-value(cover) {
    cover.fields().at("source", default: none)
  } else if type(cover) == str {
    cover
  } else {
    panic("cover must be a string path or an image(...) object")
  }
}

#let has-cover-value(cover) = {
  let source = extract-cover-source(cover)
  source != none and str(source) != ""
}

#let normalize-cover-width(cover) = {
  if not is-image-cover-value(cover) {
    (
      render-width: default-cover-width,
      render-width-percent: default-cover-width-css,
    )
  } else {
    let cover-width = cover.fields().at("width", default: none)

    if cover-width == none {
      (
        render-width: default-cover-width,
        render-width-percent: default-cover-width-css,
      )
    } else {
      let cover-width-repr = repr(cover-width)

      if cover-width-repr.ends-with(" + 0pt") {
        (
          render-width: cover-width,
          render-width-percent: cover-width-repr.replace(" + 0pt", ""),
        )
      } else {
        panic("cover width must be omitted or a percentage width")
      }
    }
  }
}

#let stringify-cover-alt(value) = {
  if value == none {
    ""
  } else if type(value) == str {
    value
  } else {
    ""
  }
}

#let resolve-cover-alt(cover, alt: none) = {
  let explicit-alt = stringify-cover-alt(alt)

  if has-text-value(explicit-alt) {
    explicit-alt
  } else if is-image-cover-value(cover) {
    let cover-alt = cover.fields().at("alt", default: none)
    let normalized-alt = stringify-cover-alt(cover-alt)
    if has-text-value(normalized-alt) {
      normalized-alt
    } else {
      ""
    }
  } else {
    ""
  }
}

#let normalize-project-path(path-text) = {
  let normalized-parts = ()
  for part in str(path-text).split("/") {
    if part == "" or part == "." {
      continue
    }

    if part == ".." {
      if normalized-parts.len() > 0 {
        normalized-parts.pop()
      }
      continue
    }

    normalized-parts.push(part)
  }

  "/" + normalized-parts.join("/")
}

#let resolve-cover-path(cover) = {
  let source = extract-cover-source(cover)
  let cover-text = if source == none { "" } else { str(source) }

  if not has-text-value(cover-text) {
    cover-text
  } else if cover-text.starts-with("/") {
    normalize-project-path(cover-text)
  } else {
    let page-path = str(query-input("page-path", default: "")).trim("/")
    if page-path == "" {
      cover-text
    } else {
      normalize-project-path(page-path + "/" + cover-text)
    }
  }
}

#let normalize-post-cover(cover, alt: none) = {
  let source = extract-cover-source(cover)

  if source == none or str(source) == "" {
    none
  } else {
    let width = normalize-cover-width(cover)
    (
      source-path: str(source),
      resolved-source-path: resolve-cover-path(source),
      render-width: width.at("render-width"),
      render-width-percent: width.at("render-width-percent"),
      alt: resolve-cover-alt(cover, alt: alt),
    )
  }
}

#let render-post-cover(cover, alt: none) = {
  let normalized-cover = normalize-post-cover(cover, alt: alt)

  if normalized-cover == none {
    none
  } else {
    html-guard(() => {
      html.div(class: "post-cover", {
        html.elem("img", attrs: (
          src: normalized-cover.at("resolved-source-path"),
          alt: normalized-cover.at("alt"),
          style: "width: " + normalized-cover.at("render-width-percent") + "; height: auto;",
        ))
      })
    }, fallback: () => {
      block(width: 100%, above: 1em, below: 1em)[
        #set align(center)
        #if is-image-cover-value(cover) [
          #set image(width: normalized-cover.at("render-width"))
          #cover
        ] else [
          #image(
            normalized-cover.at("resolved-source-path"),
            width: normalized-cover.at("render-width"),
            alt: normalized-cover.at("alt"),
          )
        ]
      ]
    })
  }
}
