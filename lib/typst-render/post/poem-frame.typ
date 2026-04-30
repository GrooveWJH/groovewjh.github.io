#import "../core/html-guard.typ": html-guard
#import "../fragments/math.typ": auto-frame

#let poem-latin-font = (
  "Noto Serif CJK SC",
  "Noto Serif CJK TC",
)

#let poem-cjk-font = (
  "KaiTi",
  "Kaiti SC",
  "STKaiti",
  "LXGW WenKai",
  "Noto Serif CJK SC",
)

#let poem-content-font = poem-cjk-font
#let poem-basic-cluster-pattern = regex("[\\u{0009}\\u{000A}\\u{000D}\\u{0020}-\\u{007E}]")
#let layout-align = align

#let resolve-poem-frame-align(value, label: "align", allow-auto: false) = {
  if allow-auto and value == auto {
    auto
  } else if value == "left" {
    left
  } else if value == "center" {
    center
  } else if value == "right" {
    right
  } else {
    panic(label + " must be one of: left, center, right" + if allow-auto { ", auto" } else { "" })
  }
}

#let resolve-poem-frame-inner-align(value) = {
  if value == auto {
    left
  } else {
    resolve-poem-frame-align(value, label: "inner-align")
  }
}

#let normalize-poem-frame-align-label(value, label: "align", allow-auto: false) = {
  if allow-auto and value == auto {
    "auto"
  } else if value == "left" or value == "center" or value == "right" {
    value
  } else {
    panic(label + " must be one of: left, center, right" + if allow-auto { ", auto" } else { "" })
  }
}

#let normalize-poem-frame-css-length(value) = {
  let value-repr = repr(value)
  if value-repr.ends-with(" + 0pt") {
    value-repr.replace(" + 0pt", "")
  } else {
    value-repr
  }
}

#let is-poem-nonbasic-cluster(cluster) = cluster.matches(poem-basic-cluster-pattern).len() == 0

#let split-poem-line-runs(line-text) = {
  let runs = ()
  let current-kind = none
  let current-text = ""

  for cluster in str(line-text).clusters() {
    let next-kind = if is-poem-nonbasic-cluster(cluster) { "cjk" } else { "latin" }
    if current-kind == none {
      current-kind = next-kind
      current-text = cluster
    } else if current-kind == next-kind {
      current-text += cluster
    } else {
      runs.push((kind: current-kind, text: current-text))
      current-kind = next-kind
      current-text = cluster
    }
  }

  if current-kind != none and current-text != "" {
    runs.push((kind: current-kind, text: current-text))
  }

  runs
}

#let parse-poem-frame-lines(body) = {
  let lines = ((),)

  for child in body.children {
    let child-func = repr(child.func())
    if child-func == "text" {
      lines.at(lines.len() - 1).push(child.fields().at("text", default: ""))
    } else if child-func == "space" {
      continue
    } else if child-func == "linebreak" {
      lines.push(())
    } else {
      return none
    }
  }

  lines.map(parts => if parts.len() == 0 { "" } else { parts.join("").trim() })
}

#let render-poem-line-typst(line-text) = [
  #for run in split-poem-line-runs(line-text) [
    #text(
      font: if run.at("kind") == "cjk" { poem-cjk-font } else { poem-latin-font },
      run.at("text"),
    )
  ]
]

#let render-poem-lines-typst(lines) = [
  #for (index, line-text) in lines.enumerate() [
    #render-poem-line-typst(line-text)
    #if index + 1 < lines.len() [
      #linebreak()
    ]
  ]
]

#let render-poem-frame-html(lines, align-label, inner-align-label, inset) = {
  let inset-css = normalize-poem-frame-css-length(inset)
  html.div(class: "poem-frame poem-frame-align-" + align-label, {
    html.div(
      class: "poem-frame-inner poem-frame-inner-align-" + inner-align-label,
      style: "padding: " + inset-css + ";",
      {
        for line-text in lines {
          html.div(class: "poem-frame-line", {
            if line-text == "" {
              html.elem("br", attrs: (aria-hidden: "true"))
            } else {
              for run in split-poem-line-runs(line-text) {
                html.span(
                  class: "poem-frame-run poem-frame-run-" + run.at("kind"),
                  run.at("text"),
                )
              }
            }
          })
        }
      },
    )
  })
}

#let poem-frame(
  align: "left",
  inner-align: auto,
  inset: 0em,
  width: auto,
  stroke: none,
  frame: true,
  body,
) = {
  let align-label = normalize-poem-frame-align-label(align)
  let inner-align-value = normalize-poem-frame-align-label(inner-align, label: "inner-align", allow-auto: true)
  let inner-align-label = if inner-align-value == "auto" { "left" } else { inner-align-value }
  let outer-align = resolve-poem-frame-align(align)
  let content-align = resolve-poem-frame-inner-align(inner-align)
  let plain-lines = parse-poem-frame-lines(body)
  let poem-body = if plain-lines == none { body } else { render-poem-lines-typst(plain-lines) }
  let poem-content = {
    layout-align(outer-align)[
      #block(width: width, inset: inset, stroke: stroke)[
        #layout-align(content-align)[
          #poem-body
        ]
      ]
    ]
  }

  if plain-lines != none and frame and width == auto and stroke == none {
    html-guard(
      () => render-poem-frame-html(plain-lines, align-label, inner-align-label, inset),
      fallback: () => auto-frame(poem-content),
    )
  } else if frame {
    auto-frame(poem-content)
  } else {
    poem-content
  }
}
