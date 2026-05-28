import { getLayout } from './layout'

export function getPagePadding() {
  const layout = getLayout()
  return {
    statusBarHeight: layout.statusBarHeight,
    headerPaddingTop: layout.statusBarHeight + 12,
    navBarHeight: layout.navBarHeight,
  }
}
