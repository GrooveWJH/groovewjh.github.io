#import "../core/html-guard.typ": html-guard

#let make-theme-toggle-icon(preference) = {
  let svg-attrs = (
    viewBox: "0 0 32 32",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
    focusable: "false",
  )
  let icon-shell = (icon-preference, body) => html.elem(
    "span",
    attrs: (class: "nav-theme-toggle-icon", "aria-hidden": "true", "data-theme-icon": icon-preference),
    body,
  )
  if preference == "light" {
    icon-shell(preference, {
      html.elem("svg", attrs: svg-attrs, {
        html.elem("path", attrs: (d: "M16,12a4,4,0,1,1-4,4,4.0045,4.0045,0,0,1,4-4m0-2a6,6,0,1,0,6,6,6,6,0,0,0-6-6Z", transform: "translate(0 0.0049)"))
        html.elem("rect", attrs: (x: "6.8536", y: "5.3745", width: "1.9998", height: "4.958", transform: "translate(-3.253 7.8584) rotate(-45)"))
        html.elem("rect", attrs: (x: "2", y: "15.0049", width: "5", height: "2"))
        html.elem("rect", attrs: (x: "5.3745", y: "23.1466", width: "4.958", height: "1.9998", transform: "translate(-14.7739 12.6305) rotate(-45)"))
        html.elem("rect", attrs: (x: "15", y: "25.0049", width: "2", height: "5"))
        html.elem("rect", attrs: (x: "23.1466", y: "21.6675", width: "1.9998", height: "4.958", transform: "translate(-10.0018 24.1514) rotate(-45)"))
        html.elem("rect", attrs: (x: "25", y: "15.0049", width: "5", height: "2"))
        html.elem("rect", attrs: (x: "21.6675", y: "6.8536", width: "4.958", height: "1.9998", transform: "translate(1.5191 19.3793) rotate(-45)"))
        html.elem("rect", attrs: (x: "15", y: "2.0049", width: "2", height: "5"))
      })
    })
  } else if preference == "dark" {
    icon-shell(preference, {
      html.elem("svg", attrs: svg-attrs, {
        html.elem("path", attrs: (d: "M13.5025,5.4136A15.0755,15.0755,0,0,0,25.096,23.6082a11.1134,11.1134,0,0,1-7.9749,3.3893c-.1385,0-.2782.0051-.4178,0A11.0944,11.0944,0,0,1,13.5025,5.4136M14.98,3a1.0024,1.0024,0,0,0-.1746.0156A13.0959,13.0959,0,0,0,16.63,28.9973c.1641.006.3282,0,.4909,0a13.0724,13.0724,0,0,0,10.702-5.5556,1.0094,1.0094,0,0,0-.7833-1.5644A13.08,13.08,0,0,1,15.8892,4.38,1.0149,1.0149,0,0,0,14.98,3Z"))
      })
    })
  } else {
    icon-shell("auto", {
      html.elem("span", attrs: (
        class: "nav-theme-toggle-icon-glyph nav-theme-toggle-icon-glyph-auto",
      ))
    })
  }
}

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
), {
  make-theme-toggle-icon(preference)
})

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

#import "./description.typ": has-description-display-value
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
  let has-description = has-description-display-value(description)

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
