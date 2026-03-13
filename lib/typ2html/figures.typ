#let template-figures(content) = {
  show figure: it => if target() == "html" {
    html.figure({
      it.body
      it.caption
    })
  }

  content
}