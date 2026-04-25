#import "../core/html-guard.typ": html-guard

#let normalize-raw-block-text(text) = {
  let raw-text = str(text)
  let lines = raw-text.split("\n")
  let indent-widths = if lines.len() <= 1 {
    ()
  } else {
    lines
      .slice(1)
      .filter(line => str(line).trim() != "")
      .map(line => str(line).match(regex("^ *")).end)
  }
  let common-indent = if indent-widths.len() == 0 { 0 } else { indent-widths.sorted().at(0) }

  if lines.len() <= 1 or common-indent == 0 {
    raw-text
  } else {
    range(lines.len()).map(index => {
      let line = str(lines.at(index))
      if index == 0 or line.trim() == "" {
        line
      } else {
        line.slice(common-indent)
      }
    }).join("\n")
  }
}

#let template-raw(content) = {
  show raw.where(block: true): it => {
    html-guard(() => {
      let fields = it.fields()
      let normalized-text = normalize-raw-block-text(fields.text)
      html.pre(
        html.code(
          class: {
            if fields.lang == none { "language-text" }
            else { "language-" + fields.lang }
          },
          normalized-text
        )
      )
    }, fallback: () => it)
  }

  show raw.where(block: false): it => {
    html-guard(() => {
      let fields = it.fields()
      html.code(
        class: {
          if fields.lang == none { "language-text" }
          else { "language-" + fields.lang }
        },
        fields.text
      )
    }, fallback: () => it)
  }
  content
}
