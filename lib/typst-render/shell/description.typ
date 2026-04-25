#let normalize-description-text-override(value) = {
  if value == none {
    none
  } else if type(value) == str {
    value
  } else {
    panic("description-text must be a plain string")
  }
}

#let collapse-description-meta-text(value) = {
  str(value).replace(regex("[\\s]+"), " ").trim()
}

#let extract-inline-description-node-text(node) = {
  let node-func = repr(node.func())

  if node-func == "text" {
    node.fields().at("text", default: "")
  } else if node-func == "space" {
    " "
  } else if node-func == "linebreak" {
    "\n"
  } else if node-func == "sequence" or node-func == "strong" or node-func == "emph" or node-func == "link" {
    let parts = ()
    for child in node.children {
      let child-text = extract-inline-description-node-text(child)
      if child-text == none {
        return none
      }
      parts.push(child-text)
    }
    parts.join("")
  } else {
    none
  }
}

#let resolve-description-plain-text(description, description-text: none) = {
  let explicit-text = normalize-description-text-override(description-text)

  if explicit-text != none {
    explicit-text
  } else if description == none {
    ""
  } else if type(description) == str {
    description
  } else if type(description) == content {
    let extracted = extract-inline-description-node-text(description)
    if extracted == none {
      panic("description must be inline-only, or provide description-text as a plain string override")
    }
    extracted
  } else {
    panic("description must be a string or inline content")
  }
}

#let has-description-display-value(description) = {
  if description == none {
    false
  } else if type(description) == str {
    description != ""
  } else if type(description) == content {
    repr(description.func()) == "linebreak" or description.children.len() != 0
  } else {
    false
  }
}
