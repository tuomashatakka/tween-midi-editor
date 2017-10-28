const fs = require('fs')

export function applyStyles () {
  let css = `:root {
    --color-background: #453844;
    --color-primary: #9d5f9a;
  }`
  let style = document.querySelector('style.theme') || document.createElement('style')
  style.setAttribute('class', 'theme')
  style.textContent = css
  document.body.appendChild(style)
  console.log(style)
  return style
}

export function write () {
  let css = `
    @color-dark: #453844;
    @color-primary: #9d5f9a;
    @color-primary-dark: #70426e;
  `
  let themeConfigFile = __dirname + '/styles/config.less'
  console.log(themeConfigFile)
  fs.writeFileSync(themeConfigFile, css)
}
