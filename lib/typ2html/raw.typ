#let template-raw(content) = {
  show raw.where(block: true): it => {
    if target() == "html" {
      let fields = it.fields()
      html.pre(
        html.code(
          class: {
            if fields.lang == none { "language-text" }
            else { "language-" + fields.lang }
          },
          fields.text
        )
      )
    } else {
      it
    }
  }

  show raw.where(block: false): it => {
    if target() == "html" {
      let fields = it.fields()
      html.code(
        class: {
          if fields.lang == none { "language-text" }
          else { "language-" + fields.lang }
        },
        fields.text
      )
    } else {
      it
    }
  }
  content
}