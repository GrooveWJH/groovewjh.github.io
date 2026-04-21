#import "html-guard.typ": html-guard

#let make-theme-toggle-button(preference, label, tooltip-label) = html.elem("button", attrs: (
  class: "nav-theme-toggle-button",
  type: "button",
  role: "radio",
  "aria-checked": if preference == "auto" { "true" } else { "false" },
  "aria-label": label,
  tabindex: if preference == "auto" { "0" } else { "-1" },
  "data-theme-toggle-button": "",
  "data-theme-preference": preference,
  "data-tooltip": tooltip-label,
))[]

#let make-theme-toggle(group-name, variant) = html.elem("div", attrs: (
  class: "nav-theme-toggle nav-theme-toggle-" + variant,
  role: "radiogroup",
  "aria-label": "主题模式",
  "data-theme-toggle-group": group-name,
), {
  make-theme-toggle-button("light", "切换到浅色主题", "浅色")
  make-theme-toggle-button("dark", "切换到深色主题", "深色")
  make-theme-toggle-button("auto", "跟随系统主题", "自动")
})

#let make-nav(site-title, links, post-title: none) = if links != none {
  let nav-lower-title = if post-title != none { post-title } else { site-title }

  html.div(class: "nav-shell", {
    html.nav({
      html.elem("button", attrs: (
        class: "nav-menu-switch",
        type: "button",
        "aria-label": "打开导航",
      ))[]

      html.div(class: "nav-title", {
        html.a(class: "nav-title-link", href: "/", site-title)
      })

      html.div(class: "nav-body has-post-title", {
        html.div(class: "nav-body-upper", {
          html.div(class: "nav-body-upper-title", site-title)
          html.div(class: "nav-body-upper-links", {
            for (href, name) in links {
              html.a(href: href, name)
            }
          })
        })

        html.div(class: "nav-body-lower", nav-lower-title)
      })

      html.div(class: "nav-actions", {
        make-theme-toggle("desktop", "desktop")
      })
    })

    html.div(class: "nav-sidebar-backdrop")
    html.aside(class: "nav-sidebar", {
      for (href, name) in links {
        html.a(class: "nav-sidebar-item", href: href, name)
      }
      make-theme-toggle("sidebar", "sidebar")
    })
  })
}

#let make-header(links, site-title) = context {
  html-guard(() => {
    html.header(
      html.div(class: "site-header", {
        make-nav(site-title, links)
      })
    )
  })
}

#let make-post-header(links, site-title, title, description: "", post-class: none) = context {
  let post-header-class = if post-class != none and post-class != "" {
    "post-header " + post-class
  } else {
    "post-header"
  }
  let has-description = description != none and str(description) != ""

  html-guard(() => {
    html.header({
      html.div(class: "site-header", {
        make-nav(site-title, links, post-title: title)
      })
    })

    html.div(class: post-header-class, {
      html.div(class: "post-header-inner", {
        html.h1(title)
        if has-description {
          html.p(class: "post-header-description", description)
        }
      })
    })
  })
}

#let make-post-footer(previous-post: none, next-post: none, footer-content: none) = context {
  html-guard(() => {
    if previous-post != none or next-post != none [
      #html.div(class: "post-neighbors", {
        html.div(class: "post-neighbors-inner", {
          if previous-post != none {
            html.a(class: "post-neighbor", href: previous-post.url, {
              html.div(class: "post-neighbor-top", "上一篇")
              html.p(class: "post-neighbor-title", str(previous-post.title))
            })
          }
          if next-post != none {
            html.a(class: "post-neighbor", href: next-post.url, {
              html.div(class: "post-neighbor-top", "下一篇")
              html.p(class: "post-neighbor-title", str(next-post.title))
            })
          }
        })
      })
    ]

    html.footer({
      html.div(class: "post-footer", {
        if footer-content != none {
          footer-content
        }
      })
    })
  })
}

#let make-page-footer(footer-content: none) = context {
  html-guard(() => {
    html.elem("footer", attrs: (class: "page-footer"))[
      #if footer-content != none [#footer-content]
    ]
  })
}
