#let template-notes(content) = {
  show footnote: it => {
    if target() == "html" {
      let number = counter(footnote).display(it.numbering)
      let fn-id = "fn-" + number
      let ref-id = "fnref-" + number

      html.sup(class: "footnote-ref", html.a(
        class: "footnote-ref-link",
        href: "#" + fn-id,
        id: ref-id,
        number,
      ))
    }
  }
  content
}