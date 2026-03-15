#let template-table(content) = {
  show table: it => if target() == "html" {
    html.div(class: "table-scroll", {
      it
    })
  }

  content
}